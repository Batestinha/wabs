# Publisher verification keys

`wabs-official-2026-09.json` contains the public Ed25519 key used for official standalone plugin archives. Its SHA-256 fingerprint over DER SubjectPublicKeyInfo is:

`c7210bbd5344ce691ccdfb3124f6eb64d12f22f6330738439c584fcc8f431b41`

Signatures cover the archive's lowercase SHA-256 hexadecimal digest as UTF-8 bytes, matching WABP's signed-bundle verifier. The private key is not stored in the registry or plugin repositories, and build jobs do not receive it.

Listing a key here does not trust it automatically. Owners must verify and pin trusted keys through their platform configuration or a separately validated coordinated release. A dependency update cannot change its own trust configuration. Key rotation must preserve verification of retained historical releases.
