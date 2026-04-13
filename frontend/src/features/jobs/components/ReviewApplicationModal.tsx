import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { UPDATE_APPLICATION_STATUS, GET_JOB_APPLICATIONS } from '../graphql/jobs.operations';
import { GET_OR_CREATE_CHAT } from '../../chat/graphql/chat.operations';

interface Application {
    id: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    message?: string;
    contactPhone?: string;
    cvUrl?: string; // We'll map this via the server usually, but we need the presigned GET url.
    // However, the backend is not yet returning cvPublicUrl in GET_JOB_APPLICATIONS. 
    // Wait, the prompt says application.cvUrl is the public URL? The prompt said: "use Linking.openURL(application.cvPublicUrl)".
    // So we'll assume there's a cvUrl or cvPublicUrl on the application object.
    cvPublicUrl?: string;
    createdAt: string;
    applicant: {
        id: string;
        firstName: string;
        lastName: string;
        photoUrl?: string;
    };
}

interface ReviewApplicationModalProps {
    visible: boolean;
    onClose: () => void;
    application: Application | null;
}

export default function ReviewApplicationModal({ visible, onClose, application }: ReviewApplicationModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const navigation = useNavigation();
    
    const [updateStatus, { loading }] = useMutation(UPDATE_APPLICATION_STATUS, {
        refetchQueries: ['GetJobApplications'], 
        // Note: The parent screen passes jobOfferId so refetch should work or just use 'GetJobApplications' name
    });
    const [getOrCreateChat] = useMutation(GET_OR_CREATE_CHAT);

    if (!visible || !application) return null;

    const handleAction = async (status: 'ACCEPTED' | 'REJECTED' | 'PENDING') => {
        try {
            await updateStatus({
                variables: {
                    input: {
                        applicationId: application.id,
                        status,
                    }
                }
            });
            onClose();
        } catch (e) {
            console.error('Error updating status', e);
        }
    };

    const handleWhatsApp = async () => {
        const rawPhone = (application.contactPhone ?? '').replace(/\s+/g, '').replace(/[^+\d]/g, '');
        if (!rawPhone) {
            Toast.show({ type: 'error', text1: 'Sin número', text2: 'Este candidato no proporcionó un número de teléfono.' });
            return;
        }
        const phone = rawPhone.startsWith('+') ? rawPhone.slice(1) : rawPhone;
        const waUrl  = `whatsapp://send?phone=${phone}`;
        const webUrl = `https://wa.me/${phone}`;

        try {
            const supported = await Linking.canOpenURL(waUrl);
            if (supported) {
                await Linking.openURL(waUrl);
            } else {
                await Linking.openURL(webUrl);
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'No se pudo abrir WhatsApp',
            });
        }
    };

    const handleViewCV = () => {
        // Fallback to cvUrl if cvPublicUrl isn't directly available but the prompt asked for cvPublicUrl
        const urlToOpen = (application as any).cvPublicUrl || application.cvUrl;
        if (urlToOpen) {
            Linking.openURL(urlToOpen);
        }
    };

    const handlePrivateMessage = async () => {
        try {
            const { data } = await getOrCreateChat({
                variables: { targetUserId: application.applicant.id }
            });
            const conversationId = data.getOrCreateOneOnOneChat.id;
            router.push({ pathname: '/chatRoom', params: { conversationId } });
            onClose();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo abrir el chat.' });
        }
    };

    return (
        <View style={StyleSheet.absoluteFill}>
            <View style={[styles.backdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]} />
            <View style={styles.modalWrapper}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Detalle de la Postulación</Text>
                        <TouchableOpacity onPress={onClose} disabled={loading} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.applicantInfo}
                        activeOpacity={0.7}
                        onPress={() => {
                            onClose();
                            router.push({ pathname: '/profile', params: { userId: application.applicant.id } });
                        }}
                    >
                        <View style={styles.avatarWrap}>
                            {application.applicant.photoUrl ? (
                                <Image source={{ uri: application.applicant.photoUrl }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarInitials}>
                                    {application.applicant.firstName[0]}{application.applicant.lastName[0]}
                                </Text>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.applicantName, { color: colors.text }]}>
                                {application.applicant.firstName} {application.applicant.lastName}
                            </Text>
                            <Text style={[styles.applicantStatus, { color: application.status === 'ACCEPTED' ? '#4CAF50' : application.status === 'REJECTED' ? '#F44336' : '#FF9800' }]}>
                                Estado: {application.status === 'ACCEPTED' ? 'Aceptado' : application.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {application.message && (
                        <View style={styles.messageSection}>
                            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Carta de presentación</Text>
                            <View style={[styles.messageBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Text style={[styles.messageText, { color: colors.text }]}>{application.message}</Text>
                            </View>
                        </View>
                    )}

                    {((application as any).cvPublicUrl || application.cvUrl) && (
                        <TouchableOpacity 
                            style={[styles.cvBtn, { backgroundColor: 'rgba(255,101,36,0.1)', borderColor: '#FF6524' }]}
                            onPress={handleViewCV}
                        >
                            <Ionicons name="document-text" size={24} color="#FF6524" />
                            <Text style={[styles.cvBtnText, { color: '#FF6524' }]}>Ver Hoja de Vida</Text>
                            <Ionicons name="open-outline" size={18} color="#FF6524" />
                        </TouchableOpacity>
                    )}

                    {/* Botones de Contacto */}
                    <View style={styles.contactRow}>
                        {application.contactPhone && (
                            <TouchableOpacity
                                style={[styles.contactBtn, { backgroundColor: '#25D366', borderColor: '#25D366' }]}
                                onPress={handleWhatsApp}
                            >
                                <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
                                <Text style={[styles.contactBtnText, { color: '#FFF' }]} numberOfLines={1}>WhatsApp</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.contactBtn, { backgroundColor: '#FF6524', borderColor: '#FF6524' }]}
                            onPress={handlePrivateMessage}
                        >
                            <Ionicons name="chatbubbles-outline" size={20} color="#FFF" />
                            <Text style={[styles.contactBtnText, { color: '#FFF' }]} numberOfLines={1}>Mensaje Privado</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actions}>
                        {/* Rechazar */}
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn, application.status === 'REJECTED' && styles.actionBtnActive]}
                            onPress={() => handleAction('REJECTED')}
                            disabled={loading || application.status === 'REJECTED'}
                        >
                            {loading
                                ? <ActivityIndicator size="small" color="#FFF" />
                                : <>
                                    <Ionicons name="close-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                    <Text style={[styles.actionBtnText, { opacity: application.status === 'REJECTED' ? 0.6 : 1 }]}>Rechazar</Text>
                                  </>
                            }
                        </TouchableOpacity>

                        {/* Pendiente */}
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.pendingBtn, application.status === 'PENDING' && styles.actionBtnActive]}
                            onPress={() => handleAction('PENDING')}
                            disabled={loading || application.status === 'PENDING'}
                        >
                            {loading
                                ? <ActivityIndicator size="small" color="#FFF" />
                                : <>
                                    <Ionicons name="time-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                    <Text style={[styles.actionBtnText, { opacity: application.status === 'PENDING' ? 0.6 : 1 }]}>Pendiente</Text>
                                  </>
                            }
                        </TouchableOpacity>

                        {/* Aceptar */}
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn, application.status === 'ACCEPTED' && styles.actionBtnActive]}
                            onPress={() => handleAction('ACCEPTED')}
                            disabled={loading || application.status === 'ACCEPTED'}
                        >
                            {loading
                                ? <ActivityIndicator size="small" color="#FFF" />
                                : <>
                                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                    <Text style={[styles.actionBtnText, { opacity: application.status === 'ACCEPTED' ? 0.6 : 1 }]}>Aceptar</Text>
                                  </>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    applicantInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarWrap: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,101,36,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarInitials: {
        color: '#FF6524',
        fontSize: 18,
        fontWeight: '700',
    },
    applicantName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    applicantStatus: {
        fontSize: 13,
        fontWeight: '600',
    },
    messageSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    messageBox: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    cvBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 14,
        marginBottom: 24,
        gap: 8,
    },
    cvBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
    },
    rejectBtn: {
        backgroundColor: '#F44336',
    },
    pendingBtn: {
        backgroundColor: '#FF9800',
    },
    actionBtnActive: {
        opacity: 0.5,
    },
    contactRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    contactBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 6,
    },
    contactBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    acceptBtn: {
        backgroundColor: '#4CAF50',
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
