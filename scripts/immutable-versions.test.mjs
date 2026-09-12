import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPublishedVersionsUnchanged } from './immutable-versions.mjs';
const version = { version: '1.0.0', coreApiRange: '^0.3.0', checksumSha256: 'a'.repeat(64), source: { kind: 'signed_bundle', uri: 'https://example.test/v1.tgz' }, dependencies: [] };
const previous = { schemaVersion: 1, plugins: [{ pluginId: 'official.fixture', versions: [version] }] };
test('permits new versions and key ordering changes without changing published versions', () => {
  assert.doesNotThrow(() => assertPublishedVersionsUnchanged(previous, { plugins: [{ pluginId: 'official.fixture', versions: [{ ...version, version: '1.1.0' }, { source: version.source, dependencies: [], checksumSha256: version.checksumSha256, coreApiRange: '^0.3.0', version: '1.0.0' }] }] }));
});
test('rejects removed plugins, removed versions, moved URLs, digests and contracts', () => {
  for (const plugins of [[], [{ pluginId: 'official.fixture', versions: [] }], ...[
    { checksumSha256: 'b'.repeat(64) }, { coreApiRange: '^0.4.0' }, { source: { ...version.source, uri: 'https://example.test/other.tgz' } },
    { dependencies: [{ pluginId: 'official.other', versionRange: '^1.0.0' }] }
  ].map(change => [{ pluginId: 'official.fixture', versions: [{ ...version, ...change }] }])]) {
    assert.throws(() => assertPublishedVersionsUnchanged(previous, { plugins }), /removed or changed|was removed/);
  }
});
