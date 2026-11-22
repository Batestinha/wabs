import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPublishedVersionsUnchanged } from './immutable-versions.mjs';
import { assertNoWithdrawnVersionListed, assertWithdrawalsAppendOnly, validateWithdrawals } from './withdrawals.mjs';

const v1 = { version: '0.1.0', coreApiRange: '^0.3.0', checksumSha256: 'a'.repeat(64), source: { kind: 'archive', uri: 'https://example.test/v010.tgz' } };
const v2 = { ...v1, version: '0.1.1', checksumSha256: 'b'.repeat(64), source: { kind: 'archive', uri: 'https://example.test/v011.tgz' } };
const previous = { schemaVersion: 1, plugins: [{ pluginId: 'official.fixture', versions: [v1] }] };
const record = {
  pluginId: 'official.fixture', version: '0.1.0', checksumSha256: 'a'.repeat(64), replacementVersion: '0.1.1',
  reason: 'Declares a console widget the host rejects, so it can never be installed.',
  withdrawnAt: '2026-11-22T02:30:00Z', approvedBy: 'Batestinha', approval: 'https://github.com/Batestinha/wabs/pull/1'
};
const withdrawals = { schemaVersion: 1, withdrawals: [record] };

test('a recorded withdrawal of the exact bytes lets that version leave; nothing else may', () => {
  assert.doesNotThrow(() => assertPublishedVersionsUnchanged(previous, { plugins: [{ pluginId: 'official.fixture', versions: [v2] }] }, withdrawals));
  assert.throws(() => assertPublishedVersionsUnchanged(previous, { plugins: [{ pluginId: 'official.fixture', versions: [v2] }] }), /removed or changed/);
  const otherBytes = { schemaVersion: 1, withdrawals: [{ ...record, checksumSha256: 'c'.repeat(64) }] };
  assert.throws(() => assertPublishedVersionsUnchanged(previous, { plugins: [{ pluginId: 'official.fixture', versions: [v2] }] }, otherBytes), /removed or changed/);
  // A withdrawal never allows changing a version in place.
  assert.throws(() => assertPublishedVersionsUnchanged(previous, { plugins: [{ pluginId: 'official.fixture', versions: [{ ...v1, coreApiRange: '^0.4.0' }] }] }, withdrawals), /removed or changed/);
});

test('a plugin may leave only when every published version is withdrawn', () => {
  assert.doesNotThrow(() => assertPublishedVersionsUnchanged(previous, { plugins: [] }, withdrawals));
  const two = { schemaVersion: 1, plugins: [{ pluginId: 'official.fixture', versions: [v1, v2] }] };
  assert.throws(() => assertPublishedVersionsUnchanged(two, { plugins: [] }, withdrawals), /Published plugin was removed/);
});

test('withdrawn version numbers are burned', () => {
  assert.throws(() => assertNoWithdrawnVersionListed(withdrawals, [{ pluginId: 'official.fixture', versions: [v1] }]), /can never be published again/);
  assert.throws(() => assertNoWithdrawnVersionListed(withdrawals, [{ pluginId: 'official.fixture', versions: [{ ...v1, checksumSha256: 'd'.repeat(64) }] }]), /can never be published again/);
  assert.doesNotThrow(() => assertNoWithdrawnVersionListed(withdrawals, [{ pluginId: 'official.fixture', versions: [v2] }]));
});

test('records are complete, approved by link, and append-only', () => {
  assert.equal(validateWithdrawals(withdrawals), withdrawals);
  for (const broken of [{ approval: '' }, { approval: 'see chat' }, { reason: 'bad' }, { checksumSha256: 'A'.repeat(64) }, { withdrawnAt: 'yesterday' }, { extra: 1 }]) {
    assert.throws(() => validateWithdrawals({ schemaVersion: 1, withdrawals: [{ ...record, ...broken }] }));
  }
  assert.throws(() => validateWithdrawals({ schemaVersion: 1, withdrawals: [record, record] }), /withdrawn twice/);
  const second = { ...record, pluginId: 'official.other' };
  assert.doesNotThrow(() => assertWithdrawalsAppendOnly(withdrawals, { schemaVersion: 1, withdrawals: [record, second] }));
  assert.doesNotThrow(() => assertWithdrawalsAppendOnly({ withdrawals: [] }, withdrawals));
  assert.throws(() => assertWithdrawalsAppendOnly(withdrawals, { schemaVersion: 1, withdrawals: [] }), /removed/);
  assert.throws(() => assertWithdrawalsAppendOnly(withdrawals, { schemaVersion: 1, withdrawals: [{ ...record, reason: record.reason + ' Edited.' }] }), /changed/);
});
