/**
 * Scanner Screen - Professional document scanner with auto-detect.
 * Features:
 * - Blue boundary box with white corner dots
 * - Auto document edge detection
 * - Auto-crop to document bounds
 * - Multi-page scanning
 * - Perspective correction
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, StatusBar, Pressable, Text, Alert, Image, Dimensions } from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ScannerOverlay from '../components/ScannerOverlay';
import WoodenFrameOverlay from '../components/WoodenFrameOverlay';
import { detectDocumentEdges, autoCropDocument, applyPerspectiveCorrection, enhanceDocumentImage, generatePdfFromImages } from '../services/documentScanner';
import { recognizeText } from '../services/visionOcr';
import { parseReceipt } from '../services/gemmaInference';
import { addFile } from '../services/recentFiles';

const BRAND = '#2A63E2';
const SCAN_MODES = [
  { key: 'book', label: 'Book', icon: 'book-outline' },
  { key: 'id_card', label: 'ID Card', icon: 'card-outline' },
  { key: 'document', label: 'Document', icon: 'document-text-outline' },
  { key: 'business_card', label: 'Business Card', icon: 'id-card-outline' },
];

export default function ScannerScreen({ navigation, route }) {
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [flashOn, setFlashOn] = useState(false);
  const [detectedCorners, setDetectedCorners] = useState(null);
  const [lastPhoto, setLastPhoto] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [selectedMode, setSelectedMode] = useState('document');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.error('[ScannerScreen] Permission error:', error);
        setHasPermission(false);
      }
    })();
  }, []);

  // Reset state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Clear any stuck states when returning to scanner
      setIsDetecting(false);
      setProcessing(false);
      setLastPhoto(null);
      setDetectedCorners(null);
    }, [])
  );

  // Handle edge detection callback from overlay
  const handleDetect = useCallback(async (detection) => {
    setDetectedCorners(detection.corners);
    setIsDetecting(true);

    // Use detected corners for auto-crop
    if (lastPhoto && detection.corners) {
      await processPhoto(lastPhoto, detection.corners);
    }
  }, [lastPhoto]);

  // Handle corner changes when user drags
  const handleCornersChange = useCallback((newCorners) => {
    setDetectedCorners(newCorners);
  }, []);

  // Process photo with detected corners
  const processPhoto = async (photo, corners) => {
    if (processing) return;
    setProcessing(true);

    try {
      // Step 1: Auto-crop to document bounds (pass actual image dimensions)
      const cropResult = await autoCropDocument(photo.uri, corners, photo.width, photo.height);

      // Step 2: Apply perspective correction
      const correctedUri = await applyPerspectiveCorrection(
        cropResult.success ? cropResult.croppedUri : photo.uri,
        corners
      );

      // Step 3: Enhance image
      const enhancedUri = await enhanceDocumentImage(correctedUri, {
        binarize: false,
        sharpen: true,
        autoContrast: true,
      });

      // ─── NEW: AI Pipeline Integration ──────────────────────
      let extractedData = null;
      try {
        const ocrResult = await recognizeText(enhancedUri);
        if (ocrResult.text) {
          extractedData = await parseReceipt(ocrResult.text);
        }
      } catch (ocrErr) {
        console.error('[ScannerScreen] AI Pipeline failed:', ocrErr);
      }
      // ──────────────────────────────────────────────────────

      // Add to captured pages
      const newImage = {
        uri: enhancedUri,
        width: photo.width,
        height: photo.height,
        corners: corners,
        cropped: cropResult.success,
        extractedData, // Pass AI data to the image object
      };

      setCapturedImages(prev => [...prev, newImage]);

      const merchantInfo = extractedData?.merchant
        ? `Found: ${extractedData.merchant} (${extractedData.amount || 0} ${extractedData.currency || 'AED'})`
        : null;

      Alert.alert(
        extractedData ? 'Scan Complete' : 'Scan Complete - Manual Entry',
        merchantInfo || (cropResult.success ? 'Document captured! AI extraction failed - you can enter details manually.' : 'Document captured.'),
        [
          {
            text: 'Review & Save',
            onPress: () => {
              // Navigate then clear state after delay
              navigation.navigate('TransactionReview', { transaction: extractedData, imageUri: enhancedUri });
              setTimeout(() => {
                setCapturedImages([]);
                setIsDetecting(false);
                setLastPhoto(null);
                setDetectedCorners(null);
                setProcessing(false);
              }, 300);
            },
          },
          {
            text: 'Add Another',
            onPress: () => {
              setIsDetecting(false);
              setLastPhoto(null);
              setDetectedCorners(null);
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('[ScannerScreen] Process error:', error);
      Alert.alert('Error', 'Failed to process document');
    } finally {
      setProcessing(false);
    }
  };

  // Handle capture from overlay
  const handleCapture = useCallback(async (photo) => {
    setLastPhoto(photo);
    setIsDetecting(true);

    try {
      // Detect edges in captured photo
      const edges = await detectDocumentEdges(photo.uri);
      setDetectedCorners(edges.corners);

      // Auto-crop and process
      await processPhoto(photo, edges.corners);
    } catch (error) {
      console.error('[ScannerScreen] Capture error:', error);
      setIsDetecting(false);
    }
  }, []);

  const handleSavePdf = async (image) => {
    try {
      const images = image ? [image] : capturedImages;
      if (images.length === 0) return;

      const result = await generatePdfFromImages(images.map(img => img.uri));

      if (result.success) {
        // Save to recent files
        await addFile({
          name: `Scan-${Date.now()}.pdf`,
          kind: 'pdf',
          uri: result.outputUri,
        });

        // Share
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.outputUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Scanned Document',
          });
        }

        setCapturedImages([]);
        navigation?.goBack?.();
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRetake = () => {
    setCapturedImages([]);
    setLastPhoto(null);
    setDetectedCorners(null);
    setIsDetecting(false);
  };

  const toggleFlash = () => setFlashOn(!flashOn);
  const toggleSettings = () => setShowSettings(!showSettings);

  const handleCapturePress = async () => {
    if (!cameraRef?.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.9,
      });
      await handleCapture(photo);
    } catch (error) {
      console.error('[ScannerScreen] Capture press error:', error);
    }
  };

  const handleGalleryPick = async () => {
    try {
      const { pickFromGallery } = await import('../services/documentScanner');
      const result = await pickFromGallery();
      if (result.success) {
        setLastPhoto(result);
        const edges = await detectDocumentEdges(result.uri);
        setDetectedCorners(edges.corners);
        await processPhoto(result, edges.corners);
      }
    } catch (error) {
      console.error('[ScannerScreen] Gallery pick error:', error);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission required to scan documents.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2A1F1A" />

      {/* Wooden Frame Scanner UI */}
      <WoodenFrameOverlay>
        {/* Camera preview inside wooden frame */}
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={Camera.Constants.Type.back}
          flashMode={flashOn ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
          ratio="4:3"
        >
          {/* Scanner overlay with blue boundary */}
          <ScannerOverlay
            cameraRef={cameraRef}
            onDetect={handleDetect}
            onCornersChange={handleCornersChange}
            corners={detectedCorners}
            isDetecting={isDetecting || processing}
          />

          {/* Top toolbar - wood styled */}
          <View style={styles.topToolbarWood}>
            <Pressable onPress={() => navigation?.goBack?.()} style={styles.toolbarButtonWood}>
              <Ionicons name="close" size={26} color="#F5DEB3" />
            </Pressable>

            <View style={styles.toolbarCenter}>
              <Text style={styles.toolbarTitleWood}>Scan Document</Text>
            </View>

            <Pressable onPress={toggleSettings} style={styles.toolbarButtonWood}>
              <Ionicons name="settings-outline" size={22} color="#F5DEB3" />
            </Pressable>
          </View>

          {/* Bottom info - wood styled */}
          <View style={styles.bottomInfoWood}>
            <Text style={styles.bottomInfoTextWood}>
              {processing ? 'Processing...' : 'Position document within frame'}
            </Text>
            {capturedImages.length > 0 && (
              <View style={styles.pageCountWood}>
                <Ionicons name="documents" size={16} color="#F5DEB3" />
                <Text style={styles.pageCountTextWood}>{capturedImages.length}</Text>
              </View>
            )}
          </View>
        </Camera>
      </WoodenFrameOverlay>

      {/* Bottom controls: mode selector + shutter + gallery */}
      <View style={styles.bottomControls}>
        {/* Mode selector */}
        <View style={styles.modeSelector}>
          {SCAN_MODES.map((mode) => (
            <Pressable
              key={mode.key}
              onPress={() => setSelectedMode(mode.key)}
              style={[
                styles.modeTab,
                selectedMode === mode.key && styles.modeTabActive,
              ]}
            >
              <Ionicons
                name={mode.icon}
                size={18}
                color={selectedMode === mode.key ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
              />
              <Text
                style={[
                  styles.modeTabText,
                  selectedMode === mode.key && styles.modeTabTextActive,
                ]}
                numberOfLines={1}
              >
                {mode.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Shutter + Gallery row */}
        <View style={styles.captureRow}>
          <Pressable onPress={handleGalleryPick} style={styles.galleryButton}>
            <Ionicons name="images-outline" size={28} color="#FFFFFF" />
          </Pressable>

          <Pressable onPress={handleCapturePress} style={styles.captureButton}>
            <View style={styles.captureButtonInner} />
          </Pressable>

          <View style={styles.placeholderButton} />
        </View>
      </View>

      {/* Captured preview strip */}
      {capturedImages.length > 0 && (
        <View style={styles.previewStrip}>
          {capturedImages.map((img, index) => (
            <View key={index} style={styles.previewThumb}>
              <Image source={{ uri: img.uri }} style={styles.thumbImage} resizeMode="cover" />
            </View>
          ))}
          <Pressable onPress={handleRetake} style={styles.retakeButton}>
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  permissionText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },

  // Top toolbar
  topToolbar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  toolbarTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Bottom info
  bottomInfo: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomInfoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  pageCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 99, 226, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    gap: 6,
  },
  pageCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Wood-themed controls
  topToolbarWood: {
    position: 'absolute',
    top: 40,
    left: 40,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toolbarButtonWood: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(92, 64, 51, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4A574',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  toolbarTitleWood: {
    color: '#F5DEB3',
    fontSize: 17,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomInfoWood: {
    position: 'absolute',
    bottom: 180,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  bottomInfoTextWood: {
    color: '#F5DEB3',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pageCountWood: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(92, 64, 51, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#D4A574',
  },
  pageCountTextWood: {
    color: '#F5DEB3',
    fontSize: 14,
    fontWeight: '600',
  },

  // Bottom controls: mode selector + capture row - wood themed
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#2A1F1A',
    borderTopWidth: 3,
    borderTopColor: '#5C4033',
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
  },

  // Mode selector tabs - wood themed
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 105, 85, 0.3)',
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: 'rgba(92, 64, 51, 0.5)',
    borderWidth: 1,
    borderColor: '#D4A574',
  },
  modeTabText: {
    color: 'rgba(245, 222, 179, 0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  modeTabTextActive: {
    color: '#F5DEB3',
    fontWeight: '600',
  },

  // Capture row: gallery - shutter - placeholder
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(92, 64, 51, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4A574',
  },
  placeholderButton: {
    width: 50,
    height: 50,
  },

  // Wood-styled capture button
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#D4A574',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#5C4033',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B6914',
    borderWidth: 2,
    borderColor: '#5C4033',
  },

  // Preview strip - wood themed
  previewStrip: {
    position: 'absolute',
    bottom: 200,
    left: 40,
    right: 40,
    flexDirection: 'row',
    backgroundColor: 'rgba(42, 31, 26, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5C4033',
  },
  previewThumb: {
    width: 50,
    height: 70,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  retakeButton: {
    width: 50,
    height: 70,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
