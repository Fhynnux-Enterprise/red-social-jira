import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { getUserOnlineStatus } from '../../../utils/presence';
import { useTheme } from '../../../theme/ThemeContext';

interface OnlineStatusIndicatorProps {
    lastActiveAt: string | Date | undefined | null;
    showText?: boolean;
    style?: StyleProp<ViewStyle>;
}

export const OnlineStatusIndicator: React.FC<OnlineStatusIndicatorProps> = ({ lastActiveAt, showText = false, style }) => {
    const { colors } = useTheme();
    // Estado local dummy para forzar re-render cada minuto
    const [, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 60000); // 1 minuto
        return () => clearInterval(interval);
    }, []);

    const status = getUserOnlineStatus(lastActiveAt);

    if (showText) {
        return (
            <View style={[styles.container, style]}>
                {status.isOnline && <View style={[styles.dot, { backgroundColor: '#4CD964' }]} />}
                <Text style={[styles.text, { color: colors.textSecondary }]}>{status.text}</Text>
            </View>
        );
    }

    // Modo solo punto (para lista de chats)
    if (!status.isOnline) return null;

    return <View style={[styles.dot, { backgroundColor: '#4CD964', borderColor: colors.background }, style]} />;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        marginRight: 4,
    },
    text: {
        fontSize: 12,
    },
});
