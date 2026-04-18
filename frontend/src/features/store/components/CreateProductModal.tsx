import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Modal, ActivityIndicator, Alert, FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConfirmModal from '../../../components/ConfirmModal';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import {
  CREATE_STORE_PRODUCT, UPDATE_STORE_PRODUCT,
  GET_STORE_PRODUCTS, GET_MY_STORE_PRODUCTS,
} from '../graphql/store.operations';
import { useMediaUpload } from '../../storage/hooks/useMediaUpload';
import { Video as Compressor } from 'react-native-compressor';
import Toast from 'react-native-toast-message';

const COUNTRY_CODES = [
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: '+51',  flag: '🇵🇪', name: 'Perú' },
  { code: '+52',  flag: '🇲🇽', name: 'México' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: '+58',  flag: '🇻🇪', name: 'Venezuela' },
  { code: '+1',   flag: '🇺🇸', name: 'EE.UU.' },
  { code: '+34',  flag: '🇪🇸', name: 'España' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '+507', flag: '🇵🇦', name: 'Panamá' },
];

interface LocalMedia {
  uri: string;
  mimeType: string;
  type: 'IMAGE' | 'VIDEO';
  status: 'pending' | 'uploading' | 'done' | 'error';
  remoteUrl?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  editItem?: any;
}

export default function CreateProductModal({ visible, onClose, editItem }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { pickMultipleMedia, uploadMedia } = useMediaUpload();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [countryCode, setCountryCode] = useState('+593');
  const [phone, setPhone] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [localMedia, setLocalMedia] = useState<LocalMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editItem) {
        setTitle(editItem.title || editItem.storeTitle || '');
        setDescription(editItem.description || editItem.storeDescription || '');
        setPrice(String(editItem.price || editItem.storePrice || ''));
        setLocation(editItem.location || editItem.storeLocation || '');
        
        const phoneToUse = editItem.contactPhone || editItem.storeContactPhone || '';
        if (phoneToUse) {
          const matched = COUNTRY_CODES.find(c => phoneToUse.startsWith(c.code));
          if (matched) {
            setCountryCode(matched.code);
            setPhone(phoneToUse.slice(matched.code.length));
          } else {
            setPhone(phoneToUse);
          }
        } else {
          setCountryCode('+593');
          setPhone('');
        }
        // Pre-fill existing media
        const rawMedia = editItem.media || editItem.storeMedia || [];
        const existingMedia: LocalMedia[] = rawMedia.map((m: any) => ({
          uri: m.url,
          mimeType: m.type === 'VIDEO' ? 'video/mp4' : 'image/jpeg',
          type: m.type,
          status: 'done' as const,
          remoteUrl: m.url,
        }));
        setLocalMedia(existingMedia);
      } else {
        setTitle(''); setDescription(''); setPrice('');
        setLocation(''); setCountryCode('+593'); setPhone('');
        setLocalMedia([]);
      }
    }
  }, [visible, editItem]);

  const [createProduct] = useMutation(CREATE_STORE_PRODUCT, {
    refetchQueries: [
      { query: GET_STORE_PRODUCTS, variables: { limit: 30, offset: 0 } },
      { query: GET_MY_STORE_PRODUCTS },
    ],
  });

  const [updateProduct] = useMutation(UPDATE_STORE_PRODUCT, {
    refetchQueries: [
      { query: GET_STORE_PRODUCTS, variables: { limit: 30, offset: 0 } },
      { query: GET_MY_STORE_PRODUCTS },
    ],
  });

  const handlePickMedia = async () => {
    if (localMedia.length >= 10) {
      Alert.alert('Límite alcanzado', 'Puedes agregar máximo 10 archivos.');
      return;
    }
    const results = await pickMultipleMedia('All');
    if (!results || results.length === 0) return;

    const newMedia: LocalMedia[] = results.map(r => ({
      uri: r.localUri,
      mimeType: r.mimeType,
      type: r.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
      status: 'pending',
    }));
    setLocalMedia(prev => [...prev, ...newMedia].slice(0, 10));
  };

  const handleRemoveMedia = (index: number) => {
    setLocalMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return Alert.alert('Título requerido', 'Por favor ingresa un título para el producto.');
    const priceNum = Number(price.replace(',', '.'));
    if (!price.trim() || isNaN(priceNum) || priceNum <= 0)
      return Alert.alert('Precio inválido', 'Por favor ingresa un precio válido mayor a 0.');
    if (!description.trim()) return Alert.alert('Descripción requerida', 'Por favor describe tu producto.');

    setSubmitting(true);
    try {
      // Upload pending media
      const uploadedMedia: { url: string; type: string; order: number }[] = [];
      for (let i = 0; i < localMedia.length; i++) {
        const m = localMedia[i];
        if (m.status === 'done' && m.remoteUrl) {
          uploadedMedia.push({ url: m.remoteUrl, type: m.type, order: i });
          continue;
        }
        setLocalMedia(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item));
        const folder = m.type === 'VIDEO' ? 'store-videos' : 'store-images';
        try {
          let uploadUri = m.uri;
          let uploadMimeType = m.mimeType;

          // Comprimir video antes de subir
          if (m.type === 'VIDEO') {
            try {
              uploadUri = await Compressor.compress(m.uri, {
                compressionMethod: 'manual',
                bitrate: 3000000,
                maxSize: 720
              });
              // El compresor siempre produce MP4
              uploadMimeType = 'video/mp4';
            } catch (compErr) {
              console.warn('Compresión de video falló, usando original:', compErr);
            }
          }

          const remoteUrl = await uploadMedia(uploadUri, uploadMimeType, folder);
          setLocalMedia(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'done', remoteUrl } : item));
          uploadedMedia.push({ url: remoteUrl, type: m.type, order: i });
        } catch (uploadErr: any) {
          // Marcar como error pero continuar con los demás archivos
          setLocalMedia(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error' } : item));
          Toast.show({
            type: 'error',
            text1: 'Error al subir archivo',
            text2: `Imagen ${i + 1}: ${uploadErr?.message || 'Error desconocido'}`,
            visibilityTime: 4000,
          });
          console.error(`[MediaUpload] Error on file ${i}:`, uploadErr);
        }
      }

      const contactPhone = phone.trim() ? countryCode + phone.trim() : undefined;
      const input = {
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        currency: 'USD',
        location: location.trim() || undefined,
        contactPhone,
        media: editItem ? undefined : uploadedMedia,
      };

      if (editItem) {
        await updateProduct({ variables: { input: { id: editItem.id, ...input } } });
        Toast.show({ type: 'success', text1: '¡Producto actualizado!' });
      } else {
        await createProduct({ variables: { input } });
        Toast.show({ type: 'success', text1: '¡Producto publicado!' });
      }
      onClose();
    } catch (e: any) {
      const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error inesperado';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = title.trim() && price.trim() && description.trim() && !submitting;
  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) ?? COUNTRY_CODES[0];
  const isUploading = localMedia.some(m => m.status === 'uploading');

  const handleClose = () => {
    const hasChanges = editItem
      ? (title !== (editItem.title || editItem.storeTitle || '') ||
         description !== (editItem.description || editItem.storeDescription || '') ||
         price !== String(editItem.price || editItem.storePrice || '') ||
         location !== (editItem.location || editItem.storeLocation || '') ||
         phone !== (editItem.contactPhone || editItem.storeContactPhone || '').replace(countryCode, ''))
      : (title.trim() !== '' || description.trim() !== '' || price.trim() !== '' || location.trim() !== '' || phone.trim() !== '' || localMedia.length > 0);

    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={handleClose} disabled={submitting} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={submitting ? colors.textSecondary : colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {editItem ? 'Editar Producto' : 'Publicar Producto'}
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[styles.headerSaveBtn, { backgroundColor: canSubmit ? '#FF6524' : colors.border }]}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={{ color: canSubmit ? '#FFF' : colors.textSecondary, fontWeight: '700', fontSize: 14 }}>
                    {editItem ? 'Guardar' : 'Publicar'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">


          {/* Título */}
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
            Título <Text style={{ color: '#FF6524' }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Ej: iPhone 14 Pro 256GB"
            placeholderTextColor={isDark ? '#555' : '#BBB'}
            value={title}
            onChangeText={setTitle}
            editable={!submitting}
            maxLength={100}
          />
          <Text style={[styles.counter, { color: colors.textSecondary }]}>{title.length}/100</Text>

          {/* Precio en USD */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Precio <Text style={{ color: '#FF6524' }}>*</Text>
          </Text>
          <View style={[styles.priceInputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.usdBadge, { backgroundColor: isDark ? 'rgba(255,101,36,0.15)' : 'rgba(255,101,36,0.1)' }]}>
              <Text style={{ color: '#FF6524', fontWeight: '800', fontSize: 15 }}>$</Text>
            </View>
            <TextInput
              style={[styles.priceTextInput, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={isDark ? '#555' : '#BBB'}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              editable={!submitting}
              maxLength={25}
            />
            <Text style={[styles.usdLabel, { color: colors.textSecondary }]}>USD</Text>
          </View>

          {/* Descripción */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Descripción <Text style={{ color: '#FF6524' }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Describe tu producto: estado, detalles, por qué lo vendes..."
            placeholderTextColor={isDark ? '#555' : '#BBB'}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
            editable={!submitting}
            maxLength={3000}
          />
          <Text style={[styles.counter, { color: colors.textSecondary }]}>{description.length}/3000</Text>

          {/* Ubicación */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Ubicación <Text style={[styles.optional, { color: colors.textSecondary }]}>(opcional)</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Ej: Quito, Ecuador"
            placeholderTextColor={isDark ? '#555' : '#BBB'}
            value={location}
            onChangeText={setLocation}
            editable={!submitting}
            maxLength={50}
          />
          <Text style={[styles.counter, { color: colors.textSecondary }]}>{location.length}/50</Text>

          {/* Teléfono con selector de país */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Teléfono de contacto <Text style={[styles.optional, { color: colors.textSecondary }]}>(opcional)</Text>
          </Text>
          <View style={styles.phoneRow}>
            <TouchableOpacity
              style={[styles.countryCodeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowCountryPicker(true)}
              disabled={submitting}
            >
              <Text style={[styles.countryCodeText, { color: colors.text }]}>{countryCode}</Text>
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
            <TextInput
              style={[styles.phoneInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="0999 999 999"
              placeholderTextColor={isDark ? '#555' : '#BBB'}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!submitting}
              maxLength={25}
            />
          </View>

          {/* ── Selector de fotos/videos ── */}
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Multimedia (Opcional)</Text>
          {!editItem ? (
            <TouchableOpacity
              style={[styles.mediaButton, { borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={handlePickMedia}
              disabled={submitting}
            >
              <View style={styles.mediaButtonIconGradientWrapper}>
                <MaskedView
                  style={{ width: 20, height: 20 }}
                  maskElement={<Ionicons name="image" size={20} color="black" />}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1 }}
                  />
                </MaskedView>
              </View>
              <Text style={styles.mediaButtonText}>Añadir foto o video</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.mediaButton, { borderStyle: 'solid', backgroundColor: colors.surface, opacity: 0.8, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.mediaButtonText, { color: colors.textSecondary }]}>Las fotos o videos no se pueden cambiar al editar</Text>
            </View>
          )}

          {localMedia.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {localMedia.map((m, i) => (
                <View key={i} style={styles.mediaPreviewContainer}>
                  {m.type === 'VIDEO' ? (
                    <View style={styles.mediaPreview}>
                      <Image source={{ uri: m.uri }} style={styles.mediaPreview} />
                      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                        <Ionicons name="play-circle" size={30} color="#FFF" />
                      </View>
                    </View>
                  ) : (
                    <Image source={{ uri: m.uri }} style={styles.mediaPreview} resizeMode="cover" />
                  )}
                  {i === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Portada</Text>
                    </View>
                  )}
                  {m.status === 'uploading' && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#FFF" />
                    </View>
                  )}
                  {m.status !== 'uploading' && !editItem && (
                    <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={() => handleRemoveMedia(i)}
                      disabled={submitting}
                    >
                      <Ionicons name="close-circle" size={24} color="rgba(0,0,0,0.8)" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

        </ScrollView>
      </View>

      {/* ── Country Code Picker ── */}
      <Modal visible={showCountryPicker} transparent animationType="slide" onRequestClose={() => setShowCountryPicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setShowCountryPicker(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Código de País</Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, {
                    backgroundColor: countryCode === item.code
                      ? (isDark ? 'rgba(255,101,36,0.1)' : 'rgba(255,101,36,0.07)')
                      : 'transparent'
                  }]}
                  onPress={() => { setCountryCode(item.code); setShowCountryPicker(false); }}
                >
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{item.flag}</Text>
                  <Text style={[styles.pickerItemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.pickerItemCode, { color: colors.textSecondary }]}>{item.code}</Text>
                  {countryCode === item.code && <Ionicons name="checkmark" size={18} color="#FF6524" style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>

    <ConfirmModal
      visible={showExitConfirm}
      title="¿Salir de la edición?"
      message="Tienes cambios sin guardar. Si sales ahora, se perderán."
      confirmText="Salir"
      cancelText="Continuar editando"
      onConfirm={() => {
        setShowExitConfirm(false);
        onClose();
      }}
      onCancel={() => setShowExitConfirm(false)}
      isDestructive={true}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  headerBtn: { padding: 4 },
  headerSaveBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, minWidth: 72, alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  optional: { fontWeight: '400' },
  input: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 16,
  },
  textArea: { minHeight: 120, paddingTop: 12 },
  counter: { fontSize: 12, textAlign: 'right', marginTop: -12, marginBottom: 16 },
  // Media (estilo Empleos)
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mediaButtonIconGradientWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,101,36,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  mediaButtonText: {
    color: '#FF6524',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mediaPreviewContainer: {
    width: 100,
    height: 140,
    marginRight: 10,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 20,
    borderRadius: 12,
    padding: 2,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  coverBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: '#FF6524', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    zIndex: 10,
  },
  coverBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  // Price
  priceInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 14, marginBottom: 16, overflow: 'hidden',
  },
  usdBadge: { width: 44, height: 48, justifyContent: 'center', alignItems: 'center' },
  priceTextInput: { flex: 1, fontSize: 16, fontWeight: '600', paddingVertical: 12, paddingHorizontal: 8 },
  usdLabel: { paddingRight: 14, fontSize: 13, fontWeight: '600' },
  // Phone
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  countryCodeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 12,
  },
  countryCodeText: { fontWeight: '700', fontSize: 14 },
  phoneInput: {
    flex: 1, borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  // Country picker
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 32 },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  pickerTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 2,
  },
  pickerItemName: { flex: 1, fontSize: 15, fontWeight: '600' },
  pickerItemCode: { fontSize: 14 },
  counter: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: -14,
    marginBottom: 10,
    fontWeight: '600',
  },
});
