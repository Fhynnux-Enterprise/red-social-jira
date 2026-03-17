import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';

interface ProfileStatsProps {
    followersCount: number;
    followingCount: number;
    postsCount: number;
}

export default function ProfileStats({ followersCount, followingCount, postsCount }: ProfileStatsProps) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <View style={styles.container}>
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{postsCount}</Text>
                <Text style={styles.statLabel}>Publicaciones</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{followersCount}</Text>
                <Text style={styles.statLabel}>Seguidores</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{followingCount}</Text>
                <Text style={styles.statLabel}>Seguidos</Text>
            </View>
        </View>
    );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: 18,
        borderBottomWidth: 0.5,
        borderTopWidth: 0.5,
        borderColor: colors.border,
        marginVertical: 16,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 4,
        fontWeight: '600',
    },
    divider: {
        width: 1,
        height: 18,
        backgroundColor: colors.border,
        opacity: 0.6,
    }
});
