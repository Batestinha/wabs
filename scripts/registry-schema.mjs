import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schema = JSON.parse(readFileSync(new URL('../schemas/registry-entry.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

export function validateRegistryEntry(entry, label = 'Registry entry') {
  if (!validate(entry)) throw new Error(`${label}: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
}
