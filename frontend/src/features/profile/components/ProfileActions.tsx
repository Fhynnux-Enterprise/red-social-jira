import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';

interface ProfileActionsProps {
    isFollowing: boolean;
    onToggleFollow: () => void;
    onMessage: () => void;
}

export default function ProfileActions({ isFollowing, onToggleFollow, onMessage }: ProfileActionsProps) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    styles.button,
                    isFollowing ? styles.secondaryBtn : styles.primaryBtn
                ]}
                onPress={onToggleFollow}
                activeOpacity={0.8}
            >
                <Text style={[
                    styles.buttonText,
                    isFollowing ? styles.secondaryBtnText : styles.primaryBtnText
                ]}>
                    {isFollowing ? 'Dejar de seguir' : 'Seguir'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.secondaryBtn]}
                onPress={onMessage}
                activeOpacity={0.8}
            >
                <Text style={[styles.buttonText, styles.secondaryBtnText]}>Mensaje</Text>
            </TouchableOpacity>
        </View>
    );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 12, // More gap from Stats
        marginBottom: 24, // More gap towards Bio
        gap: 12,
        justifyContent: 'center',
    },
    button: {
        flex: 1,
        height: 46, // Premium height
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryBtn: {
        backgroundColor: colors.primary, // Back to brand color
    },
    secondaryBtn: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    primaryBtnText: {
        color: '#FFF',
    },
    secondaryBtnText: {
        color: colors.text,
    },
});
