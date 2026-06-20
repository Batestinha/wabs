# Submitting Plugins

The official registry accepts metadata by pull request. A registry entry is advisory metadata only; each bot owner still decides whether to install, trust, configure, and enable a plugin locally.

## Required Review Points

- The plugin ID is stable and namespaced.
- `versions[].coreApiRange` is compatible with the platform core API.
- `versions[].source.uri` uses HTTPS for remote packages.
- `checksumSha256` is provided for archive or signed-bundle packages.
- Dangerous actions, required permissions, bot capabilities, jobs, events, and dependencies are declared.
- The package contains a safe `wa-plugin.json` manifest matching the registry metadata.
- The plugin docs explain what data is stored and what network access is used.

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
      "dependencies": []
    }
  ]
}
```
