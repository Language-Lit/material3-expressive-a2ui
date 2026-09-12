import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = path.join(root, 'fixtures', 'conformance')
const commit = '1c45c809b655878d06e3afc6dda22100afecc0a4'
const sources = [
  {
    upstream: 'core/data_model.yaml',
    output: 'data-model.json',
    sha256: 'cc2d4146d2f6cbd47cd9ea5f07722a51a6dbc6ccd7cfa88a145e0e5e556be3fd',
  },
  {
    upstream: 'core/expressions.yaml',
    output: 'expressions.json',
    sha256: '27f447854f3431d534d143eb439a977b61fdf0d96d2581699852761f5c7d91d8',
  },
  {
    upstream: 'core/message_processor.yaml',
    output: 'message-processor.json',
    sha256: '52d3d728885b4ca4ae0faf024071cb98446dd99dfa146d2fd764165497b7c062',
  },
  {
    upstream: 'core/validator.yaml',
    output: 'validator-schema.json',
    sha256: '51755614569daed48ffe283be52a2c799576d479052939f433ee1066c272ed93',
    select: ['test_validator_0_9'],
  },
]

mkdirSync(outputDirectory, { recursive: true })

for (const source of sources) {
  const response = await fetch(
    `https://raw.githubusercontent.com/a2ui-project/a2ui/${commit}/conformance/${source.upstream}`,
  )
  if (!response.ok) throw new Error(`Could not download ${source.upstream}: ${response.status}`)
  const yaml = await response.text()
  const actualSha256 = createHash('sha256').update(yaml).digest('hex')
  if (actualSha256 !== source.sha256) {
    throw new Error(`${source.upstream} changed: expected ${source.sha256}, got ${actualSha256}`)
  }

  const generated = execFileSync(
    'ruby',
    [
      '--disable-gems',
      '-rjson',
      '-ryaml',
      '-e',
      'value = YAML.load(STDIN.read); value = value.select { |item| ARGV.include?(item["name"]) } unless ARGV.empty?; puts JSON.pretty_generate(value)',
      ...(source.select ?? []),
    ],
    { input: yaml, encoding: 'utf8' },
  )
  writeFileSync(path.join(outputDirectory, source.output), generated)
}
