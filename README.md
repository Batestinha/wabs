# WABS Official Plugin Registry

This repository publishes the official plugin registry for the WhatsApp Bot Platform.

Registry URL:

```text
https://batestinha.github.io/wabs/index.json
```

The registry is static metadata. It cannot install, trust, enable, configure, or update a bot remotely. Bot owners select plugins in their own operator console. An owner-authorized update controller may advance installed versions only through validated immutable releases. Registry metadata alone never grants installation, trust or deployment authority.

## Repository Layout

- `plugins/`: one plugin registry entry per file.
- `schemas/`: JSON Schema documents for plugin entries and the generated registry index.
- `scripts/build-index.mjs`: validates plugin entries and writes `index.json`.
- `index.json`: generated registry index served by GitHub Pages.
- `withdrawals.json`: approved withdrawals of published versions (append-only; see below).
- `.github/workflows/validate.yml`: validates pull requests.
- `.github/workflows/pages.yml`: publishes `index.json` and supporting docs to GitHub Pages.

## Add A Plugin

1. Package your plugin with a valid `wa-plugin.json` (`"schemaVersion": 2`), which declares the plugin's title (`name`) and `author`. WABP refuses packages that don't.
2. Publish a release asset, usually a `.tgz` archive.
3. Add `plugins/<pluginId>.json` using the schema in `schemas/registry-entry.schema.json`. Copy `name` and `author` exactly from the newest package's `wa-plugin.json`.
4. Run:

```bash
npm ci --ignore-scripts
npm run build
npm run check
```

5. Open a pull request.

See [docs/submitting-plugins.md](docs/submitting-plugins.md) for review requirements.

## Withdraw A Published Version

Published versions never change. Fix a mistake by publishing a new version. Withdraw a version only when it must not be offered at all: it can't be installed, it breaks the registry, or it's unsafe.

1. Publish the replacement version first, when there is one.
2. In one pull request:
   - remove the version from its `plugins/*.json` file (or the whole file, when every version is withdrawn);
   - append a record to `withdrawals.json`:

   ```json
   {
     "pluginId": "official.example",
     "version": "0.1.0",
     "checksumSha256": "<the withdrawn archive's SHA-256, as published>",
     "replacementVersion": "0.1.1",
     "reason": "Why it can't stay, in a sentence or two.",
     "withdrawnAt": "2026-11-22T02:30:00Z",
     "approvedBy": "<maintainer>",
     "approval": "https://github.com/Batestinha/wabs/pull/<this PR>"
   }
   ```

3. Explain the withdrawal in the pull request. A maintainer approves it by adding the `withdrawal-approved` label; CI refuses any change to `withdrawals.json` without it.

The rules CI enforces:

- **Exact bytes.** A version may leave the index only when a record names its exact checksum. Nothing else about a published version may change.
- **Append-only records.** Earlier records can't be edited, reordered or removed.
- **Burned version numbers.** A withdrawn number can never be published again, with any content.
- **Archives stay.** The release asset stays where it was published. Installations that already hold those bytes keep them; WABP only stops offering the version.

`withdrawals.json` is published next to `index.json`.

## Local Commands

```bash
npm ci --ignore-scripts
npm run build
npm run check
```

`npm run build` regenerates `index.json`. `npm run check` validates entries and fails if `index.json` is stale.

The JSON schema includes repository links, scope clocks, console operations, configuration effects, service contracts, plugin databases and operator-owned migrations. Validation also checks ownership and authorization across declarations. It preserves published metadata without adding defaults or rewriting versions.

Published versions are immutable. Release validation compares the candidate index with the previous published index using `npm run check -- --previous <previous-index.json>`; corrections require a new version. WABP bundles AI Assistant. Group Administration Assistant provides the former DoAs features. Each standalone plugin publishes its source and release archives in its own repository. WABS lists packages after validation and publication.

Packages are ordinary HTTPS archives with a required SHA-256 checksum. Publishing,
installation, and runtime loading do not use signing keys or signatures. Publish
the exact CI-built archive as an immutable release asset, include its SHA-256 in
the registry entry, and run `npm test`, `npm run build`, and the previous-index
immutability check. Existing archive URLs, checksums, and plugin contracts are
preserved when retiring the old signing metadata.
