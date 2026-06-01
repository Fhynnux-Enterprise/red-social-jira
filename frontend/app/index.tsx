import React, { useEffect } from 'react';
import { View } from 'react-native';
import AuthNavigator from '../src/navigation/AuthNavigator';
import AppNavigator from '../src/navigation/AppNavigator';
import { useAuth } from '../src/features/auth/context/AuthContext';
import { useTheme } from '../src/theme/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { usePresencePing } from '../src/hooks/usePresencePing';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import * as SplashScreen from 'expo-splash-screen';

export default function RootNavigator() {
    const { userToken, isLoading } = useAuth();
    const { colors, isDark } = useTheme();

    usePresencePing(!!userToken);
    usePushNotifications(!!userToken);

    useEffect(() => {
        if (!isLoading) {
            // Ocultar el splash screen nativo inmediatamente en cuanto React Native esté listo y cargado
            SplashScreen.hideAsync().catch((err) => {
                console.warn('[SplashScreen] Error al ocultar el splash nativo:', err);
            });
        }
    }, [isLoading]);

    if (isLoading) {
        // Retornamos una vista vacía. El Splash Nativo (con el logo de Chunchi en el centro
        // y el "Powered by FynnuX" abajo de forma nativa) se mantendrá visible arriba de ella.
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }} />
        );
    }

    return (
        <>
            <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
            {userToken ? <AppNavigator /> : <AuthNavigator />}
        </>
    );
}



