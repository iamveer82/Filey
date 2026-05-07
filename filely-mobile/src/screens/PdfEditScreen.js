/**
 * PdfEditScreen — PencilKit-backed PDF annotation editor.
 *
 * Receives { pdfUri, pdfName, mode } via route.params. Modes:
 *   'edit'   — full multi-page brush editor (default)
 *   'sign'   — single-page signature placement (passes page=1, exports composite PDF)
 *   'stamp'  — overlays an external image (route.params.stampUri) on chosen page
 *
 * Flow:
 *   1. Load PDF, get page count via PdfTools.getPageCount
 *   2. For current page, call renderPageToImage → set as BrushCanvas backdrop
 *   3. User draws with pen / marker / pencil / eraser (Apple Pencil supported)
 *   4. Switching page: exportPng current → store in inkByPage map → clear canvas → render next page
 *   5. Done: exportPng final page → call applyInkToPagesBatch → return result
 */
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import BrushCanvas from '../components/BrushCanvas';
import {
  getPageCount,
  renderPageToImage,
  applyInkToPagesBatch,
  signaturePngToPdf,
  embedSignature,
  addStamp,
} from '../services/pdfTools';
import { addFile } from '../services/recentFiles';

const ACCENT = '#2A63E2';
const { width: SW } = Dimensions.get('window');

const TOOLS = [
  { id: 'pen',     label: 'Pen',     icon: 'pencil' },
  { id: 'marker',  label: 'Marker',  icon: 'brush' },
  { id: 'pencil',  label: 'Pencil',  icon: 'create' },
  { id: 'eraser',  label: 'Eraser',  icon: 'backspace-outline' },
];

const COLORS = [
  '#0B1435', '#2A63E2', '#EF4444', '#F59E0B',
  '#10B981', '#8B5CF6', '#EC4899', '#FFFFFF',
];

const WIDTHS = [
  { id: 'fine',   value: 2,  label: 'Fine' },
  { id: 'medium', value: 4,  label: 'Med'  },
  { id: 'bold',   value: 8,  label: 'Bold' },
  { id: 'xbold',  value: 14, label: 'XL'   },
];

export default function PdfEditScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    pdfUri,
    pdfName = 'Document.pdf',
    mode = 'edit',
    stampUri = null,
    onComplete,
  } = route.params || {};

  const canvasRef = useRef(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImage, setPageImage] = useState(null);   // backdrop info
  const [loadingPage, setLoadingPage] = useState(true);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(mode === 'sign' ? '#0B1435' : '#2A63E2');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [inkByPage, setInkByPage] = useState({});      // { pageNum: pngUri }
  const [annotatedPages, setAnnotatedPages] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const [showToolPicker, setShowToolPicker] = useState(false);

  // ── Load page count ──────────────────────────────────────────────
  useEffect(() => {
    if (!pdfUri) {
      Alert.alert('No PDF', 'Pick a document first.');
      navigation.goBack();
      return;
    }
    getPageCount(pdfUri)
      .then((res) => {
        const count = typeof res === 'number' ? res : (res?.pageCount ?? 1);
        setPageCount(Math.max(1, count));
      })
      .catch((e) => {
        Alert.alert('Could not open PDF', e.message);
        navigation.goBack();
      });
  }, [pdfUri, navigation]);

  // ── Render current page backdrop ─────────────────────────────────
  const loadPage = useCallback(
    async (page) => {
      if (!pdfUri) return;
      setLoadingPage(true);
      try {
        const res = await renderPageToImage(pdfUri, page, 200);
        setPageImage(res);
      } catch (e) {
        Alert.alert('Render failed', e.message);
      } finally {
        setLoadingPage(false);
      }
    },
    [pdfUri],
  );

  useEffect(() => {
    if (pageCount > 0) loadPage(currentPage);
  }, [pageCount, currentPage, loadPage]);

  // ── Save current page's ink and switch ───────────────────────────
  const captureCurrentInk = useCallback(async () => {
    if (!canvasRef.current) return null;
    try {
      const exp = await canvasRef.current.exportPng({ scale: 2, composite: false });
      // Only store if there's actual ink — heuristic: small PNG (< 5kb) means empty
      if (exp.byteCount && exp.byteCount > 4096) {
        setInkByPage((prev) => ({ ...prev, [currentPage]: exp.uri }));
        setAnnotatedPages((prev) => new Set(prev).add(currentPage));
        return exp.uri;
      }
    } catch (e) {
      // ignore export errors on page switch
    }
    return null;
  }, [currentPage]);

  const goToPage = useCallback(
    async (page) => {
      if (page === currentPage) return;
      await captureCurrentInk();
      canvasRef.current?.clear();
      setCurrentPage(page);
      try { Haptics.selectionAsync(); } catch {}
    },
    [currentPage, captureCurrentInk],
  );

  // ── Tool / color / width ─────────────────────────────────────────
  const onToolPress = useCallback((id) => {
    setTool(id);
    try { Haptics.selectionAsync(); } catch {}
  }, []);

  const onColorPress = useCallback((c) => {
    setColor(c);
    if (tool === 'eraser') setTool('pen');
    try { Haptics.selectionAsync(); } catch {}
  }, [tool]);

  const onWidthPress = useCallback((w) => {
    setStrokeWidth(w);
    try { Haptics.selectionAsync(); } catch {}
  }, []);

  // ── Done — apply ink to PDF ──────────────────────────────────────
  const onDone = useCallback(async () => {
    if (!pdfUri) return;
    setExporting(true);
    try {
      const lastUri = await captureCurrentInk();
      const merged = { ...inkByPage };
      if (lastUri) merged[currentPage] = lastUri;

      const inkedEntries = Object.entries(merged).map(([page, pngUri]) => ({
        page: parseInt(page, 10),
        pngUri,
        opacity: 1.0,
      }));

      if (inkedEntries.length === 0) {
        Alert.alert('Nothing to save', 'Draw something first.');
        setExporting(false);
        return;
      }

      // Sign mode: convert single-page composite into signature PDF + embed
      if (mode === 'sign') {
        const exp = await canvasRef.current.exportPng({ scale: 3, composite: false });
        const sigPdf = await signaturePngToPdf(exp.uri);
        const result = await embedSignature(
          pdfUri, sigPdf.uri, currentPage, 80, 80, 200, 80,
        );
        await finishWith(result);
        return;
      }

      // Stamp mode: route directly to native addStamp
      if (mode === 'stamp' && stampUri) {
        const result = await addStamp(pdfUri, stampUri, currentPage, 80, 80, 160, 160, 0.9);
        await finishWith(result);
        return;
      }

      // Default: full multi-page ink overlay
      const result = await applyInkToPagesBatch(pdfUri, inkedEntries);
      await finishWith(result);
    } catch (e) {
      Alert.alert('Save failed', e.message);
      setExporting(false);
    }
  }, [pdfUri, mode, stampUri, currentPage, inkByPage, captureCurrentInk]);

  const finishWith = useCallback(
    async (result) => {
      try {
        if (result?.uri) {
          await addFile({
            name: `Edited-${pdfName.replace(/\.pdf$/i, '')}.pdf`,
            kind: 'pdf',
            uri: result.uri,
          });
        }
        setExporting(false);
        if (onComplete) {
          onComplete(result);
          navigation.goBack();
          return;
        }
        Alert.alert(
          'Saved',
          'Your edits were applied.',
          [
            {
              text: 'Share',
              onPress: async () => {
                try {
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(result.uri, {
                      mimeType: 'application/pdf',
                      dialogTitle: 'Save / Share',
                    });
                  }
                } catch {}
                navigation.goBack();
              },
            },
            { text: 'Done', onPress: () => navigation.goBack() },
          ],
        );
      } catch {
        setExporting(false);
        navigation.goBack();
      }
    },
    [navigation, onComplete, pdfName],
  );

  const onUndo = useCallback(() => { canvasRef.current?.undo(); }, []);
  const onRedo = useCallback(() => { canvasRef.current?.redo(); }, []);
  const onClearPage = useCallback(() => {
    Alert.alert('Clear page', 'Erase all ink on this page?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          canvasRef.current?.clear();
          setInkByPage((prev) => {
            const next = { ...prev };
            delete next[currentPage];
            return next;
          });
          setAnnotatedPages((prev) => {
            const next = new Set(prev);
            next.delete(currentPage);
            return next;
          });
        },
      },
    ]);
  }, [currentPage]);

  // ── Layout: maintain page aspect ratio ───────────────────────────
  const canvasSize = useMemo(() => {
    if (!pageImage) return { width: SW - 32, height: (SW - 32) * 1.414 };
    const maxW = SW - 32;
    const maxH = Dimensions.get('window').height * 0.55;
    const ratio = pageImage.pageWidthPt && pageImage.pageHeightPt
      ? pageImage.pageWidthPt / pageImage.pageHeightPt
      : pageImage.width / pageImage.height;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    return { width: w, height: h };
  }, [pageImage]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#0B1435" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Ionicons
            name={mode === 'sign' ? 'pencil-outline' : mode === 'stamp' ? 'pricetag-outline' : 'create-outline'}
            size={16}
            color={ACCENT}
          />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {mode === 'sign' ? 'Sign' : mode === 'stamp' ? 'Stamp' : 'Edit'} · {pdfName}
          </Text>
        </View>
        <Pressable
          onPress={onDone}
          disabled={exporting}
          style={[styles.doneBtn, exporting && { opacity: 0.6 }]}
        >
          {exporting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.doneText}>Done</Text>
          )}
        </Pressable>
      </View>

      {/* Page navigator */}
      {pageCount > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pageRow}
        >
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
            const isActive = p === currentPage;
            const isAnnotated = annotatedPages.has(p);
            return (
              <Pressable
                key={p}
                onPress={() => goToPage(p)}
                style={[
                  styles.pageChip,
                  isActive && styles.pageChipActive,
                  isAnnotated && !isActive && styles.pageChipAnnotated,
                ]}
              >
                <Text
                  style={[
                    styles.pageChipText,
                    isActive && styles.pageChipTextActive,
                  ]}
                >
                  {p}
                </Text>
                {isAnnotated && (
                  <View style={[styles.pageDot, isActive && { backgroundColor: '#FFFFFF' }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Canvas */}
      <View style={styles.canvasWrap}>
        <View style={[styles.canvasFrame, canvasSize]}>
          {loadingPage ? (
            <View style={styles.loading}>
              <ActivityIndicator color={ACCENT} />
              <Text style={styles.loadingText}>Loading page {currentPage}…</Text>
            </View>
          ) : (
            <BrushCanvas
              ref={canvasRef}
              style={StyleSheet.absoluteFill}
              tool={tool}
              strokeColor={color}
              strokeWidth={strokeWidth}
              backgroundUri={pageImage?.uri}
              showToolPicker={showToolPicker}
            />
          )}
        </View>
      </View>

      {/* Toolbar */}
      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Color row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorRow}
        >
          {COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => onColorPress(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c, borderWidth: c === '#FFFFFF' ? 1 : 0 },
                color === c && styles.colorDotActive,
              ]}
            />
          ))}
        </ScrollView>

        {/* Width row + tool chips */}
        <View style={styles.toolRow}>
          {TOOLS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => onToolPress(t.id)}
              style={[styles.toolChip, tool === t.id && styles.toolChipActive]}
            >
              <Ionicons
                name={t.icon}
                size={18}
                color={tool === t.id ? '#FFFFFF' : '#0B1435'}
              />
              <Text
                style={[styles.toolChipText, tool === t.id && styles.toolChipTextActive]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.widthRow}>
          {WIDTHS.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => onWidthPress(w.value)}
              style={[styles.widthChip, strokeWidth === w.value && styles.widthChipActive]}
            >
              <View
                style={[
                  styles.widthDot,
                  { width: w.value + 2, height: w.value + 2, backgroundColor: color === '#FFFFFF' ? '#0B1435' : color },
                  strokeWidth === w.value && color === '#FFFFFF' && { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0B1435' },
                ]}
              />
              <Text
                style={[
                  styles.widthChipText,
                  strokeWidth === w.value && styles.widthChipTextActive,
                ]}
              >
                {w.label}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={onUndo} style={styles.iconAction} hitSlop={8}>
            <Ionicons name="arrow-undo" size={18} color="#0B1435" />
          </Pressable>
          <Pressable onPress={onRedo} style={styles.iconAction} hitSlop={8}>
            <Ionicons name="arrow-redo" size={18} color="#0B1435" />
          </Pressable>
          <Pressable onPress={onClearPage} style={styles.iconAction} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6FC',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#0B1435' },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: ACCENT,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  // Page row
  pageRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  pageChip: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F3F6FC',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    marginRight: 6,
  },
  pageChipActive: { backgroundColor: ACCENT },
  pageChipAnnotated: { backgroundColor: '#E8EFFF' },
  pageChipText: { fontSize: 13, fontWeight: '700', color: '#0B1435' },
  pageChipTextActive: { color: '#FFFFFF' },
  pageDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },

  // Canvas
  canvasWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  canvasFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0B1435',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(11,20,53,0.08)',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  loadingText: { fontSize: 12, color: 'rgba(11,20,53,0.55)' },

  // Toolbar
  toolbar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
  },
  colorRow: { gap: 10, alignItems: 'center', paddingHorizontal: 4 },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderColor: 'rgba(11,20,53,0.18)',
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: ACCENT,
    transform: [{ scale: 1.1 }],
  },
  toolRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  toolChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F6FC',
    paddingVertical: 9,
    borderRadius: 12,
  },
  toolChipActive: { backgroundColor: ACCENT },
  toolChipText: { fontSize: 12, fontWeight: '700', color: '#0B1435' },
  toolChipTextActive: { color: '#FFFFFF' },
  widthRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  widthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F3F6FC',
    minWidth: 64,
    justifyContent: 'center',
  },
  widthChipActive: { backgroundColor: '#0B1435' },
  widthDot: { borderRadius: 999 },
  widthChipText: { fontSize: 11, fontWeight: '700', color: '#0B1435' },
  widthChipTextActive: { color: '#FFFFFF' },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F6FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
