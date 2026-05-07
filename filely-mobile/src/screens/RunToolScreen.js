/**
 * RunToolScreen — native execution surface for any tool in clipTools registry.
 * No WebView. Receives { toolId, files, params? } and dispatches via pdfToolExec.
 *
 * Flow:
 *   1. Show file summary + tool-specific param sheet
 *   2. Tap Run → call executeTool(toolId, params)
 *   3. Show progress (PdfProgress event), then result + Share sheet
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { getToolById, getCategoryById } from '../services/clipTools';
import { executeTool, getToolSchema, isToolUnsupported, getUnsupportedReason } from '../services/pdfToolExec';

const POSITION_PRESETS = [
  { id: 'top-left',      label: 'TL', x: 50,  y: 700 },
  { id: 'top-center',    label: 'TC', x: 250, y: 700 },
  { id: 'top-right',     label: 'TR', x: 450, y: 700 },
  { id: 'center',        label: 'C',  x: 250, y: 400 },
  { id: 'bottom-left',   label: 'BL', x: 50,  y: 50  },
  { id: 'bottom-center', label: 'BC', x: 250, y: 50  },
  { id: 'bottom-right',  label: 'BR', x: 450, y: 50  },
];

const PERMISSION_KEYS = [
  { id: 'allowPrint',       label: 'Print' },
  { id: 'allowCopy',        label: 'Copy text' },
  { id: 'allowAnnotations', label: 'Annotate' },
  { id: 'allowFormFilling', label: 'Fill forms' },
  { id: 'allowAssembly',    label: 'Reassemble' },
  { id: 'allowModifications', label: 'Modify' },
];

const FIELD_TYPES = ['text', 'checkbox', 'radio', 'dropdown', 'signature'];

const OPACITY_PRESETS = [0.2, 0.4, 0.6, 0.8, 1.0];

const ACCENT = '#2A63E2';
const NativePdfTools = Platform.OS === 'ios' ? NativeModules.PdfTools : null;

// Tools that should redirect to PdfEditScreen even if reached directly.
const BRUSH_REDIRECT = {
  'edit-pdf':         'edit',
  'pdf-reader':       'edit',
  'sign-pdf':         'sign',
  'digital-sign-pdf': 'sign',
};

// ── Param sheet inputs by tool ─────────────────────────────────────

function ParamRow({ label, children }) {
  return (
    <View style={styles.paramRow}>
      <Text style={styles.paramLabel}>{label}</Text>
      {children}
    </View>
  );
}

async function pickImageUri(update, key) {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      update(key, res.assets[0].uri);
      update(`${key}_name`, res.assets[0].fileName || res.assets[0].uri.split('/').pop());
    }
  } catch (e) {
    Alert.alert('Pick failed', e.message);
  }
}

async function pickAnyFile(update, key) {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      update(key, res.assets[0].uri);
      update(`${key}_name`, res.assets[0].name || 'attachment');
    }
  } catch (e) {
    Alert.alert('Pick failed', e.message);
  }
}

function PickerButton({ value, label, onPick, valueLabel }) {
  return (
    <Pressable onPress={onPick} style={styles.pickerBtn}>
      <Ionicons
        name={value ? 'checkmark-circle' : 'add-circle-outline'}
        size={18}
        color={value ? '#10B981' : ACCENT}
      />
      <Text style={styles.pickerBtnText} numberOfLines={1}>
        {value ? (valueLabel || 'Selected') : label}
      </Text>
      {value && <Text style={styles.pickerBtnSub}>Tap to replace</Text>}
    </Pressable>
  );
}

function ParamSheet({ toolId, params, setParams }) {
  const schema = getToolSchema(toolId);
  if (!schema?.params?.length) return null;

  const update = (k, v) => setParams((prev) => ({ ...prev, [k]: v }));
  const togglePerm = (key) => setParams((prev) => ({
    ...prev,
    permissions: { ...(prev.permissions || {}), [key]: !prev.permissions?.[key] },
  }));

  return (
    <View style={styles.paramSheet}>
      <Text style={styles.paramTitle}>Options</Text>

      {schema.params.includes('password') && (
        <ParamRow label="Password">
          <TextInput
            style={styles.input}
            value={params.password || ''}
            onChangeText={(v) => update('password', v)}
            secureTextEntry
            placeholder="Required"
            placeholderTextColor="rgba(11,20,53,0.3)"
            autoCapitalize="none"
          />
        </ParamRow>
      )}

      {schema.params.includes('pages') && (
        <ParamRow label="Pages (e.g. 1,3,5-7)">
          <TextInput
            style={styles.input}
            value={params._pagesText || ''}
            onChangeText={(v) => {
              update('_pagesText', v);
              update('pages', parsePageList(v));
            }}
            placeholder="1,3,5-7"
            placeholderTextColor="rgba(11,20,53,0.3)"
          />
        </ParamRow>
      )}

      {schema.params.includes('ranges') && (
        <ParamRow label="Page ranges (start-end, comma)">
          <TextInput
            style={styles.input}
            value={params._rangesText || ''}
            onChangeText={(v) => {
              update('_rangesText', v);
              update('ranges', parseRanges(v));
            }}
            placeholder="1-3,4-6"
            placeholderTextColor="rgba(11,20,53,0.3)"
          />
        </ParamRow>
      )}

      {schema.params.includes('order') && (
        <ParamRow label="New page order (comma)">
          <TextInput
            style={styles.input}
            value={params._orderText || ''}
            onChangeText={(v) => {
              update('_orderText', v);
              update('order', parsePageList(v));
            }}
            placeholder="3,1,2,4"
            placeholderTextColor="rgba(11,20,53,0.3)"
          />
        </ParamRow>
      )}

      {schema.params.includes('degrees') && (
        <ParamRow label="Rotation degrees">
          <View style={styles.chipRow}>
            {[90, 180, 270].map((d) => (
              <Pressable
                key={d}
                onPress={() => update('degrees', d)}
                style={[styles.chip, params.degrees === d && styles.chipActive]}
              >
                <Text style={[styles.chipText, params.degrees === d && styles.chipTextActive]}>{d}°</Text>
              </Pressable>
            ))}
          </View>
        </ParamRow>
      )}

      {schema.params.includes('quality') && (
        <ParamRow label="Quality">
          <View style={styles.chipRow}>
            {['low', 'medium', 'high'].map((q) => (
              <Pressable
                key={q}
                onPress={() => update('quality', q)}
                style={[styles.chip, params.quality === q && styles.chipActive]}
              >
                <Text style={[styles.chipText, params.quality === q && styles.chipTextActive]}>{q}</Text>
              </Pressable>
            ))}
          </View>
        </ParamRow>
      )}

      {schema.params.includes('dpi') && (
        <ParamRow label="DPI (image quality)">
          <View style={styles.chipRow}>
            {[72, 150, 300].map((d) => (
              <Pressable
                key={d}
                onPress={() => update('dpi', d)}
                style={[styles.chip, params.dpi === d && styles.chipActive]}
              >
                <Text style={[styles.chipText, params.dpi === d && styles.chipTextActive]}>{d}</Text>
              </Pressable>
            ))}
          </View>
        </ParamRow>
      )}

      {(schema.params.includes('rows') || schema.params.includes('cols')) && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ParamRow label="Rows">
              <TextInput
                style={styles.input}
                value={String(params.rows ?? 2)}
                onChangeText={(v) => update('rows', parseInt(v) || 2)}
                keyboardType="number-pad"
              />
            </ParamRow>
          </View>
          <View style={{ flex: 1 }}>
            <ParamRow label="Cols">
              <TextInput
                style={styles.input}
                value={String(params.cols ?? 2)}
                onChangeText={(v) => update('cols', parseInt(v) || 2)}
                keyboardType="number-pad"
              />
            </ParamRow>
          </View>
        </View>
      )}

      {schema.params.includes('searchText') && (
        <ParamRow label="Text to redact">
          <TextInput
            style={styles.input}
            value={params.searchText || ''}
            onChangeText={(v) => update('searchText', v)}
            placeholder="Confidential"
            placeholderTextColor="rgba(11,20,53,0.3)"
          />
        </ParamRow>
      )}

      {schema.params.includes('text') && schema.input !== 'text' && (
        <ParamRow label="Watermark text">
          <TextInput
            style={styles.input}
            value={params.text || ''}
            onChangeText={(v) => update('text', v)}
            placeholder="CONFIDENTIAL"
            placeholderTextColor="rgba(11,20,53,0.3)"
          />
        </ParamRow>
      )}

      {schema.params.includes('header') && (
        <>
          <ParamRow label="Header text">
            <TextInput style={styles.input} value={params.header || ''}
              onChangeText={(v) => update('header', v)} />
          </ParamRow>
          <ParamRow label="Footer text">
            <TextInput style={styles.input} value={params.footer || ''}
              onChangeText={(v) => update('footer', v)} />
          </ParamRow>
        </>
      )}

      {schema.params.includes('colorHex') && (
        <ParamRow label="Color (hex)">
          <TextInput
            style={styles.input}
            value={params.colorHex || ''}
            onChangeText={(v) => update('colorHex', v)}
            placeholder="#2A63E2"
            placeholderTextColor="rgba(11,20,53,0.3)"
            autoCapitalize="characters"
          />
        </ParamRow>
      )}

      {schema.params.includes('fieldName') && (
        <>
          <ParamRow label="Field name">
            <TextInput style={styles.input} value={params.fieldName || ''}
              onChangeText={(v) => update('fieldName', v)} placeholder="firstName" />
          </ParamRow>
          {schema.params.includes('value') && (
            <ParamRow label="Value">
              <TextInput style={styles.input} value={params.value || ''}
                onChangeText={(v) => update('value', v)} />
            </ParamRow>
          )}
        </>
      )}

      {schema.params.includes('imageUri') && (
        <ParamRow label="Image">
          <PickerButton
            value={params.imageUri}
            label="Pick image (camera roll)"
            onPick={() => pickImageUri(update, 'imageUri')}
            valueLabel={params.imageUri_name}
          />
        </ParamRow>
      )}

      {schema.params.includes('signatureUri') && (
        <ParamRow label="Signature image">
          <PickerButton
            value={params.signatureUri}
            label="Pick signature image"
            onPick={() => pickImageUri(update, 'signatureUri')}
            valueLabel={params.signatureUri_name}
          />
        </ParamRow>
      )}

      {schema.params.includes('attachmentUri') && (
        <>
          <ParamRow label="Attachment file">
            <PickerButton
              value={params.attachmentUri}
              label="Pick a file"
              onPick={() => pickAnyFile(update, 'attachmentUri')}
              valueLabel={params.attachmentUri_name}
            />
          </ParamRow>
          {schema.params.includes('name') && (
            <ParamRow label="Attachment name">
              <TextInput
                style={styles.input}
                value={params.name || ''}
                onChangeText={(v) => update('name', v)}
                placeholder="invoice.docx"
                placeholderTextColor="rgba(11,20,53,0.3)"
              />
            </ParamRow>
          )}
        </>
      )}

      {schema.params.includes('opacity') && (
        <ParamRow label={`Opacity${params.opacity != null ? ` · ${Math.round((params.opacity ?? 1) * 100)}%` : ''}`}>
          <View style={styles.chipRow}>
            {OPACITY_PRESETS.map((o) => (
              <Pressable
                key={o}
                onPress={() => update('opacity', o)}
                style={[styles.chip, params.opacity === o && styles.chipActive]}
              >
                <Text style={[styles.chipText, params.opacity === o && styles.chipTextActive]}>
                  {Math.round(o * 100)}%
                </Text>
              </Pressable>
            ))}
          </View>
        </ParamRow>
      )}

      {schema.params.includes('position') && (
        <ParamRow label="Position">
          <View style={[styles.chipRow, { flexWrap: 'wrap', gap: 6 }]}>
            {POSITION_PRESETS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  update('position', p.id);
                  update('x', p.x);
                  update('y', p.y);
                }}
                style={[styles.chip, params.position === p.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, params.position === p.id && styles.chipTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ParamRow>
      )}

      {schema.params.includes('pageNumber') && (
        <ParamRow label="Page number">
          <TextInput
            style={styles.input}
            value={String(params.pageNumber ?? 1)}
            onChangeText={(v) => update('pageNumber', parseInt(v) || 1)}
            keyboardType="number-pad"
          />
        </ParamRow>
      )}

      {schema.params.includes('count') && (
        <ParamRow label="Count">
          <TextInput
            style={styles.input}
            value={String(params.count ?? 1)}
            onChangeText={(v) => update('count', Math.max(1, parseInt(v) || 1))}
            keyboardType="number-pad"
          />
        </ParamRow>
      )}

      {schema.params.includes('cropBox') && (
        <View>
          <Text style={styles.subLabel}>Crop box (PDF points)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['x', 'y', 'width', 'height'].map((k) => (
              <View key={k} style={{ flex: 1 }}>
                <ParamRow label={k.charAt(0).toUpperCase() + k.slice(1)}>
                  <TextInput
                    style={styles.input}
                    value={String(params.cropBox?.[k] ?? (k === 'width' ? 612 : k === 'height' ? 792 : 0))}
                    onChangeText={(v) => update('cropBox', {
                      ...(params.cropBox || { x: 0, y: 0, width: 612, height: 792 }),
                      [k]: parseFloat(v) || 0,
                    })}
                    keyboardType="numeric"
                  />
                </ParamRow>
              </View>
            ))}
          </View>
        </View>
      )}

      {schema.params.includes('width') && schema.params.includes('height')
        && !schema.params.includes('cropBox') && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ParamRow label="Width (pt)">
              <TextInput
                style={styles.input}
                value={String(params.width ?? 612)}
                onChangeText={(v) => update('width', parseFloat(v) || 612)}
                keyboardType="numeric"
              />
            </ParamRow>
          </View>
          <View style={{ flex: 1 }}>
            <ParamRow label="Height (pt)">
              <TextInput
                style={styles.input}
                value={String(params.height ?? 792)}
                onChangeText={(v) => update('height', parseFloat(v) || 792)}
                keyboardType="numeric"
              />
            </ParamRow>
          </View>
        </View>
      )}

      {schema.params.includes('fieldType') && (
        <ParamRow label="Field type">
          <View style={styles.chipRow}>
            {FIELD_TYPES.map((ft) => (
              <Pressable
                key={ft}
                onPress={() => update('fieldType', ft)}
                style={[styles.chip, params.fieldType === ft && styles.chipActive]}
              >
                <Text style={[styles.chipText, params.fieldType === ft && styles.chipTextActive]}>
                  {ft}
                </Text>
              </Pressable>
            ))}
          </View>
        </ParamRow>
      )}

      {schema.params.includes('metadata') && (
        <View>
          <Text style={styles.subLabel}>Metadata</Text>
          {['title', 'author', 'subject', 'keywords'].map((k) => (
            <ParamRow key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
              <TextInput
                style={styles.input}
                value={params.metadata?.[k] || ''}
                onChangeText={(v) => update('metadata', { ...(params.metadata || {}), [k]: v })}
                placeholder={k}
                placeholderTextColor="rgba(11,20,53,0.3)"
              />
            </ParamRow>
          ))}
        </View>
      )}

      {schema.params.includes('permissions') && (
        <View>
          <Text style={styles.subLabel}>Permissions</Text>
          <View style={styles.permGrid}>
            {PERMISSION_KEYS.map((p) => {
              const active = params.permissions?.[p.id] ?? true;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => togglePerm(p.id)}
                  style={[styles.permChip, active && styles.permChipActive]}
                >
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={active ? '#10B981' : 'rgba(11,20,53,0.4)'}
                  />
                  <Text style={[styles.permChipText, active && { color: '#0B1435' }]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {schema.params.includes('bookmarks') && (
        <ParamRow label="Bookmarks (one per line: title|page)">
          <TextInput
            style={[styles.input, { minHeight: 90 }]}
            value={params._bookmarksText || ''}
            multiline
            onChangeText={(v) => {
              update('_bookmarksText', v);
              const parsed = v.split('\n').map((line) => {
                const [title, pg] = line.split('|').map((s) => s?.trim());
                return title ? { title, page: parseInt(pg) || 1 } : null;
              }).filter(Boolean);
              update('bookmarks', parsed);
            }}
            placeholder={'Introduction|1\nChapter 1|3\nConclusion|12'}
            placeholderTextColor="rgba(11,20,53,0.3)"
          />
        </ParamRow>
      )}

      {schema.params.includes('fontSize') && (
        <ParamRow label="Font size">
          <View style={styles.chipRow}>
            {[10, 12, 14, 18, 24].map((s) => (
              <Pressable
                key={s}
                onPress={() => update('fontSize', s)}
                style={[styles.chip, params.fontSize === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, params.fontSize === s && styles.chipTextActive]}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        </ParamRow>
      )}

      {schema.input === 'text' && (
        <ParamRow label="Text content">
          <TextInput
            style={[styles.input, { minHeight: 100 }]}
            value={params.text || ''}
            onChangeText={(v) => update('text', v)}
            multiline
            placeholder="Type or paste text…"
            placeholderTextColor="rgba(11,20,53,0.3)"
          />
        </ParamRow>
      )}
    </View>
  );
}

function parsePageList(s) {
  if (!s) return [];
  const out = new Set();
  s.split(',').forEach((part) => {
    const seg = part.trim();
    if (!seg) return;
    if (seg.includes('-')) {
      const [a, b] = seg.split('-').map((x) => parseInt(x.trim()));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i);
      }
    } else {
      const n = parseInt(seg);
      if (Number.isFinite(n)) out.add(n);
    }
  });
  return Array.from(out).sort((a, b) => a - b);
}

function parseRanges(s) {
  if (!s) return [];
  return s.split(',').map((seg) => {
    const [a, b] = seg.trim().split('-').map((x) => parseInt(x.trim()));
    return { start: Number.isFinite(a) ? a : 1, end: Number.isFinite(b) ? b : a || 1 };
  });
}

// ── Result presenter ───────────────────────────────────────────────

function ResultView({ result, onShare, onShareAll }) {
  if (result.uri) {
    return (
      <View style={styles.resultBox}>
        <View style={styles.resultIconCircle}>
          <Ionicons name="document-text" size={42} color={ACCENT} />
        </View>
        <Text style={styles.resultTitle}>Done</Text>
        <Text style={styles.resultMeta}>
          {result.pageCount ? `${result.pageCount} pages · ` : ''}
          {result.compressionRatio ? `${result.compressionRatio} smaller` : ''}
        </Text>
        <Pressable onPress={() => onShare(result.uri)} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={18} color="#FFFFFF" />
          <Text style={styles.shareBtnText}>Save / Share</Text>
        </Pressable>
      </View>
    );
  }
  if (result.images || result.files) {
    const items = result.images || result.files;
    return (
      <View style={styles.resultBox}>
        <View style={styles.resultIconCircle}>
          <Ionicons name="albums" size={42} color={ACCENT} />
        </View>
        <Text style={styles.resultTitle}>{items.length} files generated</Text>
        <Pressable onPress={() => onShareAll(items)} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={18} color="#FFFFFF" />
          <Text style={styles.shareBtnText}>Share all</Text>
        </Pressable>
        <ScrollView style={{ maxHeight: 200, alignSelf: 'stretch', marginTop: 16 }}>
          {items.slice(0, 30).map((it, i) => (
            <Pressable key={i} onPress={() => onShare(it.uri)} style={styles.fileRow}>
              <Ionicons name="document" size={16} color={ACCENT} />
              <Text style={styles.fileRowText} numberOfLines={1}>
                {it.name || `Page ${it.page || i + 1}`}
              </Text>
              <Ionicons name="share-outline" size={16} color="rgba(11,20,53,0.4)" />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }
  if (result.metadata || result.layers || result.attachments || result.signatures || result.tables) {
    const data = result.metadata || result.layers || result.attachments || result.signatures || result.tables;
    return (
      <View style={styles.resultBox}>
        <View style={styles.resultIconCircle}>
          <Ionicons name="information-circle" size={42} color={ACCENT} />
        </View>
        <Text style={styles.resultTitle}>Result</Text>
        <ScrollView style={{ maxHeight: 320, alignSelf: 'stretch', marginTop: 12 }}>
          <Text style={styles.metaText}>{JSON.stringify(data, null, 2)}</Text>
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={styles.resultBox}>
      <Text style={styles.resultTitle}>Done</Text>
      <ScrollView style={{ maxHeight: 320, alignSelf: 'stretch', marginTop: 12 }}>
        <Text style={styles.metaText}>{JSON.stringify(result, null, 2)}</Text>
      </ScrollView>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────

export default function RunToolScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { toolId, files: initialFiles, title } = route.params || {};
  const tool = useMemo(() => getToolById(toolId), [toolId]);
  const schema = useMemo(() => getToolSchema(toolId), [toolId]);
  const cat = useMemo(() => tool ? getCategoryById(tool.category) : null, [tool]);

  const [files, setFiles] = useState(initialFiles || []);
  const [params, setParams] = useState(() => defaultParams(schema));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Native progress events
  useEffect(() => {
    if (!NativePdfTools) return;
    const emitter = new NativeEventEmitter(NativePdfTools);
    const sub = emitter.addListener('PdfProgress', (e) => {
      setProgress(e.progress || 0);
      if (e.message) setProgressMsg(e.message);
    });
    return () => sub.remove();
  }, []);

  // Redirect brush tools to PencilKit editor
  useEffect(() => {
    const brushMode = BRUSH_REDIRECT[toolId];
    if (brushMode && initialFiles?.[0]?.uri) {
      navigation.replace('PdfEdit', {
        pdfUri: initialFiles[0].uri,
        pdfName: initialFiles[0].name || 'Document.pdf',
        mode: brushMode,
      });
    }
  }, [toolId, initialFiles, navigation]);

  const pickMore = useCallback(async () => {
    try {
      const accept = schema?.accept;
      const res = await DocumentPicker.getDocumentAsync({
        type: accept || (schema?.input === 'pdf' || schema?.input === 'pdfs' ? 'application/pdf' : '*/*'),
        multiple: schema?.input === 'pdfs' || schema?.input === 'images',
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets?.length) {
        setFiles((f) => [...f, ...res.assets]);
      }
    } catch (e) {
      Alert.alert('Pick failed', e.message);
    }
  }, [schema]);

  const removeFile = useCallback((idx) => {
    setFiles((f) => f.filter((_, i) => i !== idx));
  }, []);

  const onRun = useCallback(async () => {
    if (!tool || !schema) return;
    setRunning(true); setError(null); setResult(null); setProgress(0);

    // Build params from files + UI params
    const dispatchParams = { ...params };
    if (schema.input === 'pdfs') {
      dispatchParams.pdfUris = files.map((f) => f.uri);
    } else if (schema.input === 'pdf') {
      dispatchParams.pdfUri = files[0]?.uri;
    } else if (schema.input === 'images') {
      dispatchParams.imageUris = files.map((f) => f.uri);
    } else if (schema.input === 'svg') {
      dispatchParams.svgUri = files[0]?.uri;
      dispatchParams.fileUri = files[0]?.uri;
    } else if (schema.input === 'office' || schema.input === 'html') {
      dispatchParams.docUri = files[0]?.uri;
      dispatchParams.fileUri = files[0]?.uri;
      if (schema.input === 'html') dispatchParams.html = params.html || '';
    }

    try {
      const res = await executeTool(toolId, dispatchParams);
      if (res?.success === false) {
        setError(res.error || 'Tool returned failure');
      } else {
        setResult(res);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  }, [tool, schema, params, files, toolId]);

  const shareUri = useCallback(async (uri) => {
    try {
      const localUri = await ensureLocalFile(uri);
      const can = await Sharing.isAvailableAsync();
      if (can) await Sharing.shareAsync(localUri, { dialogTitle: 'Save / Share' });
      else Alert.alert('Saved', `File saved at: ${localUri}`);
    } catch (e) {
      Alert.alert('Share failed', e.message);
    }
  }, []);

  const shareAll = useCallback(async (items) => {
    // Share first; users can re-share others tap-by-tap
    if (items?.[0]?.uri) await shareUri(items[0].uri);
  }, [shareUri]);

  if (!tool || !schema) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Unknown tool</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isToolUnsupported(toolId)) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#0B1435" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{tool.label}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="information-circle-outline" size={56} color="rgba(11,20,53,0.35)" />
          <Text style={styles.errorTitle}>Not supported on iOS</Text>
          <Text style={[styles.errorSub, { color: 'rgba(11,20,53,0.55)', marginTop: 12 }]}>
            {getUnsupportedReason(toolId)}
          </Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Pick another tool</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const enoughFiles =
    (schema.input === 'pdfs' || schema.input === 'images')
      ? files.length >= (schema.minFiles || 1)
      : (schema.input === 'text' || schema.input === 'none')
      ? true
      : files.length >= 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#0B1435" />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerDot, { backgroundColor: cat?.color || ACCENT }]}>
            <Ionicons name={tool.icon} size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>{title || tool.label}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* File summary */}
        {schema.input !== 'text' && schema.input !== 'none' && (
          <View style={styles.fileSection}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>
                {schema.input === 'pdfs' ? 'PDFs' :
                 schema.input === 'images' ? 'Images' :
                 schema.input === 'svg' ? 'SVG' :
                 schema.input === 'office' ? 'Document' :
                 schema.input === 'html' ? 'HTML' : 'PDF'}
              </Text>
              <Pressable onPress={pickMore} hitSlop={8} style={styles.addBtn}>
                <Ionicons name="add" size={16} color={ACCENT} />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>

            {files.length === 0 ? (
              <Pressable onPress={pickMore} style={styles.emptyDrop}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="cloud-upload-outline" size={28} color={ACCENT} />
                </View>
                <Text style={styles.emptyTitle}>Pick {schema.input === 'pdfs' ? 'PDFs' : 'a file'}</Text>
                <Text style={styles.emptySub}>Stays on device — no upload</Text>
              </Pressable>
            ) : (
              files.map((f, i) => (
                <View key={i} style={styles.fileChip}>
                  <Ionicons name="document-text" size={20} color={ACCENT} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileChipName} numberOfLines={1}>{f.name}</Text>
                    <Text style={styles.fileChipSize}>
                      {(f.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  </View>
                  <Pressable onPress={() => removeFile(i)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color="rgba(11,20,53,0.4)" />
                  </Pressable>
                </View>
              ))
            )}

            {schema.minFiles && files.length < schema.minFiles && (
              <Text style={styles.hint}>
                Need at least {schema.minFiles} {schema.input === 'pdfs' ? 'PDFs' : 'files'}
              </Text>
            )}
          </View>
        )}

        {/* Param sheet */}
        <ParamSheet toolId={toolId} params={params} setParams={setParams} />

        {/* Run / progress / result */}
        {running ? (
          <View style={styles.progressBox}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.progressText}>{progressMsg || 'Running on device…'}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
          </View>
        ) : result ? (
          <ResultView result={result} onShare={shareUri} onShareAll={shareAll} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={32} color="#EF4444" />
            <Text style={styles.errorTitle}>Failed</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <Pressable onPress={onRun} style={styles.retryBtn}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={onRun}
            disabled={!enoughFiles}
            style={[styles.runBtn, !enoughFiles && styles.runBtnDisabled]}
          >
            <Ionicons name="flash" size={18} color="#FFFFFF" />
            <Text style={styles.runBtnText}>Run {tool.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </Pressable>
        )}

        {/* Native badge */}
        <View style={styles.nativeBadge}>
          <Ionicons name="hardware-chip-outline" size={12} color="rgba(11,20,53,0.55)" />
          <Text style={styles.nativeBadgeText}>Runs on-device · zero upload</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function defaultParams(schema) {
  if (!schema?.params) return {};
  const p = {};
  if (schema.params.includes('degrees')) p.degrees = 90;
  if (schema.params.includes('quality')) p.quality = 'medium';
  if (schema.params.includes('dpi')) p.dpi = 150;
  if (schema.params.includes('rows')) p.rows = 2;
  if (schema.params.includes('cols')) p.cols = 2;
  return p;
}

async function ensureLocalFile(uri) {
  // file:// URIs are fine. tmpfile:// paths sometimes need normalization.
  if (uri.startsWith('file://') || uri.startsWith('content://')) return uri;
  if (uri.startsWith('/')) return 'file://' + uri;
  return uri;
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F6FC',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerDot: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0B1435', letterSpacing: -0.3 },
  scrollContent: { padding: 20, paddingBottom: 140 },

  // File section
  fileSection: { marginBottom: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0B1435' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: 'rgba(42,99,226,0.08)',
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: ACCENT },

  emptyDrop: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(42,99,226,0.3)',
    borderRadius: 20, backgroundColor: 'rgba(42,99,226,0.03)',
    padding: 28, alignItems: 'center', gap: 8,
  },
  emptyIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#E8EFFF', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0B1435' },
  emptySub: { fontSize: 12, color: 'rgba(11,20,53,0.5)', marginTop: -2 },

  fileChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.06)',
  },
  fileChipName: { fontSize: 13, fontWeight: '700', color: '#0B1435' },
  fileChipSize: { fontSize: 11, color: 'rgba(11,20,53,0.5)', marginTop: 2 },
  hint: { fontSize: 12, color: '#EF4444', fontWeight: '600', marginTop: 6, marginLeft: 4 },

  // Param sheet
  paramSheet: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.06)',
  },
  paramTitle: { fontSize: 14, fontWeight: '800', color: '#0B1435', marginBottom: 12 },
  paramRow: { marginBottom: 12 },
  paramLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(11,20,53,0.6)', marginBottom: 6 },
  subLabel: { fontSize: 12, fontWeight: '800', color: '#0B1435', marginBottom: 8, marginTop: 4 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F3F6FC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(42,99,226,0.18)',
  },
  pickerBtnText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0B1435' },
  pickerBtnSub: { fontSize: 10, fontWeight: '600', color: 'rgba(11,20,53,0.45)' },
  permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  permChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3F6FC', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12,
    minWidth: '47%',
  },
  permChipActive: { backgroundColor: 'rgba(16,185,129,0.10)' },
  permChipText: { fontSize: 12, fontWeight: '700', color: 'rgba(11,20,53,0.55)' },
  input: {
    backgroundColor: '#F3F6FC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0B1435',
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
    backgroundColor: '#F3F6FC',
  },
  chipActive: { backgroundColor: ACCENT },
  chipText: { fontSize: 12, fontWeight: '700', color: '#0B1435' },
  chipTextActive: { color: '#FFFFFF' },

  // Run / progress
  runBtn: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: ACCENT, borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 24,
    shadowColor: ACCENT, shadowOpacity: 0.3, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  runBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  runBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', flex: 1, textAlign: 'center' },
  progressBox: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, alignItems: 'center', gap: 10 },
  progressText: { fontSize: 13, color: 'rgba(11,20,53,0.6)', fontWeight: '600' },
  progressBar: {
    height: 6, alignSelf: 'stretch', backgroundColor: 'rgba(42,99,226,0.1)',
    borderRadius: 3, overflow: 'hidden', marginTop: 6,
  },
  progressFill: { height: 6, backgroundColor: ACCENT },
  progressPct: { fontSize: 12, fontWeight: '700', color: ACCENT },

  // Result
  resultBox: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.06)',
  },
  resultIconCircle: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#E8EFFF', alignItems: 'center', justifyContent: 'center',
  },
  resultTitle: { fontSize: 17, fontWeight: '800', color: '#0B1435', marginTop: 6 },
  resultMeta: { fontSize: 12, color: 'rgba(11,20,53,0.55)', fontWeight: '600' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: ACCENT, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 22,
  },
  shareBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 10, backgroundColor: '#F8FAFC', marginBottom: 6,
  },
  fileRowText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#0B1435' },
  metaText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#0B1435' },

  // Error
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 18, padding: 24, alignItems: 'center', gap: 8 },
  errorTitle: { fontSize: 16, fontWeight: '800', color: '#0B1435', marginTop: 4 },
  errorSub: { fontSize: 12, color: '#EF4444', textAlign: 'center', fontWeight: '600' },
  retryBtn: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ACCENT, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22,
  },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  nativeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 16,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    backgroundColor: 'rgba(11,20,53,0.04)',
  },
  nativeBadgeText: { fontSize: 11, fontWeight: '600', color: 'rgba(11,20,53,0.55)' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
