const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable new architecture support
config.resolver.unstable_enablePackageExports = true;

module.exports = config; 