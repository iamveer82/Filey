import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

const BRAND = '#2A63E2';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORIES = [
  'General',
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Travel',
  'Office Supplies',
  'Rent',
  'Maintenance',
  'Other',
];

const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'Check',
  'Mobile Payment',
  'Other',
];

export default function TransactionReviewScreen({ route, navigation }) {
  const { transaction, imageUri } = route.params || {};
  const { user } = useAuth();
  const [hasChanges, setHasChanges] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    merchant: transaction?.merchant || '',
    date: transaction?.date || new Date().toISOString().split('T')[0],
    amount: transaction?.amount || 0,
    vat: transaction?.vat || 0,
    trn: transaction?.trn || '',
    currency: transaction?.currency || 'AED',
    category: transaction?.category || 'General',
    paymentMethod: transaction?.paymentMethod || 'Cash',
  });

  const [errors, setErrors] = useState({});

  // Track changes for unsaved warning
  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Clear error when field changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  // Unsaved changes warning
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasChanges || loading) return;

      e.preventDefault();
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasChanges, loading]);

  const validate = () => {
    const newErrors = {};

    if (!form.merchant?.trim()) {
      newErrors.merchant = 'Merchant name is required';
    }

    if (!form.amount || form.amount <= 0) {
      newErrors.amount = 'Valid amount required';
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(form.date)) {
      newErrors.date = 'Invalid date format (YYYY-MM-DD)';
    }

    // TRN validation - exactly 15 digits if provided
    if (form.trn && form.trn.length > 0) {
      const trnRegex = /^\d{15}$/;
      if (!trnRegex.test(form.trn)) {
        newErrors.trn = 'TRN must be exactly 15 digits';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      updateField('date', formatted);
    }
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([
          {
            ...form,
            user_id: user?.id,
            image_url: imageUri,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      setHasChanges(false);
      Alert.alert('Success', 'Transaction saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('[TransactionReview] Save failed:', err);
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const ImagePreviewModal = () => (
    <Modal
      visible={imageModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setImageModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.modalCloseArea}
          onPress={() => setImageModalVisible(false)}
        >
          <View style={styles.modalImageWrapper}>
            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalCloseButton}
          onPress={() => setImageModalVisible(false)}
        >
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Image Preview Modal */}
      <ImagePreviewModal />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Transaction</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Receipt Image */}
        {imageUri && (
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => setImageModalVisible(true)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <Ionicons name="expand-outline" size={20} color="#FFF" />
              <Text style={styles.imageOverlayText}>Tap to zoom</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.form}>
          {/* Merchant */}
          <Field
            label="Merchant"
            value={form.merchant}
            onChange={v => updateField('merchant', v)}
            error={errors.merchant}
            placeholder="Enter merchant name"
          />

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={[styles.dateInput, errors.date && styles.inputError]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={form.date ? styles.dateText : styles.datePlaceholder}>
                {formatDateForDisplay(form.date) || 'Select date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
            </TouchableOpacity>
            {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={new Date(form.date || new Date())}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Amount */}
          <Field
            label={`Amount (${form.currency})`}
            value={form.amount ? form.amount.toString() : ''}
            onChange={v => updateField('amount', parseFloat(v) || 0)}
            keyboard="numeric"
            error={errors.amount}
            placeholder="0.00"
          />

          {/* VAT */}
          <Field
            label={`VAT (${form.currency})`}
            value={form.vat ? form.vat.toString() : ''}
            onChange={v => updateField('vat', parseFloat(v) || 0)}
            keyboard="numeric"
            placeholder="0.00"
          />

          {/* TRN */}
          <Field
            label="TRN (15 Digits)"
            value={form.trn}
            onChange={v => {
              // Only allow digits, max 15
              const digits = v.replace(/\D/g, '').slice(0, 15);
              updateField('trn', digits);
            }}
            keyboard="numeric"
            error={errors.trn}
            placeholder="123456789012345"
            maxLength={15}
          />

          {/* Category Picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.category}
                onValueChange={v => updateField('category', v)}
                style={styles.picker}
                dropdownIconColor="#64748B"
              >
                {CATEGORIES.map(cat => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Payment Method Picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.paymentMethod}
                onValueChange={v => updateField('paymentMethod', v)}
                style={styles.picker}
                dropdownIconColor="#64748B"
              >
                {PAYMENT_METHODS.map(method => (
                  <Picker.Item key={method} label={method} value={method} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Currency */}
          <View style={styles.field}>
            <Text style={styles.label}>Currency</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.currency}
                onValueChange={v => updateField('currency', v)}
                style={styles.picker}
                dropdownIconColor="#64748B"
              >
                <Picker.Item label="AED" value="AED" />
                <Picker.Item label="USD" value="USD" />
                <Picker.Item label="EUR" value="EUR" />
                <Picker.Item label="GBP" value="GBP" />
                <Picker.Item label="INR" value="INR" />
              </Picker>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Confirm & Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, keyboard = 'default', error, placeholder, maxLength }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        maxLength={maxLength}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },

  // Image
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  imageOverlayText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Form
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginLeft: 4 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500'
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginLeft: 4,
  },

  // Date picker
  dateInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  datePlaceholder: {
    fontSize: 15,
    color: '#94A3B8',
  },

  // Picker
  pickerContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    marginHorizontal: -8,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  saveBtn: {
    backgroundColor: BRAND,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
