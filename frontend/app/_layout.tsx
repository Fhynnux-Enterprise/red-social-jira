import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';
import { customToastConfig } from '../src/components/CustomToast';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { MuteProvider } from '../src/contexts/MuteContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <MuteProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
        </MuteProvider>
        <Toast config={customToastConfig} position="top" topOffset={60} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
