import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn, SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { ALL_TOOLS, CATEGORIES, getToolById, getToolsByCategory } from '../services/clipTools';
import { getMyTools, setMyTools, addToMyTools, removeFromMyTools, resetMyTools } from '../services/toolPreferences';
import { getToolSchema, isToolUnsupported, getUnsupportedReason } from '../services/pdfToolExec';

// Tools that route to the PencilKit-backed PdfEditScreen instead of the
// generic ParamSheet runner.
const BRUSH_TOOLS = {
  'edit-pdf':         'edit',
  'pdf-reader':       'edit',
  'sign-pdf':         'sign',
  'digital-sign-pdf': 'sign',
};

const { width: SW } = Dimensions.get('window');

const TOOL_COLORS = [
  '#E8EFFF', '#F3E8FF', '#E6F9F0', '#FFF4E6', '#FEE2E2', '#DBEAFE',
  '#FEF3C7', '#DCFCE7', '#FCE7F3', '#E0F2FE', '#F5F3FF', '#ECFDF5',
];

function getToolColor(toolId) {
  let h = 0;
  for (let i = 0; i < toolId.length; i++) h = (h * 31 + toolId.charCodeAt(i)) | 0;
  return TOOL_COLORS[Math.abs(h) % TOOL_COLORS.length];
}

function getCatColor(catId) {
  const c = CATEGORIES.find(x => x.id === catId);
  return c?.color || '#2A63E2';
}

// ─── Tool Chip (horizontal scroll items) ──────────────────────

function ToolChip({ tool, isActive, onPress, onRemove, editMode }) {
  const bg = getToolColor(tool.id);
  const accent = getCatColor(tool.category);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        chipStyles.card,
        { backgroundColor: bg, borderColor: isActive ? accent : 'transparent', borderWidth: isActive ? 2.5 : 1, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[chipStyles.iconCircle, { backgroundColor: accent + '20' }]}>
        <Ionicons name={tool.icon} size={22} color={accent} />
      </View>
      <Text style={chipStyles.label} numberOfLines={1}>{tool.label}</Text>
      {editMode && (
        <Pressable
          onPress={(e) => { e.stopPropagation(); onRemove(tool.id); }}
          hitSlop={4}
          style={chipStyles.xBtn}
        >
          <Ionicons name="close-circle" size={18} color="rgba(11,20,53,0.35)" />
        </Pressable>
      )}
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  card: {
    width: 88,
    height: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    paddingHorizontal: 6,
    gap: 6,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B1435',
    textAlign: 'center',
  },
  xBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});

// ─── Category tool card (in "More Tools" section) ─────────────

function CatToolCard({ tool, isMine, onPress, onAdd }) {
  const bg = getToolColor(tool.id);
  const accent = getCatColor(tool.category);
  const unsupported = isToolUnsupported(tool.id);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        catToolStyles.card,
        { backgroundColor: bg, opacity: pressed ? 0.8 : (unsupported ? 0.55 : 1) }
      ]}
    >
      <View style={[catToolStyles.icon, { backgroundColor: accent + '20' }]}>
        <Ionicons name={tool.icon} size={16} color={accent} />
      </View>
      <Text style={catToolStyles.label} numberOfLines={2}>{tool.label}</Text>
      {unsupported && (
        <View style={catToolStyles.unsupBadge}>
          <Ionicons name="alert-circle" size={10} color="#FFFFFF" />
        </View>
      )}
      {!isMine && !unsupported && (
        <Pressable onPress={(e) => { e.stopPropagation(); onAdd(tool.id); }} hitSlop={4} style={catToolStyles.plus}>
          <Ionicons name="add-circle" size={18} color="#2A63E2" />
        </Pressable>
      )}
    </Pressable>
  );
}

const catToolStyles = StyleSheet.create({
  card: {
    width: '31%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 90,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0B1435',
    textAlign: 'center',
    lineHeight: 14,
  },
  plus: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  unsupBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Main Screen ──────────────────────────────────────────────

export default function ToolPickerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [myIds, setMyIds] = useState([]);
  const [activeTool, setActiveTool] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const [pickedFiles, setPickedFiles] = useState([]);

  useEffect(() => {
    getMyTools().then((ids) => {
      setMyIds(ids);
      if (ids.length) setActiveTool(ids[0]);
    });
  }, []);

  const myTools = useMemo(() => myIds.map(id => getToolById(id)).filter(Boolean), [myIds]);
  const activeToolObj = useMemo(() => activeTool ? getToolById(activeTool) : null, [activeTool]);

  const handleReorder = useCallback(async (ids) => {
    setMyIds(ids);
    await setMyTools(ids);
  }, []);

  const handleAdd = useCallback(async (toolId) => {
    const next = await addToMyTools(toolId);
    setMyIds(next);
    setActiveTool(toolId);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
  }, []);

  const handleRemove = useCallback(async (toolId) => {
    const next = await removeFromMyTools(toolId);
    setMyIds(next);
    if (activeTool === toolId) setActiveTool(next[0] || null);
    setPickedFiles([]);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
  }, [activeTool]);

  // Reset file picks when active tool changes (new tool may need different input type)
  useEffect(() => {
    setPickedFiles([]);
  }, [activeTool]);

  const handleReset = useCallback(async () => {
    Alert.alert('Reset Tools', 'Restore default tools?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        const defaults = await resetMyTools();
        setMyIds(defaults);
        setActiveTool(defaults[0]);
      }},
    ]);
  }, []);

  // Pick file(s) using the active tool's schema (single vs multi, accepted MIME types)
  const pickFile = useCallback(async () => {
    if (!activeTool) {
      Alert.alert('Pick a tool first', 'Tap a tool above before choosing files.');
      return;
    }
    const schema = getToolSchema(activeTool);
    if (!schema) return;
    if (schema.input === 'text' || schema.input === 'none') {
      // No file required — go straight to runner
      navigation.navigate('RunTool', { toolId: activeTool, files: [], title: activeToolObj?.label });
      return;
    }
    try {
      const accept = schema.accept || (
        schema.input === 'pdf' || schema.input === 'pdfs' ? 'application/pdf' :
        schema.input === 'images' ? 'image/*' :
        schema.input === 'svg' ? 'image/svg+xml' :
        schema.input === 'office' ? [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword', 'text/rtf', 'application/rtf',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/epub+zip', 'application/x-mobipocket-ebook'
        ] :
        schema.input === 'html' ? 'text/html' :
        '*/*'
      );
      const isMulti = schema.input === 'pdfs' || schema.input === 'images';
      const res = await DocumentPicker.getDocumentAsync({
        type: accept,
        multiple: isMulti,
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets?.length) {
        setPickedFiles(isMulti ? res.assets : [res.assets[0]]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not pick file.');
    }
  }, [activeTool, activeToolObj, navigation]);

  // Dispatch native runner with toolId + files; no WebView, no URL
  const runTool = useCallback(() => {
    if (!activeTool || !activeToolObj) return;
    if (isToolUnsupported(activeTool)) {
      Alert.alert(
        `${activeToolObj.label} not supported on iOS`,
        getUnsupportedReason(activeTool)
      );
      return;
    }
    const schema = getToolSchema(activeTool);
    if (!schema) {
      Alert.alert('Unknown tool', 'No native handler for this tool.');
      return;
    }
    const needsFile = schema.input !== 'text' && schema.input !== 'none';
    const minFiles = schema.minFiles || 1;
    if (needsFile && pickedFiles.length < minFiles) {
      Alert.alert(
        'Pick files first',
        `${activeToolObj.label} needs ${minFiles} ${schema.input === 'pdfs' ? 'PDFs' : 'file(s)'}.`
      );
      return;
    }
    // PencilKit brush flow — edit-pdf / sign-pdf / add-stamps / etc.
    const brushMode = BRUSH_TOOLS[activeTool];
    if (brushMode && pickedFiles[0]?.uri) {
      navigation.navigate('PdfEdit', {
        pdfUri: pickedFiles[0].uri,
        pdfName: pickedFiles[0].name || 'Document.pdf',
        mode: brushMode,
      });
      return;
    }
    navigation.navigate('RunTool', {
      toolId: activeTool,
      files: pickedFiles,
      title: activeToolObj.label,
    });
  }, [activeTool, activeToolObj, pickedFiles, navigation]);

  const toggleCat = useCallback((catId) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="attach" size={22} color="#2A63E2" style={{ transform: [{ scaleX: -1 }] }} />
          <Text style={styles.headerTitle}>Clip Tools</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setEditMode(e => !e)}
            hitSlop={8}
            style={[styles.headerBtn, editMode && styles.headerBtnActive]}
          >
            <Ionicons name={editMode ? 'checkmark' : 'options-outline'} size={18} color={editMode ? '#FFFFFF' : '#0B1435'} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* My Tools — horizontal scroll */}
        <Animated.View entering={FadeInUp.duration(400)}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>My Tools</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {editMode && (
                <Pressable onPress={handleReset} hitSlop={8}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Reset</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setEditMode(e => !e)} hitSlop={8}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#2A63E2' }}>{editMode ? 'Done' : 'Edit'}</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}
            style={{ marginHorizontal: -20, paddingLeft: 20 }}
          >
            {myTools.map((tool) => (
              <Animated.View key={tool.id} entering={SlideInRight.duration(300)}>
                <ToolChip
                  tool={tool}
                  isActive={activeTool === tool.id}
                  editMode={editMode}
                  onPress={() => {
                    if (!editMode) {
                      setActiveTool(tool.id);
                      try { Haptics.selectionAsync(); } catch {}
                    }
                  }}
                  onRemove={handleRemove}
                />
              </Animated.View>
            ))}
            {/* Add more button */}
            <Pressable style={chipAddStyles.card}>
              <Ionicons name="add" size={24} color="#2A63E2" />
              <Text style={chipAddStyles.text}>Add</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>

        {/* Active tool name */}
        {activeToolObj && !editMode && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.activeInfo}>
            <Ionicons name={activeToolObj.icon} size={16} color={getCatColor(activeToolObj.category)} />
            <Text style={styles.activeName}>{activeToolObj.label}</Text>
          </Animated.View>
        )}

        {/* Upload / Action Zone */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.dropZone}>
          {pickedFiles.length > 0 ? (
            <View>
              {pickedFiles.map((f, i) => (
                <View key={i} style={styles.filePreview}>
                  <View style={styles.fileIconWrap}>
                    <Ionicons name="document-text" size={32} color="#2A63E2" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                    <Text style={styles.fileSize}>{(f.size / 1024 / 1024).toFixed(2)} MB</Text>
                  </View>
                  <Pressable
                    onPress={() => setPickedFiles((prev) => prev.filter((_, j) => j !== i))}
                    hitSlop={8} style={styles.clearFile}
                  >
                    <Ionicons name="close-circle" size={20} color="rgba(11,20,53,0.4)" />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={pickFile} style={styles.addMoreBtn}>
                <Ionicons name="add" size={16} color="#2A63E2" />
                <Text style={styles.addMoreText}>Add another</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={pickFile} style={styles.uploadArea}>
              <View style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload-outline" size={32} color="#2A63E2" />
              </View>
              <Text style={styles.uploadTitle}>Drop your document here</Text>
              <Text style={styles.uploadSub}>
                {activeToolObj
                  ? `Tap to select ${
                      getToolSchema(activeTool)?.input === 'pdfs' ? 'multiple PDFs' :
                      getToolSchema(activeTool)?.input === 'images' ? 'one or more images' :
                      'a file'
                    } for ${activeToolObj.label}`
                  : 'Select a tool above, then pick a file'}
              </Text>
              <View style={styles.uploadBtn}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.uploadBtnText}>Choose File</Text>
              </View>
            </Pressable>
          )}
        </Animated.View>

        {/* Run button — dispatches native runner with toolId + files */}
        {activeToolObj && (
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <Pressable
              onPress={runTool}
              style={({ pressed }) => [styles.runBtn, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Ionicons name="flash" size={18} color="#FFFFFF" />
              <Text style={styles.runBtnText}>
                {pickedFiles.length > 0
                  ? `Run ${activeToolObj.label} on device`
                  : `Open ${activeToolObj.label}`}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>
            <View style={styles.nativeBadge}>
              <Ionicons name="hardware-chip-outline" size={11} color="rgba(11,20,53,0.5)" />
              <Text style={styles.nativeBadgeText}>Runs natively · zero upload</Text>
            </View>
          </Animated.View>
        )}

        {/* More Tools section */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={{ marginTop: 32 }}>
          <Text style={styles.sectionTitle}>More Tools</Text>
          <Text style={styles.sectionSub}>100 tools across 6 categories — all run natively on device</Text>

          {CATEGORIES.map((cat) => {
            const catTools = getToolsByCategory(cat.id);
            const isExpanded = expandedCats[cat.id] !== false;
            return (
              <View key={cat.id} style={styles.catBlock}>
                <Pressable onPress={() => toggleCat(cat.id)} style={styles.catHeader}>
                  <View style={styles.catHeaderLeft}>
                    <View style={[styles.catDot, { backgroundColor: cat.color }]}>
                      <Ionicons name={cat.icon} size={14} color="#FFFFFF" />
                    </View>
                    <Text style={styles.catLabel}>{cat.label}</Text>
                    <View style={styles.catCount}>
                      <Text style={styles.catCountText}>{catTools.length}</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="rgba(11,20,53,0.4)"
                  />
                </Pressable>

                {isExpanded && (
                  <View style={styles.catGrid}>
                    {catTools.map((tool) => {
                      const isMine = myIds.includes(tool.id);
                      return (
                        <CatToolCard
                          key={tool.id}
                          tool={tool}
                          isMine={isMine}
                          onPress={() => {
                            setActiveTool(tool.id);
                            if (!isMine) handleAdd(tool.id);
                          }}
                          onAdd={handleAdd}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Chip "Add" button ────────────────────────────────────────

const chipAddStyles = StyleSheet.create({
  card: {
    width: 88, height: 100, borderRadius: 20,
    borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: 'rgba(42,99,226,0.4)',
    backgroundColor: 'rgba(42,99,226,0.04)',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  text: { fontSize: 11, fontWeight: '700', color: '#2A63E2' },
});

// ─── Main styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0B1435', letterSpacing: -0.4 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F6FC',
  },
  headerBtnActive: { backgroundColor: '#2A63E2' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0B1435', letterSpacing: -0.3 },
  sectionSub: { fontSize: 13, color: 'rgba(11,20,53,0.5)', marginTop: -2, marginBottom: 14 },
  activeInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#FFFFFF', borderRadius: 12, alignSelf: 'flex-start',
    marginTop: 14, borderWidth: 1, borderColor: 'rgba(11,20,53,0.06)',
  },
  activeName: { fontSize: 13, fontWeight: '700', color: '#0B1435' },

  // Drop zone
  dropZone: { marginTop: 18 },
  uploadArea: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(42,99,226,0.3)',
    borderRadius: 28, backgroundColor: 'rgba(42,99,226,0.03)',
    paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center', gap: 10,
  },
  uploadIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E8EFFF', alignItems: 'center', justifyContent: 'center',
  },
  uploadTitle: { fontSize: 17, fontWeight: '800', color: '#0B1435', letterSpacing: -0.3 },
  uploadSub: { fontSize: 13, color: 'rgba(11,20,53,0.48)', textAlign: 'center', lineHeight: 19 },
  uploadBtn: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2A63E2', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 22,
    shadowColor: '#2A63E2', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  uploadBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // File preview
  filePreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.06)', shadowColor: '#0B1435',
    shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  fileIconWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#E8EFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  fileName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0B1435' },
  fileSize: { fontSize: 12, color: 'rgba(11,20,53,0.48)', fontWeight: '600' },
  clearFile: { padding: 4 },

  // Run button
  runBtn: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#2A63E2', borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 24,
    shadowColor: '#2A63E2', shadowOpacity: 0.35, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  runBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },

  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, marginTop: 4, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(42,99,226,0.4)',
    backgroundColor: 'rgba(42,99,226,0.04)',
  },
  addMoreText: { fontSize: 13, fontWeight: '700', color: '#2A63E2' },

  nativeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 10,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12,
    backgroundColor: 'rgba(11,20,53,0.04)',
  },
  nativeBadgeText: { fontSize: 11, fontWeight: '600', color: 'rgba(11,20,53,0.5)' },

  // Categories
  catBlock: { marginBottom: 4 },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13,
  },
  catHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catDot: {
    width: 30, height: 30, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontSize: 14, fontWeight: '700', color: '#0B1435' },
  catCount: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: 'rgba(11,20,53,0.06)',
  },
  catCountText: { fontSize: 11, fontWeight: '700', color: 'rgba(11,20,53,0.45)' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 6 },
});
