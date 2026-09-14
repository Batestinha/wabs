import assert from 'node:assert/strict';

const operationId = /^[a-z][a-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)+$/u;
const configPath = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/u;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Validate metadata which can cause host actions before publishing the catalog. */
export function validateVersionMetadata(pluginId, version) {
  const operations = version.consoleOperations ?? [];
  assert.ok(Array.isArray(operations), 'consoleOperations must be an array');
  const declared = new Map();
  for (const operation of operations) {
    assert.ok(object(operation), 'Console operation must be an object');
    assert.ok(operationId.test(operation.operationId) && operation.operationId.startsWith(`${pluginId}.`), 'Console operation must belong to its plugin');
    assert.ok(!declared.has(operation.operationId), 'Duplicate console operation');
    assert.ok(['read', 'mutation'].includes(operation.access), 'Invalid console access');
    assert.ok(['operator', 'resource-token'].includes(operation.authorization), 'Invalid console authorization');
    assert.ok(operation.authorization !== 'resource-token' || operation.access === 'read', 'Resource-token operations must be read-only');
    assert.ok(nonempty(operation.description), 'Console operation needs a description');
    assert.ok(Object.keys(operation).every(key => ['operationId', 'access', 'authorization', 'description'].includes(key)), 'Unknown console operation metadata');
    declared.set(operation.operationId, operation);
  }
  if (version.scopeClock !== undefined) {
    assert.ok(object(version.scopeClock), 'scopeClock must be an object');
    assert.ok(Object.keys(version.scopeClock).every(key => ['timezoneConfigPaths', 'providesGroupTimezones'].includes(key)), 'Unknown scope clock metadata');
    assert.ok(version.scopeClock.providesGroupTimezones === undefined || typeof version.scopeClock.providesGroupTimezones === 'boolean', 'Invalid group timezone provider declaration');
    assert.ok(Array.isArray(version.scopeClock.timezoneConfigPaths) && version.scopeClock.timezoneConfigPaths.length <= 32,
      'Invalid scope timezone configuration paths');
    assert.equal(new Set(version.scopeClock.timezoneConfigPaths).size, version.scopeClock.timezoneConfigPaths.length, 'Duplicate scope clock path');
    for (const path of version.scopeClock.timezoneConfigPaths) {
      assert.ok(typeof path === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*$/u.test(path), 'Invalid scope clock path');
      assert.ok(!path.split('.').some(part => ['__proto__', 'prototype', 'constructor'].includes(part)), 'Unsafe scope clock path');
    }
  }
  if (version.configuration !== undefined) {
    const config = version.configuration;
    assert.ok(object(config), 'configuration must be an object');
    assert.ok(Object.keys(config).every(key => ['changedActionId', 'scopeEnabledOperationId', 'permissionDeclarations'].includes(key)), 'Unknown configuration metadata');
    if (config.changedActionId !== undefined) {
      assert.ok(nonempty(config.changedActionId) && config.changedActionId.startsWith(`${pluginId}.`), 'Configuration action must belong to its plugin');
      const action = version.externalActions?.find(candidate => candidate.actionId === config.changedActionId);
      assert.ok(action?.access === 'mutation' && action.scope === 'account', 'Configuration action must declare an account mutation');
    }
    if (config.scopeEnabledOperationId !== undefined) {
      const operation = declared.get(config.scopeEnabledOperationId);
      assert.ok(operation?.access === 'mutation' && operation.authorization === 'operator', 'Scope enablement must declare an owned operator mutation');
    }
    const permissions = config.permissionDeclarations ?? [];
    assert.ok(Array.isArray(permissions), 'Permission declarations must be an array');
    for (const permission of permissions) {
      assert.ok(object(permission) && typeof permission.arrayPath === 'string' && configPath.test(permission.arrayPath), 'Invalid permission declaration path');
      assert.ok(typeof permission.prefix === 'string' && /^[a-z][a-z0-9.-]*\.$/u.test(permission.prefix), 'Invalid permission prefix');
      assert.ok(Array.isArray(permission.valuePaths) && permission.valuePaths.length >= 1 && permission.valuePaths.length <= 8, 'Invalid permission value paths');
      for (const path of permission.valuePaths) assert.ok(typeof path === 'string' && configPath.test(path), 'Invalid permission value path');
      assert.ok(Object.keys(permission).every(key => ['arrayPath', 'prefix', 'valuePaths'].includes(key)), 'Unknown permission declaration metadata');
    }
  }

}
