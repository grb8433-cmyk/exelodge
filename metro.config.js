const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve ESM-only packages (e.g. react-leaflet v5)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
