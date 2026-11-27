import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { validatePluginRelationships, validateVersionMetadata } from './plugin-metadata.mjs';
import { validateRegistryEntry } from './registry-schema.mjs';

function fixture() {
  return { consoleOperations: [{ operationId: 'fixture.garden.prepare', access: 'mutation', authorization: 'operator', description: 'Prepare garden' }],
    externalActions: [{ actionId: 'fixture.garden.refresh', access: 'mutation', scope: 'account' }],
    configuration: { scopeEnabledOperationId: 'fixture.garden.prepare', changedActionId: 'fixture.garden.refresh',
      permissionDeclarations: [{ arrayPath: 'beds', prefix: 'garden.plant.', valuePaths: ['id'] }] },
    scopeClock: { timezoneConfigPaths: ['timezone'] } };
}

test('accepts every published version without rewriting its metadata', async () => {
  for (const name of await readdir(new URL('../plugins/', import.meta.url))) {
    if (!name.endsWith('.json')) continue;
    const plugin = JSON.parse(await readFile(new URL(`../plugins/${name}`, import.meta.url), 'utf8'));
    validateRegistryEntry(plugin, name);
    for (const version of plugin.versions) {
      const before = JSON.stringify(version);
      validateVersionMetadata(plugin.pluginId, version);
      assert.equal(JSON.stringify(version), before);
    }
  }
});

test('requires both relationship arrays for new releases and preserves historical versions', () => {
  const plugin = 'fixture.garden';
  const missing = { version: '1.0.0' };
  const declared = { ...missing, dependencies: [], integrations: [
    { pluginId: 'fixture.weather', versionRange: '^1.0.0', description: 'Adds forecasts to watering reminders.' }
  ] };
  assert.doesNotThrow(() => validatePluginRelationships(plugin, missing));
  assert.throws(() => validatePluginRelationships(plugin, missing, { required: true }), /must declare/);
  assert.doesNotThrow(() => validatePluginRelationships(plugin, declared, { required: true }));
  assert.throws(() => validatePluginRelationships(plugin, { ...declared, dependencies: declared.integrations }), /duplicate/);
});

test('requires owned, declared operator mutations for configuration and scope enablement', () => {
  assert.doesNotThrow(() => validateVersionMetadata('fixture.garden', fixture()));
  for (const change of [
    value => { value.consoleOperations[0].operationId = 'other.plugin.prepare'; },
    value => { value.consoleOperations.push(value.consoleOperations[0]); },
    value => { value.configuration.scopeEnabledOperationId = 'fixture.garden.unknown'; },
    value => { value.consoleOperations[0].authorization = 'resource-token'; },
    value => { value.consoleOperations[0].access = 'read'; },
    value => { value.configuration.changedActionId = 'other.plugin.refresh'; },
    value => { value.externalActions[0].scope = 'scope'; },
    value => { value.externalActions[0].access = 'read'; }
  ]) {
    const value = fixture(); change(value);
    assert.throws(() => validateVersionMetadata('fixture.garden', value));
  }
});

test('rejects invalid derived defaults', () => {
  for (const path of ['../timezone', 'clock..timezone', '', 1]) {
    const value = fixture(); value.scopeClock.timezoneConfigPaths = [path];
    assert.throws(() => validateVersionMetadata('fixture.garden', value));
  }
});

test('accepts scoped roles and requires unique keys and declared, plugin-owned permissions', async () => {
  const entry = JSON.parse(await readFile(new URL('../plugins/official.weather.json', import.meta.url), 'utf8'));
  const role = { key: 'forecaster', labelKey: 'role.title', descriptionKey: 'role.description', permissions: ['plugin.weather.publish'] };
  const version = { ...entry.versions[0], requiredPermissions: [...role.permissions], roles: [role] };
  const validateShape = roles => validateRegistryEntry({ ...entry, versions: [{ ...version, roles }] });
  assert.doesNotThrow(() => validateShape([role]));
  assert.throws(() => validateShape([{ ...role, permissions: [...role.permissions, ...role.permissions] }]));
  assert.throws(() => validateShape([{ ...role, descriptionKey: ' ' }]));
  assert.doesNotThrow(() => validateVersionMetadata('official.weather', version));
  assert.throws(() => validateVersionMetadata('official.weather', { ...version, roles: [role, role] }), /Duplicate/u);
  assert.throws(() => validateVersionMetadata('official.weather', { ...version, requiredPermissions: [] }), /owned and declared/u);
  assert.throws(() => validateVersionMetadata('official.other', version), /owned and declared/u);
  assert.throws(() => validateVersionMetadata('plugin.weather', version), /owned and declared/u);
  const vendorPermission = 'vendor.weather.publish';
  assert.doesNotThrow(() => validateVersionMetadata('vendor.weather', {
    requiredPermissions: [vendorPermission], roles: [{ ...role, permissions: [vendorPermission] }]
  }));
});


test('requires reachable settings text and rejects duplicate placements', () => {
  const value = { operatorConsole: { settings: { sections: [{ id: 'main', title: 'Main', controlIds: ['example.profile'] }] },
    controls: [{ id: 'example.profile', ui: { builderTextSlots: ['questions'] } },
      { id: 'example.messages', ui: { textDefinitions: [{ key: 'example.prompt', placement: {
        sectionId: 'main', controlId: 'example.profile', slotId: 'questions', groupId: 'questions', groupLabel: 'Questions' } }] } }] } };
  assert.doesNotThrow(() => validateVersionMetadata('example', value));
  for (const mutate of [
    row => { row.controls[1].ui.textDefinitions[0].placement.slotId = 'unknown'; },
    row => { row.controls[1].ui.textDefinitions[0].placement.sectionId = 'unknown'; },
    row => { delete row.controls[1].ui.textDefinitions[0].placement; },
    row => { row.settings.sections[0].controlIds.push('example.profile'); }
  ]) {
    const copy = structuredClone(value); mutate(copy.operatorConsole);
    assert.throws(() => validateVersionMetadata('example', copy));
  }
});
