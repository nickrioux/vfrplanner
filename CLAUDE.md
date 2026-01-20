# VFR Planner Plugin - Project Notes

## Version Updates

When updating the plugin version, update **both** files:

1. `package.json` - npm package version
2. `src/pluginConfig.ts` - Windy plugin version (this is what `dist/plugin.json` uses)

The `dist/plugin.json` version comes from `pluginConfig.ts`, not `package.json`.
