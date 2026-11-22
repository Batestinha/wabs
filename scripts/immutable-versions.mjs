import { withdrawalFor } from './withdrawals.mjs';
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

// Retiring signing changes catalog metadata, never published package bytes or contracts.
// Normalize old entries only for comparison with their checksum-based archive form.
function packageContract(version) {
  const { signature: retiredSignature, ...contract } = version;
  if (contract.source?.kind === 'signed_bundle') contract.source = { ...contract.source, kind: 'archive' };
  return canonical(contract);
}

// Published bytes, permissions, compatibility, dependency and recovery declarations
// belong to that version permanently. Correct them by publishing a new version.
// The only way a published version may leave the index is an approved withdrawal of its exact
// bytes (withdrawals.json, see scripts/withdrawals.mjs); a plugin may leave only when every one of
// its published versions is withdrawn.
export function assertPublishedVersionsUnchanged(previous, next, withdrawals = { withdrawals: [] }) {
  if (!previous || previous.schemaVersion !== 1 || !Array.isArray(previous.plugins)) throw new Error('Invalid previous registry index');
  const byId = new Map(next.plugins.map(plugin => [plugin.pluginId, plugin]));
  for (const plugin of previous.plugins) {
    const replacement = byId.get(plugin.pluginId);
    if (!replacement) {
      if (plugin.versions.every(version => withdrawalFor(withdrawals, plugin.pluginId, version))) continue;
      throw new Error(`Published plugin was removed: ${plugin.pluginId}`);
    }
    for (const version of plugin.versions) {
      const found = replacement.versions.find(item => item.version === version.version);
      if (!found && withdrawalFor(withdrawals, plugin.pluginId, version)) continue;
      if (!found || JSON.stringify(packageContract(found)) !== JSON.stringify(packageContract(version))) {
        throw new Error(`Published version was removed or changed: ${plugin.pluginId}@${version.version}`);
      }
    }
  }
}
