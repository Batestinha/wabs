// Withdrawn versions. A published version stays immutable: it can only leave the index through an
// approved, recorded withdrawal of its exact bytes. Withdrawal records are append-only, and a
// withdrawn version number is burned: it can never be published again, with any content.

const pluginIdPattern = /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/;
const semverPattern = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const required = ['pluginId', 'version', 'checksumSha256', 'reason', 'withdrawnAt', 'approvedBy', 'approval'];
const allowed = new Set([...required, 'replacementVersion']);

export function withdrawalKey(pluginId, version) {
  return `${pluginId}@${version}`;
}

export function validateWithdrawals(document, file = 'withdrawals.json') {
  if (!document || document.schemaVersion !== 1 || !Array.isArray(document.withdrawals)) {
    throw new Error(`${file}: expected { "schemaVersion": 1, "withdrawals": [] }`);
  }
  const seen = new Set();
  for (const [index, record] of document.withdrawals.entries()) {
    const at = `${file}: withdrawals[${index}]`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`${at} must be an object`);
    for (const key of Object.keys(record)) if (!allowed.has(key)) throw new Error(`${at}: unknown field ${key}`);
    for (const key of required) {
      if (typeof record[key] !== 'string' || !record[key].trim()) throw new Error(`${at}: ${key} is required`);
    }
    if (!pluginIdPattern.test(record.pluginId)) throw new Error(`${at}: invalid pluginId`);
    if (!semverPattern.test(record.version)) throw new Error(`${at}: invalid version`);
    if (record.replacementVersion !== undefined && !semverPattern.test(record.replacementVersion)) {
      throw new Error(`${at}: invalid replacementVersion`);
    }
    if (!sha256Pattern.test(record.checksumSha256)) throw new Error(`${at}: checksumSha256 must be the withdrawn archive's lowercase SHA-256`);
    if (Number.isNaN(Date.parse(record.withdrawnAt)) || !/^\d{4}-\d{2}-\d{2}T/.test(record.withdrawnAt)) {
      throw new Error(`${at}: withdrawnAt must be an ISO 8601 timestamp`);
    }
    if (!/^https:\/\//.test(record.approval)) throw new Error(`${at}: approval must link to the approving pull request or issue`);
    if (record.reason.trim().length < 20) throw new Error(`${at}: reason must say why the version is withdrawn`);
    const key = withdrawalKey(record.pluginId, record.version);
    if (seen.has(key)) throw new Error(`${at}: ${key} is withdrawn twice`);
    seen.add(key);
  }
  return document;
}

/** Earlier withdrawal records stay exactly as they were; new records may only be appended. */
export function assertWithdrawalsAppendOnly(previous, next) {
  const before = previous?.withdrawals ?? [];
  const after = next.withdrawals;
  if (after.length < before.length) throw new Error('A withdrawal record was removed');
  before.forEach((record, index) => {
    if (JSON.stringify(record) !== JSON.stringify(after[index])) {
      throw new Error(`Withdrawal record ${withdrawalKey(record.pluginId, record.version)} was changed or reordered`);
    }
  });
}

/** Withdrawn version numbers are burned: no plugin file may list them again. */
export function assertNoWithdrawnVersionListed(withdrawals, plugins) {
  const burned = new Set(withdrawals.withdrawals.map((record) => withdrawalKey(record.pluginId, record.version)));
  for (const plugin of plugins) {
    for (const version of plugin.versions) {
      if (burned.has(withdrawalKey(plugin.pluginId, version.version))) {
        throw new Error(`${plugin.pluginId}@${version.version} was withdrawn and can never be published again`);
      }
    }
  }
}

/** The withdrawal that lets this exact published version leave the index, if any. */
export function withdrawalFor(withdrawals, pluginId, version) {
  return (withdrawals?.withdrawals ?? []).find((record) =>
    record.pluginId === pluginId && record.version === version.version && record.checksumSha256 === version.checksumSha256);
}
