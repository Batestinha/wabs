import assert from 'node:assert/strict';
import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { constants, lstatSync, openSync, readFileSync, closeSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PUBLISHER_KEY_ID = 'wabs-official-2026-09';
export const PUBLISHER_KEY_PATH = '/etc/topomare/wabs-publisher/official-2026-09.pem';
export const PUBLISHER_PUBLIC_SHA256 = 'c7210bbd5344ce691ccdfb3124f6eb64d12f22f6330738439c584fcc8f431b41';
const sha256 = value => createHash('sha256').update(value).digest('hex');

/** Sign reviewed archive bytes on the publisher host; never export private material. */
export function signArchive({ archive, expectedSha256, keyFile = PUBLISHER_KEY_PATH,
  expectedPublicSha256 = PUBLISHER_PUBLIC_SHA256, ownerUid = 0 }) {
  assert.match(expectedSha256, /^[a-f0-9]{64}$/u, 'Expected archive SHA-256 must be explicit');
  const keyPath = resolve(keyFile);
  for (const [path, mode] of [[dirname(keyPath), 0o700], [keyPath, 0o600]]) {
    const info = lstatSync(path);
    assert.equal(realpathSync(path), path, 'Publisher key path must not follow symlinks');
    assert.equal(info.uid, ownerUid, 'Publisher key must belong to its signing account');
    assert.equal(info.mode & 0o777, mode, 'Publisher key permissions are too broad');
    if (path === keyPath) assert.ok(info.isFile() && info.nlink === 1, 'Publisher key must be a regular file');
    else assert.ok(info.isDirectory(), 'Publisher key parent must be a directory');
  }
  const archiveInfo = lstatSync(archive);
  assert.ok(archiveInfo.isFile() && !archiveInfo.isSymbolicLink(), 'Archive must be a regular file');
  assert.ok(archiveInfo.size > 0 && archiveInfo.size <= 50 * 1024 * 1024, 'Archive exceeds package size limit');
  const fd = openSync(archive, constants.O_RDONLY | constants.O_NOFOLLOW);
  let bytes;
  try { bytes = readFileSync(fd); } finally { closeSync(fd); }
  assert.equal(sha256(bytes), expectedSha256, 'Archive changed after validation');
  const key = createPrivateKey(readFileSync(keyPath));
  assert.equal(key.asymmetricKeyType, 'ed25519', 'Publisher key must be Ed25519');
  const publicKey = createPublicKey(key);
  const publicKeyDerSha256 = sha256(publicKey.export({ type: 'spki', format: 'der' }));
  assert.equal(publicKeyDerSha256, expectedPublicSha256, 'Publisher key does not match the pinned trust identity');
  const message = Buffer.from(expectedSha256, 'utf8');
  const signature = sign(null, message, key);
  assert.ok(verify(null, message, publicKey, signature), 'Generated signature did not verify');
  return { algorithm: 'ed25519', keyId: PUBLISHER_KEY_ID, archiveSha256: expectedSha256,
    bytes: bytes.length, publicKeyDerSha256, signature: signature.toString('base64') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    assert.ok(args.length === 4 && args[0] === '--archive' && args[2] === '--expected-sha256',
      'Usage: sudo node scripts/sign-archive.mjs --archive package.tgz --expected-sha256 SHA256');
    console.log(JSON.stringify(signArchive({ archive: args[1], expectedSha256: args[3] }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
