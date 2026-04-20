import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useTheme } from '../../../theme/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface FileBubbleProps {
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  fileMimeType?: string;
  isMine: boolean;
}

export const FileBubble: React.FC<FileBubbleProps> = ({ fileUrl, fileName, fileSize, fileMimeType, isMine }) => {
  const { colors, isDark } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const handleOpenFile = async () => {
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);

      if (Platform.OS === 'android') {
        // Lógica Maestra de Android usando DownloadManager nativo
        // Codificamos la URL para evitar errores con espacios o caracteres especiales
        const encodedUrl = encodeURI(fileUrl);

        await ReactNativeBlobUtil.config({
          fileCache: true,
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: fileName,
            description: 'Descargando archivo de Chunchi City...',
            mime: fileMimeType || 'application/octet-stream',
            mediaScannable: true,
            // Dejamos que el sistema elija la ruta para evitar problemas de permisos (Scoped Storage)
          },
        }).fetch('GET', encodedUrl);

        // En Android, el DownloadManager se encarga de todo. 
        setIsDownloading(false);
      } else {
        // Estándar para iOS usando el sistema de compartir de Apple
        const fileUri = FileSystem.cacheDirectory + fileName;
        const { uri } = await FileSystem.downloadAsync(fileUrl, fileUri);
        
        setIsDownloading(false);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            UTI: fileMimeType || undefined,
            dialogTitle: `Abrir ${fileName}`,
          });
        }
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      setIsDownloading(false);
      Alert.alert('Error', 'No se pudo descargar el archivo.');
    }
  };

  const bubbleColor = isMine ? 'rgba(255,255,255,0.15)' : (isDark ? '#3A3A3C' : '#F2F2F7');
  const textColor = isMine ? '#FFFFFF' : colors.text;
  const subTextColor = isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary;

  return (
    <TouchableOpacity 
      onPress={handleOpenFile} 
      activeOpacity={0.7}
      style={[
        styles.container, 
        { backgroundColor: bubbleColor }
      ]}
    >
      <View style={styles.iconContainer}>
        {isDownloading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <Ionicons name="document-text-outline" size={28} color={textColor} />
        )}
      </View>
      
      <View style={styles.textContainer}>
        <Text 
          style={[styles.fileName, { color: textColor }]} 
          numberOfLines={1} 
          ellipsizeMode="middle"
        >
          {fileName}
        </Text>
        {fileSize ? (
          <Text style={[styles.fileSize, { color: subTextColor }]}>
            {formatFileSize(fileSize)}
          </Text>
        ) : null}
      </View>
      
      <Ionicons 
        name="download-outline" 
        size={18} 
        color={subTextColor} 
        style={styles.downloadIcon}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    width: screenWidth * 0.7,
    maxWidth: '100%',
    marginVertical: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
  },
  downloadIcon: {
    marginLeft: 4,
  }
});
