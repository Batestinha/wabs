# Publisher verification keys

`wabs-official-2026-09.json` contains the public Ed25519 key used for official standalone plugin archives. Its SHA-256 fingerprint over DER SubjectPublicKeyInfo is:

`c7210bbd5344ce691ccdfb3124f6eb64d12f22f6330738439c584fcc8f431b41`

Signatures cover the archive's lowercase SHA-256 hexadecimal digest as UTF-8 bytes, matching WABP's signed-bundle verifier. The private key is not stored in the registry or plugin repositories, and build jobs do not receive it.

Listing a key here does not trust it automatically. Owners must verify and pin trusted keys through their platform configuration or a separately validated coordinated release. A dependency update cannot change its own trust configuration. Key rotation must preserve verification of retained historical releases.

Release signing runs on strongsidecar. The existing key is
`/etc/topomare/wabs-publisher/official-2026-09.pem` (root, mode 0600, parent 0700).
It is already covered by the encrypted `wabs-publisher` recovery snapshot; Desktop
does not hold the signing authority and is not needed for release signing.

After the standalone plugin CI has passed for the exact source commit, download
its archive on strongsidecar and verify that both Node matrix artifacts have the
same SHA-256. From a checkout of this registry, run:

```sh
sudo node scripts/sign-archive.mjs --archive /path/to/plugin.tgz --expected-sha256 REVIEWED_SHA256
```

The same reviewed script is installed on strongsidecar as the root-owned
`/usr/local/libexec/wabs-sign-archive.mjs`, so signing does not require a local
registry checkout:

```sh
sudo node /usr/local/libexec/wabs-sign-archive.mjs --archive /path/to/plugin.tgz --expected-sha256 REVIEWED_SHA256
```

The checked-in signer verifies the archive bytes, key ownership, permissions and
pinned public identity before signing. Its output contains only public signature
evidence. Publish the immutable archive, checksum and signature as release assets,
append the version to the registry, then run `npm test` and `npm run build`.
Builds and publishing may use GitHub CI or another authorized administration host;
no Desktop path, SSH connection or private-key transfer is part of this workflow.
