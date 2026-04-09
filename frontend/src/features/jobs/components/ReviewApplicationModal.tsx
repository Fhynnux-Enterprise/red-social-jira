import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { UPDATE_APPLICATION_STATUS, GET_JOB_APPLICATIONS } from '../graphql/jobs.operations';

interface Application {
    id_job_application: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    message?: string;
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
    
    const [updateStatus, { loading }] = useMutation(UPDATE_APPLICATION_STATUS, {
        refetchQueries: ['GetJobApplications'], 
        // Note: The parent screen passes jobOfferId so refetch should work or just use 'GetJobApplications' name
    });

    if (!visible || !application) return null;

    const handleAction = async (status: 'ACCEPTED' | 'REJECTED') => {
        try {
            await updateStatus({
                variables: {
                    input: {
                        id_job_application: application.id_job_application,
                        status,
                    }
                }
            });
            onClose();
        } catch (e) {
            console.error('Error updating status', e);
        }
    };

    const handleViewCV = () => {
        // Fallback to cvUrl if cvPublicUrl isn't directly available but the prompt asked for cvPublicUrl
        const urlToOpen = (application as any).cvPublicUrl || application.cvUrl;
        if (urlToOpen) {
            Linking.openURL(urlToOpen);
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

                    <View style={styles.applicantInfo}>
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
                                Estado: {application.status}
                            </Text>
                        </View>
                    </View>

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

                    {application.status === 'PENDING' && (
                        <View style={styles.actions}>
                            <TouchableOpacity 
                                style={[styles.actionBtn, styles.rejectBtn]}
                                onPress={() => handleAction('REJECTED')}
                                disabled={loading}
                            >
                                {loading && <ActivityIndicator size="small" color="#FFF" style={{position: 'absolute'}} />}
                                <Text style={[styles.actionBtnText, { opacity: loading ? 0 : 1 }]}>❌ Rechazar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionBtn, styles.acceptBtn]}
                                onPress={() => handleAction('ACCEPTED')}
                                disabled={loading}
                            >
                                {loading && <ActivityIndicator size="small" color="#FFF" style={{position: 'absolute'}} />}
                                <Text style={[styles.actionBtnText, { opacity: loading ? 0 : 1 }]}>✅ Aceptar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
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
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectBtn: {
        backgroundColor: '#F44336',
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
