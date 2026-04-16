const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// On web there is no JSI worklets runtime, so redirect react-native-reanimated
// to a pure-JS no-op stub.  iOS and Android use the real native module — the
// stub must NOT be applied there or App Store builds will crash with
// "createAnimatedComponent is not a function".
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-reanimated' && platform === 'web') {
    return {
      filePath: path.resolve(__dirname, 'src/lib/reanimated-stub.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
