# Submitting Plugins

The official registry accepts metadata by pull request. A registry entry is advisory metadata only; each bot owner still decides whether to install, trust, configure, and enable a plugin locally.

## Required Review Points

- The plugin ID is stable and namespaced.
- `versions[].coreApiRange` is compatible with the platform core API.
- `versions[].source.uri` uses HTTPS for remote packages.
- `checksumSha256` is provided for archive packages.
- Dangerous actions, required permissions, bot capabilities, jobs, events, and dependencies are declared.
- The package contains a safe `wa-plugin.json` manifest matching the registry metadata.
- The plugin declares its own title and author: its newest `wa-plugin.json` uses `"schemaVersion": 2` with `name` (a human-readable title of at most 80 characters, never the plugin ID) and `author` (`name`, optional `https://` `url`). The entry's `name` and `author` copy that declaration exactly. WABP shows only what the plugin declares and refuses packages without it; `npm run check` rejects entries without both.
- Copy `dependencies` and `integrations` from `wa-plugin.json` into each new registry version. Declare both as arrays and use `[]` for an empty list. A dependency declares `pluginId` and `versionRange` for a plugin the package needs. An integration also declares a short `description` of what the peer enables. WABP shows these under **Requires** and **Supports**, respectively.
- The plugin docs explain what data is stored and what network access is used.
- Console operations declare their access and authorization. Resource-token operations are read-only; configuration and scope-enablement effects name an owned, declared mutation.
- Scope-clock metadata declares derived timezone paths and any group timezone provider. Preserve database and operator-migration declarations in the registry entry.

## Entry Example

```json
{
  "pluginId": "community.example-tools",
  "name": "Example Tools",
  "description": "Example plugin metadata for registry submissions.",
  "author": {
    "name": "Example Maintainers",
    "url": "https://github.com/example"
  },
  "trust": "verified",
  "homepageUrl": "https://github.com/example/example-tools",
  "docsUrl": "https://github.com/example/example-tools#readme",
  "license": "MIT",
  "tags": ["example"],
  "versions": [
    {
      "version": "1.0.0",
      "coreApiRange": ">=0.2.0",
      "source": {
        "kind": "archive",
        "uri": "https://github.com/example/example-tools/releases/download/v1.0.0/plugin.tgz"
      },
      "checksumSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "commands": ["/example status"],
      "eventSubscriptions": [],
      "requiredPermissions": [],
      "requiredBotCapabilities": [],
      "dangerousActions": [],
      "backgroundJobs": [],
      "dependencies": [],
      "integrations": []
    }
  ]
}
```
