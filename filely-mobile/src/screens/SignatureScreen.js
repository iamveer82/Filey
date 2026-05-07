import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import SignaturePad from '../components/SignaturePad';
import { embedSignature, analyzeSignaturePlacement } from '../services/esign';
import { addFile } from '../services/recentFiles';

export default function SignatureScreen({ navigation }) {
  const [pdfUri, setPdfUri] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const [step, setStep] = useState('pick'); // pick | sign | done

  useEffect(() => {
    pickPdf();
  }, []);

  const pickPdf = useCallback(async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (r.canceled || !r.assets?.[0]) {
        navigation.goBack();
        return;
      }
      const f = r.assets[0];
      setPdfUri(f.uri);
      setPdfName(f.name || 'document.pdf');
      setStep('sign');
    } catch {
      navigation.goBack();
    }
  }, [navigation]);

  const handleSignature = useCallback(async ({ uri }) => {
    if (!pdfUri) {
      Alert.alert('No PDF', 'Please select a PDF first.');
      return;
    }
    if (!uri) {
      Alert.alert('Empty signature', 'Draw your signature first.');
      return;
    }
    try {
      setStep('done');
      const placement = await analyzeSignaturePlacement(pdfUri);
      const position = placement.pages?.[0] || { pageNumber: 1, x: 100, y: 700, width: 200, height: 60 };

      const result = await embedSignature(pdfUri, uri, position);
      if (result.success && result.outputUri) {
        await addFile({ name: `Signed-${Date.now()}.pdf`, kind: 'pdf', uri: result.outputUri });
        Alert.alert(
          'Signed!',
          'Your document has been signed.',
          [
            {
              text: 'Share',
              onPress: async () => {
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(result.outputUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save Signed Document',
                  });
                }
              },
            },
            { text: 'Done', onPress: () => navigation.goBack() },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to embed signature.');
        setStep('sign');
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
      setStep('sign');
    }
  }, [pdfUri, navigation]);

  if (step === 'pick') {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <Ionicons name="document-text" size={40} color="rgba(255,255,255,0.3)" />
        <Text style={styles.loadingText}>Select a PDF to sign…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.pdfBar}>
        <Ionicons name="document-text" size={16} color="#2A63E2" />
        <Text style={styles.pdfName} numberOfLines={1}>{pdfName}</Text>
      </View>
      <SignaturePad onDone={handleSignature} onCancel={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0F1E' },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0F1E',
    gap: 12,
  },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '500' },
  pdfBar: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  pdfName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
