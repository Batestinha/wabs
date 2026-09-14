import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { assertPublishedVersionsUnchanged } from './immutable-versions.mjs';
import { validateVersionMetadata } from './plugin-metadata.mjs';
import { validateRegistryEntry } from './registry-schema.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const pluginsDir = path.join(root, 'plugins');
const indexPath = path.join(root, 'index.json');
const checkOnly = process.argv.includes('--check');
const registryName = process.env.REGISTRY_NAME || 'WABS Official Plugin Registry';

const pluginIdPattern = /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/;
const semverPattern = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/;
const sha256Pattern = /^[a-f0-9]{64}$/i;
const trustValues = new Set(['official', 'verified', 'local-dev', 'unsafe']);
const sourceKinds = new Set(['directory', 'archive', 'npm', 'git']);

const existingIndex = await readExistingIndex();
const plugins = await loadPluginEntries();
const previousFlag = process.argv.indexOf('--previous');
if (previousFlag !== -1) {
  const previousPath = process.argv[previousFlag + 1];
  if (!previousPath || previousPath.startsWith('--')) throw new Error('--previous requires an index file');
  assertPublishedVersionsUnchanged(JSON.parse(await readFile(previousPath, 'utf8')), { plugins });
}
const generatedAt = process.env.REGISTRY_GENERATED_AT || existingIndex?.generatedAt || new Date().toISOString();
const index = {
  schemaVersion: 1,
  registryName,
  generatedAt,
  plugins
};
const output = `${JSON.stringify(index, null, 2)}\n`;

if (checkOnly) {
  const existing = existingIndex ? `${JSON.stringify(existingIndex, null, 2)}\n` : '';
  if (existing !== output) {
    throw new Error('index.json is stale. Run npm run build and commit the result.');
  }
  console.log(`Registry is valid: ${plugins.length} plugin(s).`);
} else {
  await writeFile(indexPath, output, 'utf8');
  console.log(`Wrote index.json with ${plugins.length} plugin(s).`);
}

async function readExistingIndex() {
  try {
    return JSON.parse(await readFile(indexPath, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function loadPluginEntries() {
  const files = (await readdir(pluginsDir))
    .filter((file) => file.endsWith('.json'))
    .sort();
  const entries = [];
  const ids = new Set();
  for (const file of files) {
    const entry = JSON.parse(await readFile(path.join(pluginsDir, file), 'utf8'));
    validatePluginEntry(entry, file);
    if (ids.has(entry.pluginId)) {
      throw new Error(`${file}: duplicate pluginId ${entry.pluginId}`);
    }
    ids.add(entry.pluginId);
    entries.push(normalizePluginEntry(entry));
  }
  return entries.sort((left, right) => left.pluginId.localeCompare(right.pluginId));
}

function validatePluginEntry(entry, file) {
  validateRegistryEntry(entry, file);
  const prefix = `${file}:`;
  requireString(entry.pluginId, `${prefix} pluginId`);
  if (!pluginIdPattern.test(entry.pluginId)) {
    throw new Error(`${prefix} invalid pluginId ${entry.pluginId}`);
  }
  requireString(entry.name, `${prefix} name`);
  requireString(entry.description, `${prefix} description`);
  if (!trustValues.has(entry.trust)) {
    throw new Error(`${prefix} trust must be one of ${[...trustValues].join(', ')}`);
  }
  if (!Array.isArray(entry.versions) || entry.versions.length === 0) {
    throw new Error(`${prefix} versions must contain at least one version`);
  }
  const versions = new Set();
  for (const version of entry.versions) {
    validateVersion(version, prefix, versions);
    validateVersionMetadata(entry.pluginId, version);
  }
}

function validateVersion(version, prefix, versions) {
  requireString(version.version, `${prefix} versions[].version`);
  if (!semverPattern.test(version.version)) {
    throw new Error(`${prefix} invalid version ${version.version}`);
  }
  if (versions.has(version.version)) {
    throw new Error(`${prefix} duplicate version ${version.version}`);
  }
  versions.add(version.version);
  requireString(version.coreApiRange, `${prefix} versions[].coreApiRange`);
  if (!version.source || typeof version.source !== 'object') {
    throw new Error(`${prefix} versions[].source is required`);
  }
  if (!sourceKinds.has(version.source.kind)) {
    throw new Error(`${prefix} source.kind must be one of ${[...sourceKinds].join(', ')}`);
  }
  requireString(version.source.uri, `${prefix} source.uri`);
  if (['archive', 'git'].includes(version.source.kind) && !version.source.uri.startsWith('https://')) {
    throw new Error(`${prefix} remote ${version.source.kind} sources must use HTTPS`);
  }
  if (['archive'].includes(version.source.kind) && !version.checksumSha256) {
    throw new Error(`${prefix} ${version.source.kind} sources require checksumSha256`);
  }
  if (version.checksumSha256 && !sha256Pattern.test(version.checksumSha256)) {
    throw new Error(`${prefix} checksumSha256 must be 64 hex characters`);
  }
}

function normalizePluginEntry(entry) {
  return {
    ...entry,
    versions: entry.versions
      .map((version) => ({
        commands: [],
        eventSubscriptions: [],
        requiredPermissions: [],
        requiredBotCapabilities: [],
        dangerousActions: [],
        backgroundJobs: [],
        dependencies: [],
        ...version
      }))
      .sort((left, right) => compareVersions(right.version, left.version))
  };
}

function compareVersions(left, right) {
  const leftParts = left.split(/[.+-]/).slice(0, 3).map(Number);
  const rightParts = right.split(/[.+-]/).slice(0, 3).map(Number);
  for (let index = 0; index < 3; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return left.localeCompare(right);
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
}
