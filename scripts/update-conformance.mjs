import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = path.join(root, 'fixtures', 'conformance')
const commit = '36725eee042da90c526f469f94246f96e16fdc35'
const localFlagIndex = process.argv.indexOf('--local')
const localDirectory = localFlagIndex >= 0 ? process.argv[localFlagIndex + 1] : undefined

const sources = [
  {
    upstream: 'core/data_model.yaml',
    output: 'data-model.json',
    sha256: '3b4c7c03fb8d6dfe0d8580246fa73c1eb3c1c7ebe6998c7aaff11e014c18b81a',
  },
  {
    upstream: 'core/expressions.yaml',
    output: 'expressions.json',
    sha256: 'd4735a902e2f3246debc4c9397733752062c74eedc3dc3331b9678dd58728b23',
    action: 'parse_expression_template',
  },
  {
    upstream: 'core/message_processor_v1_0.yaml',
    output: 'message-processor.json',
    sha256: '106dbefdbc0bd917f13dd5d93ea56242288ea8af2a30cbb33b74a5807038c154',
    select: [
      'test_v10_create_surface_inline_initialization',
      'test_v10_create_surface_optional_catalog_id',
      'test_v10_create_surface_with_metadata_extensions',
      'test_v10_update_data_model_deletion',
      'test_batch_multi_stage_lifecycle_pipeline',
      'test_delete_non_existent_surface_is_safe_noop',
      'test_v10_update_components_stores_component_metadata',
      'test_v10_update_components_replaces_component_metadata',
      'test_v10_update_components_omitted_metadata_clears_component_metadata',
    ],
  },
  {
    upstream: 'core/validator_v1_0.yaml',
    output: 'validator-schema.json',
    sha256: 'eb5ff8f9a7bf6444a31a9a4216e9b3202ded86197802a0c1a067e3a4b9cdc304',
    select: ['test_validator_1_0'],
  },
]

mkdirSync(outputDirectory, { recursive: true })

const manifestSourceFiles = {}

for (const source of sources) {
  let yaml
  if (localDirectory) {
    yaml = readFileSync(path.join(localDirectory, path.basename(source.upstream)), 'utf8')
  } else {
    const response = await fetch(
      `https://raw.githubusercontent.com/a2ui-project/a2ui/${commit}/conformance/${source.upstream}`,
    )
    if (!response.ok) throw new Error(`Could not download ${source.upstream}: ${response.status}`)
    yaml = await response.text()
  }

  const actualSha256 = createHash('sha256').update(yaml).digest('hex')
  if (actualSha256 !== source.sha256) {
    throw new Error(`${source.upstream} changed: expected ${source.sha256}, got ${actualSha256}`)
  }

  const rubyProgram = [
    'value = YAML.load(STDIN.read)',
    'upstream_count = value.length',
    'action = ENV["A2UI_CONFORMANCE_ACTION"]',
    'value = value.select { |item| item["action"] == action } if action && !action.empty?',
    'value = value.select { |item| ARGV.include?(item["name"]) } unless ARGV.empty?',
    'puts JSON.pretty_generate({ "upstreamCaseCount" => upstream_count, "cases" => value })',
  ].join('; ')

  const parsed = JSON.parse(
    execFileSync(
      'ruby',
      ['--disable-gems', '-rjson', '-ryaml', '-e', rubyProgram, ...(source.select ?? [])],
      {
        input: yaml,
        encoding: 'utf8',
        env: { ...process.env, A2UI_CONFORMANCE_ACTION: source.action ?? '' },
      },
    ),
  )

  const generated = `${JSON.stringify(parsed.cases, null, 2)}\n`
  writeFileSync(path.join(outputDirectory, source.output), generated)

  const entry = {
    sha256: actualSha256,
    generatedFile: source.output,
    generatedSha256: createHash('sha256').update(generated).digest('hex'),
    caseCount: parsed.cases.length,
  }
  if (source.action) entry.selectedAction = source.action
  if (source.select) entry.selectedCases = source.select
  if (parsed.cases.length !== parsed.upstreamCaseCount) {
    entry.upstreamCaseCount = parsed.upstreamCaseCount
  }
  manifestSourceFiles[`conformance/${source.upstream}`] = entry
}

const manifest = {
  repository: 'https://github.com/a2ui-project/a2ui',
  commit,
  sourceFiles: manifestSourceFiles,
  excluded: [
    {
      path: 'conformance/core/validator_v0_8.yaml',
      reason: 'The package targets A2UI v1.0 and does not claim v0.8 protocol support.',
    },
    {
      path: 'conformance/core/validator_v0_9.yaml',
      reason: 'The package targets A2UI v1.0 and does not claim v0.9 protocol support.',
    },
  ],
  knownFailures: [],
}

writeFileSync(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
