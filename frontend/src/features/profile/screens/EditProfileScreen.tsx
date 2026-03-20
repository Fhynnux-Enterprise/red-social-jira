import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@apollo/client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProfileService, UserCustomField } from '../services/profile.service';
import { UPDATE_PROFILE } from '../graphql/profile.operations';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import Toast from 'react-native-toast-message';
import EditBadgeSection from '../components/EditBadgeSection';
import ManageCustomFieldsSection from '../components/ManageCustomFieldsSection';

// --- Esquema de validación con Zod ---
const editProfileSchema = z.object({
    firstName: z.string().min(1, 'El nombre es requerido'),
    lastName: z.string().min(1, 'El apellido es requerido'),
    username: z
        .string()
        .min(2, 'El nombre de usuario debe tener mínimo 2 caracteres')
        .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos (sin espacios)'),
    phone: z.string().optional(),
    bio: z
        .string()
        .max(250, 'La biografía no puede superar los 250 caracteres')
        .optional(),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const navigation = useNavigation();

    const [isLoading, setIsLoading] = useState(true);
    const [photoUrl, setPhotoUrl] = useState('');
    const [badgeTitle, setBadgeTitle] = useState('');
    const [customFields, setCustomFields] = useState<UserCustomField[]>([]);

    const [updateProfileMutation] = useMutation(UPDATE_PROFILE);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<EditProfileFormData>({
        resolver: zodResolver(editProfileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            username: '',
            phone: '',
            bio: '',
        },
    });

    // Para el contador de caracteres de la bio
    const bioValue = watch('bio') || '';

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await ProfileService.getProfile();
                // Cargamos los datos del perfil en el formulario
                reset({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    username: data.username || '',
                    phone: data.phone || '',
                    bio: data.bio || '',
                });
                setPhotoUrl(data.photoUrl || '');
                setBadgeTitle(data.badge?.title || '');
                setCustomFields(data.customFields || []);
            } catch (error) {
                console.log('Error fetching profile for edit:', error);
                Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar los datos' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const onSubmit = async (data: EditProfileFormData) => {
        try {
            await updateProfileMutation({
                variables: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    bio: data.bio || '',
                    username: data.username,
                    phone: data.phone || '',
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
        }
    };

    const handleBadgeUpdated = (newTitle: string) => setBadgeTitle(newTitle);
    const handleCustomFieldsUpdated = (fields: UserCustomField[]) => setCustomFields(fields);

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
                    <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
                        {isSubmitting ? (
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
                        <View style={styles.bannerOverlay}>
                            <TouchableOpacity style={styles.cameraIconWrapper}>
                                <Ionicons name="camera-outline" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Avatar superpuesto */}
                    <View style={styles.avatarRow}>
                        <View style={styles.avatarWrapper}>
                            {photoUrl ? (
                                <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarPlaceholderText}>
                                        {watch('firstName')?.[0]}{watch('lastName')?.[0]}
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

                    {/* Nombre */}
                    <Controller
                        control={control}
                        name="firstName"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Nombre</Text>
                                <TextInput
                                    style={[styles.textInput, errors.firstName && styles.textInputError]}
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    placeholder="Tu nombre"
                                    placeholderTextColor={colors.textSecondary}
                                    editable={!isSubmitting}
                                />
                                {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
                            </View>
                        )}
                    />

                    {/* Apellido */}
                    <Controller
                        control={control}
                        name="lastName"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Apellido</Text>
                                <TextInput
                                    style={[styles.textInput, errors.lastName && styles.textInputError]}
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    placeholder="Tu apellido"
                                    placeholderTextColor={colors.textSecondary}
                                    editable={!isSubmitting}
                                />
                                {errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}
                            </View>
                        )}
                    />

                    {/* Nombre de usuario */}
                    <Controller
                        control={control}
                        name="username"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Nombre de usuario</Text>
                                <TextInput
                                    style={[styles.textInput, errors.username && styles.textInputError]}
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    placeholder="@usuario"
                                    autoCapitalize="none"
                                    placeholderTextColor={colors.textSecondary}
                                    editable={!isSubmitting}
                                />
                                {errors.username && <Text style={styles.errorText}>{errors.username.message}</Text>}
                            </View>
                        )}
                    />

                    {/* Teléfono */}
                    <Controller
                        control={control}
                        name="phone"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Teléfono</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    placeholder="Ej: +593 99 999 9999"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="phone-pad"
                                    editable={!isSubmitting}
                                />
                            </View>
                        )}
                    />

                    {/* Biografía */}
                    <Controller
                        control={control}
                        name="bio"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={styles.inputGroup}>
                                <View style={styles.bioLabelRow}>
                                    <Text style={styles.inputLabel}>Biografía</Text>
                                    <Text style={[
                                        styles.charCounter,
                                        bioValue.length > 250 && styles.charCounterError
                                    ]}>
                                        {bioValue.length}/250
                                    </Text>
                                </View>
                                <TextInput
                                    style={[styles.textInput, { minHeight: 60 }, errors.bio && styles.textInputError]}
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    multiline
                                    placeholder="Añade tu biografía"
                                    placeholderTextColor={colors.textSecondary}
                                    editable={!isSubmitting}
                                />
                                {errors.bio && <Text style={styles.errorText}>{errors.bio.message}</Text>}
                            </View>
                        )}
                    />

                    {/* SECCIÓN INSIGNIA (BADGE) */}
                    <EditBadgeSection
                        initialBadgeTitle={badgeTitle}
                        onBadgeUpdated={handleBadgeUpdated}
                    />

                    {/* SECCIÓN CAMPOS PERSONALIZADOS (DINÁMICA) */}
                    <ManageCustomFieldsSection
                        initialCustomFields={customFields}
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
    textInputError: {
        borderBottomColor: colors.error,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        marginTop: 4,
    },
    bioLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    charCounter: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    charCounterError: {
        color: colors.error,
    },
});
