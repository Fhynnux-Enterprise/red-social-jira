import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { customToastConfig } from '../src/components/CustomToast';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { MuteProvider } from '../src/contexts/MuteContext';
import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '../src/api/apollo.client';
import { AuthProvider } from '../src/features/auth/context/AuthContext';
import notifee, { EventType } from '@notifee/react-native';

// Prevent the native splash screen from hiding automatically
SplashScreen.preventAutoHideAsync().catch((err) => {
  console.warn('[SplashScreen] preventAutoHideAsync error:', err);
});

// Import background task registry to initialize on startup
import '../src/hooks/useChatBackgroundHandler';

export default function RootLayout() {
  useEffect(() => {
    const handleNotifeeNotificationPress = (data: any, title?: string, body?: string) => {
      if (!data) return;

      console.log('[Notifee Press] Handling data:', data);

      // 1. Chat Room
      if (data.type === 'CHAT_ROOM' && data.conversationId) {
        router.push({
          pathname: '/chatRoom',
          params: { conversationId: data.conversationId }
        });
        return;
      }

      // 2. Post Detail deep linking
      if (data.postId && (
        data.type === 'POST_DETAIL' ||
        data.type === 'STORE_DETAIL' ||
        data.type === 'JOB_DETAIL' ||
        data.type === 'SERVICE_DETAIL'
      )) {
        router.push({
          pathname: '/postDetail',
          params: { 
            postId: data.postId, 
            isStore: data.type === 'STORE_DETAIL' ? 'true' : 'false',
            itemType: data.type
          }
        });
        return;
      }

      // 3. Notification Detail
      if (data.detailed === 'true' || data.detailed === true || (!data.postId && !data.userId && !data.conversationId)) {
        router.push({
          pathname: '/notificationDetail',
          params: { 
            title: title || '', 
            body: body || '', 
            image: data.image || '',
            badgeText: data.badgeText || 'OFICIAL'
          }
        });
        return;
      }

      // 4. User Profile
      if (data.userId && data.type === 'USER_PROFILE') {
        router.push({
          pathname: '/profile',
          params: { userId: data.userId }
        });
      }
    };

    // 1. Handle app opening from a cold start via Notifee notification press
    notifee.getInitialNotification().then((initialNotif) => {
      if (initialNotif) {
        const data = initialNotif.notification.data;
        const title = initialNotif.notification.title;
        const body = initialNotif.notification.body;
        console.log('[Notifee Initial Notification] Tapped notification:', data);
        setTimeout(() => {
          handleNotifeeNotificationPress(data, title, body);
        }, 500); // Small delay to allow navigation context to be ready
      }
    }).catch(err => console.error('Error fetching initial Notifee notification:', err));

    // 2. Handle notification press when app is in foreground/background (warm start)
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        const data = detail.notification?.data;
        const title = detail.notification?.title;
        const body = detail.notification?.body;
        console.log('[Notifee Foreground PRESS] Tapped notification:', data);
        handleNotifeeNotificationPress(data, title, body);
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
                <Stack.Screen name="notificationDetail" options={{ headerShown: false }} />
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
