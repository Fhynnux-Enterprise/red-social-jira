import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';

interface ProfileBioProps {
    bio?: string;
    phone?: string;
    customFields?: Array<{ id: string, title: string, value: string }>;
}

export default function ProfileBio({ bio, phone, customFields }: ProfileBioProps) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const handleCallPress = () => {
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        }
    };

    if (!bio && !phone && (!customFields || customFields.length === 0)) return null;

    return (
        <View style={styles.container}>
            {/* Bio Section */}
            {bio && (
                <View style={styles.section}>
                    <Text style={styles.bioText}>{bio}</Text>
                </View>
            )}

            {/* Contact Section (Subtle Phone) */}
            {phone && (
                <View style={styles.contactContainer}>
                    <TouchableOpacity 
                        style={styles.subtleContactRow} 
                        onPress={handleCallPress}
                        activeOpacity={0.6}
                    >
                        <View style={styles.subtleIconWrapper}>
                            <Ionicons name="call" size={14} color={colors.primary} />
                        </View>
                        <View style={styles.contactTextContent}>
                            <Text style={styles.contactLabelSubtle}>Teléfono de contacto</Text>
                            <Text style={styles.phoneValueSubtle}>{phone}</Text>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={16} color={colors.border} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Other Details */}
            {customFields && customFields.length > 0 && (
                <View style={styles.otherFieldsSection}>
                    {customFields.map((field) => (
                        <View key={field.id} style={styles.infoRow}>
                            <View style={styles.subtleIconWrapper}>
                                <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabelSubtle}>{field.title}</Text>
                                <Text style={styles.fieldTextSubtle}>{field.value}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        marginHorizontal: 16,
        padding: 20,
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
        // Premium soft shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
    },
    section: {
        marginBottom: 18,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        paddingLeft: 12,
    },
    bioText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 22,
        fontWeight: '500',
    },
    contactContainer: {
        marginTop: 4,
    },
    subtleContactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
    },
    subtleIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 0.5,
        borderColor: colors.border,
    },
    contactTextContent: {
        flex: 1,
    },
    contactLabelSubtle: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
        marginBottom: 1,
    },
    phoneValueSubtle: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '600',
    },
    otherFieldsSection: {
        marginTop: 4,
        gap: 0,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
    },
    fieldLabelSubtle: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    fieldTextSubtle: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },
});
