import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import AuthNavigator from '../src/navigation/AuthNavigator';
import AppNavigator from '../src/navigation/AppNavigator';
import { AuthProvider, useAuth } from '../src/features/auth/context/AuthContext';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '../src/api/apollo.client';
import { colors } from '../src/theme/colors';

function RootNavigator() {
    const { userToken, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.dark.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return userToken ? <AppNavigator /> : <AuthNavigator />;
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
