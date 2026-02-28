import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as appColors } from './colors';

export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemeColors = typeof appColors.dark & {
    primary: string;
    secondary: string;
    primaryLight: string;
    primaryDark: string;
};

interface ThemeContextData {
    themeMode: ThemeMode;
    isDark: boolean;
    colors: ThemeColors;
    setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setMode] = useState<ThemeMode>('system');
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const storedTheme = await AsyncStorage.getItem('@app_theme');
                if (storedTheme) {
                    setMode(storedTheme as ThemeMode);
                }
            } catch (error) {
                console.error('Error loading theme:', error);
            } finally {
                setIsInitialized(true);
            }
        };
        loadTheme();
    }, []);

    const setThemeMode = async (newMode: ThemeMode) => {
        try {
            setMode(newMode);
            await AsyncStorage.setItem('@app_theme', newMode);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    };

    // Resolving exactly if we are currently displaying dark colors
    const isDark = themeMode === 'system'
        ? systemColorScheme === 'dark'
        : themeMode === 'dark';

    const activeTheme = isDark ? appColors.dark : appColors.light;
    const colors: ThemeColors = {
        primary: appColors.primary,
        secondary: appColors.secondary,
        primaryLight: appColors.primaryLight,
        primaryDark: appColors.primaryDark,
        ...activeTheme
    };

    if (!isInitialized) return null; // Avoid flickering on boot

    return (
        <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
