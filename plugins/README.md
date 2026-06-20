# Plugin Entries

Add one JSON file per plugin. File names should match the plugin ID where practical, for example:

```text
official.moderation-extra.json
community.example-tools.json
```

Each file must contain one registry plugin entry matching `../schemas/registry-entry.schema.json`.

Do not commit generated package archives here. Publish packages as release assets and reference their HTTPS URLs from the `versions[].source.uri` field.
