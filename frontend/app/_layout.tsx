import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';
import { customToastConfig } from '../src/components/CustomToast';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { MuteProvider } from '../src/contexts/MuteContext';
import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '../src/api/apollo.client';
import { AuthProvider } from '../src/features/auth/context/AuthContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <ThemeProvider>
            <MuteProvider>
              <Stack screenOptions={{ animation: 'slide_from_right' }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="search" options={{ headerShown: false }} />
                <Stack.Screen name="profile" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="jobs/create" 
                  options={{ 
                    headerShown: false,
                    presentation: 'fullScreenModal',
                    animation: 'slide_from_bottom'
                  }} 
                />
              </Stack>
            </MuteProvider>
            <Toast config={customToastConfig} position="top" topOffset={60} />
          </ThemeProvider>
        </AuthProvider>
      </ApolloProvider>
    </GestureHandlerRootView>
  );
}
