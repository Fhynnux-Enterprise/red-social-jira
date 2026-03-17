import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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

    if (!bio && !phone && (!customFields || customFields.length === 0)) return null;

    return (
        <View style={styles.container}>
            {/* Bio Section */}
            {bio && (
                <View style={styles.section}>
                    <Text style={styles.bioText}>{bio}</Text>
                </View>
            )}

            {/* Info Section (Phone) */}
            {phone && (
                <View style={styles.infoRow}>
                    <View style={styles.iconWrapper}>
                        <Ionicons name="call-outline" size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.infoText}>{phone}</Text>
                </View>
            )}

            {/* Custom Fields */}
            {customFields && customFields.map((field) => (
                <View key={field.id} style={styles.infoRow}>
                    <View style={styles.iconWrapper}>
                        <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.fieldLabel}>{field.title}:</Text>
                    <Text style={styles.fieldText}>{field.value}</Text>
                </View>
            ))}
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
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    section: {
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        paddingLeft: 12,
    },
    bioText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 22,
        textAlign: 'left',
        fontWeight: '500',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: 10,
        gap: 12,
    },
    iconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.background, // Contrast against surface
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text, // Title more prominent
    },
    fieldText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
});
