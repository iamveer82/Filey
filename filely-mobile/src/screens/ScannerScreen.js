/**
 * Scanner Screen - Document scanner with wood background and blue corner markers.
 * Features:
 * - Dark wood plank background
 * - Blue L-shaped corner markers
 * - Auto document edge detection
 * - Auto-crop to document bounds
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, StatusBar, Pressable, Text, Alert, Image } from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ScannerOverlay from '../components/ScannerOverlay';
import WoodBackground from '../components/WoodBackground';
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
      const cropResult = await autoCropDocument(photo.uri, corners, photo.width, photo.height);
      const correctedUri = await applyPerspectiveCorrection(
        cropResult.success ? cropResult.croppedUri : photo.uri,
        corners
      );
      const enhancedUri = await enhanceDocumentImage(correctedUri, {
        binarize: false,
        sharpen: true,
        autoContrast: true,
      });

      // AI Pipeline
      let extractedData = null;
      try {
        const ocrResult = await recognizeText(enhancedUri);
        if (ocrResult.text) {
          extractedData = await parseReceipt(ocrResult.text);
        }
      } catch (ocrErr) {
        console.error('[ScannerScreen] AI Pipeline failed:', ocrErr);
      }

      const newImage = {
        uri: enhancedUri,
        width: photo.width,
        height: photo.height,
        corners: corners,
        cropped: cropResult.success,
        extractedData,
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

  // Handle capture
  const handleCapture = useCallback(async (photo) => {
    setLastPhoto(photo);
    setIsDetecting(true);

    try {
      const edges = await detectDocumentEdges(photo.uri);
      setDetectedCorners(edges.corners);
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
        await addFile({
          name: `Scan-${Date.now()}.pdf`,
          kind: 'pdf',
          uri: result.outputUri,
        });

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
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera permission required to scan documents.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A0F0A" />

      <WoodBackground>
        {/* Top toolbar */}
        <View style={styles.topToolbar}>
          <Pressable onPress={() => navigation?.goBack?.()} style={styles.toolbarButton}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>

          <View style={styles.toolbarCenter}>
            <Text style={styles.toolbarTitle}>Scan Document</Text>
          </View>

          <Pressable onPress={toggleFlash} style={styles.toolbarButton}>
            <Ionicons name={flashOn ? "flash" : "flash-off"} size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Camera preview with scanner overlay */}
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={Camera.Constants.Type.back}
            flashMode={flashOn ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
            ratio="4:3"
          >
            <ScannerOverlay
              cameraRef={cameraRef}
              onDetect={handleDetect}
              onCornersChange={handleCornersChange}
              corners={detectedCorners}
              isDetecting={isDetecting || processing}
            />
          </Camera>
        </View>

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
                size={20}
                color={selectedMode === mode.key ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
              />
              <Text
                style={[
                  styles.modeTabText,
                  selectedMode === mode.key && styles.modeTabTextActive,
                ]}
              >
                {mode.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          <Pressable onPress={handleGalleryPick} style={styles.galleryButton}>
            <Ionicons name="images-outline" size={26} color="#FFFFFF" />
          </Pressable>

          <Pressable onPress={handleCapturePress} style={styles.captureButton}>
            <View style={styles.captureButtonInner} />
          </Pressable>

          <View style={styles.placeholderButton} />
        </View>

        {/* Processing indicator */}
        {processing && (
          <View style={styles.processingOverlay}>
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}

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
      </WoodBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#1A0F0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Top toolbar
  topToolbar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  toolbarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  toolbarTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Camera container - centered with aspect ratio
  cameraContainer: {
    width: '85%',
    aspectRatio: 3/4,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: Platform.OS === 'ios' ? 100 : 80,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  camera: {
    flex: 1,
  },

  // Mode selector
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 'auto',
  },
  modeTab: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2A63E2',
  },
  modeTabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Bottom controls
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    paddingTop: 10,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: BRAND,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: BRAND,
  },
  placeholderButton: {
    width: 50,
    height: 50,
  },

  // Processing overlay
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Preview strip
  previewStrip: {
    position: 'absolute',
    bottom: 130,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderRadius: 12,
  },
  previewThumb: {
    width: 50,
    height: 70,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
