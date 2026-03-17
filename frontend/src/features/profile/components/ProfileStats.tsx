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
        <View style={styles.statsCardWrapper}>
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{followersCount}</Text>
                    <Text style={styles.statLabel}>Seguidores</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{followingCount}</Text>
                    <Text style={styles.statLabel}>Siguiendo</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{postsCount}</Text>
                    <Text style={styles.statLabel}>Publicaciones</Text>
                </View>
            </View>
        </View>
    );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    statsCardWrapper: {
        backgroundColor: colors.surface,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statsCard: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 20,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    statDivider: {
        width: 1,
        height: '70%',
        backgroundColor: colors.border,
    },
});
