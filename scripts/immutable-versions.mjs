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
export function assertPublishedVersionsUnchanged(previous, next) {
  if (!previous || previous.schemaVersion !== 1 || !Array.isArray(previous.plugins)) throw new Error('Invalid previous registry index');
  const byId = new Map(next.plugins.map(plugin => [plugin.pluginId, plugin]));
  for (const plugin of previous.plugins) {
    const replacement = byId.get(plugin.pluginId);
    if (!replacement) throw new Error(`Published plugin was removed: ${plugin.pluginId}`);
    for (const version of plugin.versions) {
      const found = replacement.versions.find(item => item.version === version.version);
      if (!found || JSON.stringify(packageContract(found)) !== JSON.stringify(packageContract(version))) {
        throw new Error(`Published version was removed or changed: ${plugin.pluginId}@${version.version}`);
      }
    }
  }
}
