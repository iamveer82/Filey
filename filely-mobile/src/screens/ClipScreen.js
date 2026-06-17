/**
 * ClipScreen — alias for the native ToolPickerScreen.
 *
 * The Clip tab is wired to ToolPickerScreen in App.js. This file used to host
 * a WebView pointing at filey.app/clip; it is now retained as a thin re-export
 * so any deep link / legacy navigator entry resolves to the native picker.
 */
export { default } from './ToolPickerScreen';
