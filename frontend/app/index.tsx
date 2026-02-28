import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import AuthNavigator from '../src/navigation/AuthNavigator';
import AppNavigator from '../src/navigation/AppNavigator';
import { AuthProvider, useAuth } from '../src/features/auth/context/AuthContext';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '../src/api/apollo.client';
import { useTheme } from '../src/theme/ThemeContext';
import { colors as baseColors } from '../src/theme/colors';
import { StatusBar } from 'expo-status-bar';

function RootNavigator() {
    const { userToken, isLoading } = useAuth();
    const { colors, isDark } = useTheme();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={baseColors.primary} />
            </View>
        );
    }

    return (
        <>
            <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
            {userToken ? <AppNavigator /> : <AuthNavigator />}
        </>
    );
}

export default function App() {
    return (
        <ApolloProvider client={apolloClient}>
            <AuthProvider>
                <RootNavigator />
            </AuthProvider>
        </ApolloProvider>
    );
}
