import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@apollo/client';
import { ProfileService, UserProfile, UserCustomField, UserBadge } from '../services/profile.service';
import { ADD_CUSTOM_FIELD, DELETE_CUSTOM_FIELD, UPDATE_CUSTOM_FIELD, UPDATE_PROFILE, UPDATE_BADGE } from '../graphql/profile.operations';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { colors as baseColors } from '../../../theme/colors';
import Toast from 'react-native-toast-message';

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

    const [newFieldTitle, setNewFieldTitle] = useState('');
    const [newFieldValue, setNewFieldValue] = useState('');
    const [isCustomFieldsModalVisible, setIsCustomFieldsModalVisible] = useState(false);
    const [isBadgeModalVisible, setIsBadgeModalVisible] = useState(false);
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

    const [addCustomFieldMutation, { loading: isAddingField }] = useMutation(ADD_CUSTOM_FIELD);
    const [updateCustomFieldMutation, { loading: isUpdatingField }] = useMutation(UPDATE_CUSTOM_FIELD);
    const [deleteCustomFieldMutation, { loading: isDeletingField }] = useMutation(DELETE_CUSTOM_FIELD);

    const [updateProfileMutation] = useMutation(UPDATE_PROFILE);
    const [updateBadgeMutation, { loading: isUpdatingBadge }] = useMutation(UPDATE_BADGE);

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

    const handleSaveBadge = async () => {
        try {
            await updateBadgeMutation({
                variables: {
                    title: formData.badgeTitle,
                    theme: 'default'
                }
            });
            Toast.show({ type: 'success', text1: '¡Actualizado!', text2: 'Insignia modificada con éxito' });
            setIsBadgeModalVisible(false);
        } catch (error: any) {
            console.log('Error updating badge:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'No se pudo actualizar la insignia' });
        }
    };

    const handleAddCustomField = async () => {
        if (!newFieldTitle.trim() || !newFieldValue.trim()) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'El título y valor son obligatorios' });
            return;
        }

        if (formData.customFields.length >= 5) {
            Toast.show({ type: 'error', text1: 'Límite alcanzado', text2: 'Solo puedes tener hasta 5 campos personalizados.' });
            return;
        }

        if (editingFieldId) {
            try {
                const { data } = await updateCustomFieldMutation({
                    variables: {
                        id: editingFieldId,
                        title: newFieldTitle,
                        value: newFieldValue
                    }
                });
                if (data?.updateCustomField) {
                    setFormData(prev => ({
                        ...prev,
                        customFields: prev.customFields.map(f => f.id === editingFieldId ? data.updateCustomField : f)
                    }));
                    setNewFieldTitle('');
                    setNewFieldValue('');
                    setEditingFieldId(null);
                    Toast.show({ type: 'success', text1: '¡Actualizado!', text2: 'Campo personalizado modificado con éxito' });
                }
            } catch (error: any) {
                console.log('Error updating custom field:', error);
                Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'No se pudo actualizar el campo' });
            }
        } else {
            try {
                const { data } = await addCustomFieldMutation({
                    variables: {
                        title: newFieldTitle,
                        value: newFieldValue
                    }
                });

                if (data?.addCustomField) {
                    setFormData(prev => ({
                        ...prev,
                        customFields: [...prev.customFields, data.addCustomField]
                    }));
                    setNewFieldTitle('');
                    setNewFieldValue('');
                    Toast.show({ type: 'success', text1: '¡Añadido!', text2: 'Campo personalizado guardado con éxito' });
                }
            } catch (error: any) {
                console.log('Error adding custom field:', error);
                Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'No se pudo guardar el campo' });
            }
        }
    };

    const handleDeleteCustomField = async (id: string) => {
        try {
            const { data } = await deleteCustomFieldMutation({ variables: { id } });
            if (data?.deleteCustomField) {
                setFormData(prev => ({
                    ...prev,
                    customFields: prev.customFields.filter(f => f.id !== id)
                }));
                Toast.show({ type: 'success', text1: 'Eliminado', text2: 'Campo personalizado borrado' });
            }
        } catch (error: any) {
            console.log('Error deleting custom field:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'No se pudo eliminar el campo' });
        }
    };

    const handleEditInitiate = (field: UserCustomField) => {
        setEditingFieldId(field.id);
        setNewFieldTitle(field.title);
        setNewFieldValue(field.value);
    };

    const handleCancelEdit = () => {
        setEditingFieldId(null);
        setNewFieldTitle('');
        setNewFieldValue('');
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
                    <View style={styles.sectionDivider} />
                    <TouchableOpacity
                        style={styles.openModalButton}
                        onPress={() => setIsBadgeModalVisible(true)}
                    >
                        <View>
                            <Text style={styles.sectionTitle}>Título / Insignia</Text>
                            <Text style={styles.openModalSubtext}>
                                {formData.badgeTitle || 'Sin insignia definida'}
                            </Text>
                        </View>
                        <Ionicons name="medal-outline" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* SECCIÓN CAMPOS PERSONALIZADOS (DINÁMICA) */}
                    <View style={styles.sectionDivider} />
                    <TouchableOpacity
                        style={styles.openModalButton}
                        onPress={() => setIsCustomFieldsModalVisible(true)}
                    >
                        <View>
                            <Text style={styles.sectionTitle}>Campos Personalizados</Text>
                            <Text style={styles.openModalSubtext}>
                                {formData.customFields.length} de 5 campos añadidos
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>

                </View>
            </ScrollView>

            {/* MODAL PARA GESTIONAR CAMPOS PERSONALIZADOS */}
            <Modal
                visible={isCustomFieldsModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => {
                    setIsCustomFieldsModalVisible(false);
                    handleCancelEdit();
                }}
            >
                <KeyboardAvoidingView
                    style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Campos personalizados</Text>
                        <TouchableOpacity onPress={() => { setIsCustomFieldsModalVisible(false); handleCancelEdit(); }}>
                            <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                        {formData.customFields.length === 0 && (
                            <Text style={styles.emptyFieldsText}>No has añadido ningún campo todavía.</Text>
                        )}

                        {formData.customFields.map((field) => (
                            <View key={field.id} style={styles.modalFieldCard}>
                                <View style={styles.modalFieldContent}>
                                    <Text style={styles.modalFieldTitle}>{field.title}</Text>
                                    <Text style={styles.modalFieldValue} numberOfLines={1}>{field.value}</Text>
                                </View>
                                <View style={styles.modalFieldActions}>
                                    <TouchableOpacity style={styles.modalActionBtn} onPress={() => handleEditInitiate(field)}>
                                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: 'rgba(255, 102, 121, 0.1)' }]} onPress={() => handleDeleteCustomField(field.id)}>
                                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {(formData.customFields.length < 5 || editingFieldId) && (
                            <View style={styles.modalFormContainer}>
                                <View style={styles.modalFormHeader}>
                                    <Text style={styles.modalFormTitle}>
                                        {editingFieldId ? 'Editar campo' : 'Nuevo campo personalizado'}
                                    </Text>
                                    {editingFieldId && (
                                        <TouchableOpacity onPress={handleCancelEdit}>
                                            <Text style={styles.cancelEditText}>Cancelar</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <TextInput
                                    style={styles.modalTextInput}
                                    value={newFieldTitle}
                                    onChangeText={setNewFieldTitle}
                                    placeholder="Nombre. Ej: Instagram, Empresa"
                                    placeholderTextColor={colors.textSecondary}
                                />
                                <TextInput
                                    style={styles.modalTextInput}
                                    value={newFieldValue}
                                    onChangeText={setNewFieldValue}
                                    placeholder="Valor. Ej: @mi_usuario, google.com"
                                    placeholderTextColor={colors.textSecondary}
                                />

                                <TouchableOpacity
                                    style={[styles.modalSaveBtn, (isAddingField || isUpdatingField) && { opacity: 0.5 }]}
                                    onPress={handleAddCustomField}
                                    disabled={isAddingField || isUpdatingField}
                                >
                                    {(isAddingField || isUpdatingField) ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name={editingFieldId ? "save-outline" : "add-circle-outline"} size={20} color="#fff" style={{ marginRight: 6 }} />
                                            <Text style={styles.addFieldBtnText}>
                                                {editingFieldId ? 'Guardar Cambios' : 'Añadir Campo'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL PARA GESTIONAR INSIGNIA */}
            <Modal
                visible={isBadgeModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsBadgeModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Editar Insignia</Text>
                        <TouchableOpacity onPress={() => setIsBadgeModalVisible(false)}>
                            <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                        <View style={styles.modalFormContainer}>
                            <View style={styles.modalFormHeader}>
                                <Text style={styles.modalFormTitle}>Tu Insignia</Text>
                            </View>

                            <TextInput
                                style={styles.modalTextInput}
                                value={formData.badgeTitle}
                                onChangeText={(val) => setFormData({ ...formData, badgeTitle: val })}
                                placeholder="Ej: Ingeniero de Software, CEO, VIP"
                                placeholderTextColor={colors.textSecondary}
                            />

                            <TouchableOpacity
                                style={[styles.modalSaveBtn, isUpdatingBadge && { opacity: 0.5 }]}
                                onPress={handleSaveBadge}
                                disabled={isUpdatingBadge}
                            >
                                {isUpdatingBadge ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                                        <Text style={styles.addFieldBtnText}>Guardar Insignia</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
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
    sectionDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 6,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
    },
    addCustomFieldContainer: {
        marginTop: 10,
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    newFieldInput: {
        color: colors.text,
        fontSize: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 8,
        marginBottom: 12,
    },
    addFieldBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 4,
    },
    addFieldBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    openModalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    openModalSubtext: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    modalScrollView: {
        flex: 1,
        padding: 20,
    },
    emptyFieldsText: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginVertical: 20,
        fontSize: 16,
    },
    modalFieldCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalFieldContent: {
        flex: 1,
    },
    modalFieldTitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    modalFieldValue: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    modalFieldActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
    },
    modalActionBtn: {
        padding: 8,
        backgroundColor: colors.background,
        borderRadius: 8,
        marginLeft: 8,
    },
    modalFormContainer: {
        marginTop: 20,
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 40,
    },
    modalFormHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalFormTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    cancelEditText: {
        color: colors.error,
        fontWeight: 'bold',
    },
    modalTextInput: {
        color: colors.text,
        fontSize: 15,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
        backgroundColor: colors.background,
    },
    modalSaveBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 4,
    },
});
