import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, verify } from 'node:crypto';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { signArchive } from './sign-archive.mjs';

test('host signing binds the reviewed bytes to the pinned public identity', () => {
  const root = mkdtempSync(join(tmpdir(), 'wabs-signer-test-'));
  try {
    chmodSync(root, 0o700);
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const keyFile = join(root, 'key.pem');
    const archive = join(root, 'package.tgz');
    writeFileSync(keyFile, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    writeFileSync(archive, 'reviewed archive bytes');
    const expectedSha256 = createHash('sha256').update('reviewed archive bytes').digest('hex');
    const expectedPublicSha256 = createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');
    const input = { archive, expectedSha256, keyFile, expectedPublicSha256, ownerUid: process.getuid() };
    const result = signArchive(input);
    assert.ok(verify(null, Buffer.from(expectedSha256), publicKey, Buffer.from(result.signature, 'base64')));
    assert.deepEqual(signArchive(input), result);
    assert.throws(() => signArchive({ ...input, expectedSha256: '0'.repeat(64) }), /changed after validation/);
    assert.throws(() => signArchive({ ...input, expectedPublicSha256: '0'.repeat(64) }), /pinned trust identity/);
    chmodSync(keyFile, 0o644);
    assert.throws(() => signArchive(input), /permissions/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
