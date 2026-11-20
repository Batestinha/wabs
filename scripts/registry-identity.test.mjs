import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateRegistryEntry } from './registry-schema.mjs';

const entry = JSON.parse(readFileSync(new URL('../plugins/official.weather.json', import.meta.url), 'utf8'));

test('every entry republishes the title and author its plugin declares', () => {
  assert.doesNotThrow(() => validateRegistryEntry(entry));
  const { author: _author, ...withoutAuthor } = entry;
  assert.throws(() => validateRegistryEntry(withoutAuthor), /author/u);
  assert.throws(() => validateRegistryEntry({ ...entry, author: { url: 'https://github.com/Batestinha' } }), /name/u);
  assert.throws(() => validateRegistryEntry({ ...entry, author: { name: 'Batestinha', email: 'x@example.com' } }), /additional/u);
  assert.throws(() => validateRegistryEntry({ ...entry, author: { name: 'Batestinha', url: 'http://example.com' } }), /pattern/u);
  assert.throws(() => validateRegistryEntry({ ...entry, author: { name: ' Batestinha' } }), /pattern/u);
});

test('titles are human-readable, never plugin IDs', () => {
  for (const name of ['official.weather', 'vendor.other-plugin', '', ' Weather', 'x'.repeat(81)]) {
    assert.throws(() => validateRegistryEntry({ ...entry, name }), undefined, name);
  }
  assert.doesNotThrow(() => validateRegistryEntry({ ...entry, name: 'Weather & Tides' }));
});
