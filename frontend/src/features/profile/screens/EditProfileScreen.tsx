import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@apollo/client';
import { ProfileService, UserCustomField } from '../services/profile.service';
import { UPDATE_PROFILE } from '../graphql/profile.operations';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import Toast from 'react-native-toast-message';
import EditBadgeSection from '../components/EditBadgeSection';
import ManageCustomFieldsSection from '../components/ManageCustomFieldsSection';

export default function EditProfileScreen() {
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        bio: '',
        phone: '',
        badgeTitle: '',
        photoUrl: '', // This will be used when we implement photo uploading
        customFields: [] as UserCustomField[],
    });

    const [updateProfileMutation] = useMutation(UPDATE_PROFILE);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await ProfileService.getProfile();
                setFormData({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    username: data.username || '',
                    bio: data.bio || '',
                    phone: data.phone || '',
                    badgeTitle: data.badge?.title || '',
                    photoUrl: data.photoUrl || '',
                    customFields: data.customFields || [],
                });
            } catch (error) {
                console.log('Error fetching profile for edit:', error);
                Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar los datos' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleSave = async () => {
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'El nombre y apellido son obligatorios' });
            return;
        }
        if (!formData.username.trim() || formData.username.trim().length < 2) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'El nombre de usuario debe tener mínimo 2 caracteres' });
            return;
        }

        setIsSaving(true);
        try {
            await updateProfileMutation({
                variables: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    bio: formData.bio,
                    username: formData.username,
                    phone: formData.phone,
                }
            });

            Toast.show({ type: 'success', text1: 'Éxito', text2: 'Perfil actualizado correctamente' });
            navigation.goBack();
        } catch (error: any) {
            const errorMessage = error.message || '';

            if (errorMessage.includes('El nombre de usuario ya está en uso') || errorMessage.includes('duplicate key value violates unique constraint')) {
                Toast.show({ type: 'error', text1: 'Opción no disponible', text2: 'El nombre de usuario ya está en uso' });
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'No se pudo guardar el perfil' });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleBadgeUpdated = (newTitle: string) => {
        setFormData(prev => ({ ...prev, badgeTitle: newTitle }));
    };

    const handleCustomFieldsUpdated = (fields: UserCustomField[]) => {
        setFormData(prev => ({ ...prev, customFields: fields }));
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            {/* Cabecera superior (AppBar) */}
            <SafeAreaView edges={['top']} style={styles.headerArea}>
                <View style={styles.appBar}>
                    <View style={styles.appBarLeft}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                            <Ionicons name="arrow-back" size={26} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.appBarTitle}>Editar perfil</Text>
                    </View>
                    <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <ActivityIndicator size="small" color={colors.text} />
                        ) : (
                            <Text style={styles.saveButtonText}>Guardar</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView bounces={false} style={styles.scrollView} showsVerticalScrollIndicator={false}>

                {/* Opciones de Fondo (Banner) y Avatar */}
                <View style={styles.mediaEditorContainer}>
                    <View style={styles.bannerContainer}>
                        <LinearGradient
                            colors={[colors.primary, '#FF9800']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.bannerGradient}
                        />
                        {/* Overlay Oscuro y Cámara para el Banner */}
                        <View style={styles.bannerOverlay}>
                            <TouchableOpacity style={styles.cameraIconWrapper}>
                                <Ionicons name="camera-outline" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Avatar superpuesto */}
                    <View style={styles.avatarRow}>
                        <View style={styles.avatarWrapper}>
                            {formData.photoUrl ? (
                                <Image source={{ uri: formData.photoUrl }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarPlaceholderText}>
                                        {formData.firstName?.[0]}{formData.lastName?.[0]}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.avatarOverlay}>
                                <TouchableOpacity style={styles.cameraIconWrapper}>
                                    <Ionicons name="camera-outline" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Formulario */}
                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nombre</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.firstName}
                            onChangeText={(val) => setFormData({ ...formData, firstName: val })}
                            placeholder="Tu nombre"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Apellido</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.lastName}
                            onChangeText={(val) => setFormData({ ...formData, lastName: val })}
                            placeholder="Tu apellido"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nombre de usuario</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.username}
                            onChangeText={(val) => setFormData({ ...formData, username: val })}
                            placeholder="@usuario"
                            autoCapitalize="none"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Teléfono</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.phone}
                            onChangeText={(val) => setFormData({ ...formData, phone: val })}
                            placeholder="Ej: +593 99 999 9999"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Ahora bio es real */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Biografía</Text>
                        <TextInput
                            style={[styles.textInput, { minHeight: 60 }]}
                            value={formData.bio}
                            onChangeText={(val) => setFormData({ ...formData, bio: val })}
                            multiline
                            placeholder="Añade tu biografía"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    {/* SECCIÓN INSIGNIA (BADGE) */}
                    <EditBadgeSection
                        initialBadgeTitle={formData.badgeTitle}
                        onBadgeUpdated={handleBadgeUpdated}
                    />

                    {/* SECCIÓN CAMPOS PERSONALIZADOS (DINÁMICA) */}
                    <ManageCustomFieldsSection
                        initialCustomFields={formData.customFields}
                        onCustomFieldsUpdated={handleCustomFieldsUpdated}
                    />

                </View>
            </ScrollView>
        </KeyboardAvoidingView >
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    headerArea: {
        backgroundColor: colors.background,
    },
    appBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 56,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    appBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    closeButton: {
        marginRight: 24,
    },
    appBarTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text, // Blanco puro como dice Twitter Guardar
    },
    scrollView: {
        flex: 1,
    },
    mediaEditorContainer: {
        width: '100%',
        position: 'relative',
    },
    bannerContainer: {
        width: '100%',
        height: 160,
        position: 'relative',
    },
    bannerGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    bannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)', // Oscurecer el banner
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarRow: {
        paddingHorizontal: 16,
        marginTop: -45, // Solapar el banner abajo
        marginBottom: 10,
    },
    avatarWrapper: {
        width: 88,
        height: 88,
        borderRadius: 44,
        padding: 4, // Borde gris o background
        backgroundColor: colors.background,
        position: 'relative',
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 101, 36, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarPlaceholderText: {
        color: colors.primary,
        fontSize: 32,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    avatarOverlay: {
        position: 'absolute',
        top: 4, left: 4, right: 4, bottom: 4,
        borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    formContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 40,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    textInput: {
        color: colors.text,
        fontSize: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 8,
    },
});
