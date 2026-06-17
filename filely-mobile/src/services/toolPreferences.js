/**
 * User tool preferences — persist "My Tools" selection + order to AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@filey/my_tools_v1';

// Default tools shown in "My Tools" (popular + most-used subset)
const DEFAULT_MY_TOOLS = [
  'merge-pdf', 'split-pdf', 'compress-pdf', 'edit-pdf',
  'jpg-to-pdf', 'pdf-to-jpg', 'sign-pdf', 'encrypt-pdf',
  'add-watermark', 'rotate-pdf', 'extract-pages', 'pdf-to-docx',
  'word-to-pdf', 'excel-to-pdf', 'ocr-pdf', 'pdf-to-excel',
];

export async function getMyTools() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return DEFAULT_MY_TOOLS;
}

export async function setMyTools(ids) {
  await AsyncStorage.setItem(KEY, JSON.stringify(ids));
}

export async function addToMyTools(toolId) {
  const cur = await getMyTools();
  if (cur.includes(toolId)) return cur;
  const next = [...cur, toolId];
  await setMyTools(next);
  return next;
}

export async function removeFromMyTools(toolId) {
  const cur = await getMyTools();
  const next = cur.filter(id => id !== toolId);
  await setMyTools(next);
  return next;
}

export async function resetMyTools() {
  await AsyncStorage.removeItem(KEY);
  return DEFAULT_MY_TOOLS;
}
