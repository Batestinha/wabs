# WABS Official Plugin Registry

This repository publishes the official plugin registry for the WhatsApp Bot Platform.

Registry URL:

```text
https://batestinha.github.io/wabs/index.json
```

The registry is static metadata. It cannot install, trust, enable, configure, or update a bot remotely. Bot owners select plugins in their own operator console. An owner-authorized update controller may advance installed versions only through validated signed releases. Registry metadata alone never grants installation, trust or deployment authority.

## Repository Layout

- `plugins/`: one plugin registry entry per file.
- `schemas/`: JSON Schema documents for plugin entries and the generated registry index.
- `scripts/build-index.mjs`: validates plugin entries and writes `index.json`.
- `index.json`: generated registry index served by GitHub Pages.
- `.github/workflows/validate.yml`: validates pull requests.
- `.github/workflows/pages.yml`: publishes `index.json` and supporting docs to GitHub Pages.

## Add A Plugin

1. Package your plugin with a valid `wa-plugin.json`.
2. Publish a release asset, usually a `.tgz` archive.
3. Add `plugins/<pluginId>.json` using the schema in `schemas/registry-entry.schema.json`.
4. Run:

```bash
npm ci --ignore-scripts
npm run build
npm run check
```

5. Open a pull request.

See [docs/submitting-plugins.md](docs/submitting-plugins.md) for review requirements.

## Local Commands

```bash
npm ci --ignore-scripts
npm run build
npm run check
```

`npm run build` regenerates `index.json`. `npm run check` validates entries and fails if `index.json` is stale.

The JSON schema includes repository links, scope clocks, console operations, configuration effects, service contracts, plugin databases and operator-owned migrations. Validation also checks ownership and authorization across declarations. It preserves published metadata without adding defaults or rewriting versions.

Published versions are immutable. Release validation compares the candidate index with the previous published index using `npm run check -- --previous <previous-index.json>`; corrections require a new version. The packaging migration will keep DOAS and NL Assistant inside WABP. Each optional plugin will publish source and self-contained release archives from its own repository, downloaded when selected for installation. Entries are added only after their release archives are validated and published.
