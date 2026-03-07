import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';
import { customToastConfig } from '../src/components/CustomToast';
import { ThemeProvider } from '../src/theme/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <Toast config={customToastConfig} position="top" topOffset={60} />
    </ThemeProvider>
  );
}
