import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { customToastConfig } from '../src/components/CustomToast';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { MuteProvider } from '../src/contexts/MuteContext';
import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '../src/api/apollo.client';
import { AuthProvider } from '../src/features/auth/context/AuthContext';
import notifee, { EventType } from '@notifee/react-native';

// Import background task registry to initialize on startup
import '../src/hooks/useChatBackgroundHandler';

export default function RootLayout() {
  useEffect(() => {
    // 1. Handle app opening from a cold start via Notifee notification press
    notifee.getInitialNotification().then((initialNotif) => {
      if (initialNotif) {
        const data = initialNotif.notification.data;
        if (data?.type === 'CHAT_ROOM' && data?.conversationId) {
          console.log('[Notifee Initial Notification] Tapped conversation:', data.conversationId);
          setTimeout(() => {
            router.push({
              pathname: '/chatRoom',
              params: { conversationId: data.conversationId }
            });
          }, 500); // Small delay to allow navigation context to be ready
        }
      }
    }).catch(err => console.error('Error fetching initial Notifee notification:', err));

    // 2. Handle notification press when app is in foreground/background (warm start)
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        const data = detail.notification?.data;
        if (data?.type === 'CHAT_ROOM' && data?.conversationId) {
          console.log('[Notifee Foreground PRESS] Tapped conversation:', data.conversationId);
          router.push({
            pathname: '/chatRoom',
            params: { conversationId: data.conversationId }
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

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
                <Stack.Screen name="postDetail" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="jobs/create" 
                  options={{ 
                    headerShown: false,
                    presentation: 'fullScreenModal',
                    animation: 'slide_from_bottom'
                  }} 
                />
                <Stack.Screen
                  name="jobs/[id]/applicants"
                  options={{ headerShown: false }}
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
