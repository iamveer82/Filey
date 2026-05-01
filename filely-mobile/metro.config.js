const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Stop Metro from walking into web build output. Without this, Windows
// FallbackWatcher hits stray recursive entries inside `dist/` and crashes
// the whole dev server with `lstat 'dist/?/C:\...\dist'`.
//
// IMPORTANT: anchor each pattern to the project root, otherwise the regex
// matches `node_modules/memoize-one/dist/...` (and many other deps that
// ship a `dist/` folder) which then breaks resolution with
// "PackageResolutionError: main field cannot be resolved".
const ROOT = __dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  new RegExp(`^${ROOT}\\\\dist[\\\\/].*`),
  new RegExp(`^${ROOT}\\\\\\.next[\\\\/].*`),
];
config.watchFolders = [__dirname];

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
