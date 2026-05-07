// Expo SDK 53+ entry point. The legacy `expo/AppEntry.js` shim was removed,
// so every Expo project now needs an explicit `index.js` at the project root
// that registers the app component. App.js holds all polyfill imports and
// the navigator tree, then registerRootComponent below tells the native
// runtime which React component to mount.
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
