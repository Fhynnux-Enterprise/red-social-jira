import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as appColors, palettes } from './colors';

export type ThemeMode = 'system' | 'light' | 'dark';
export type AppTheme = 'mountain' | 'sunset' | 'ocean';

export type ThemeColors = typeof appColors.dark & {
    primary: string;
    secondary: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    logo: any; // Para cambiar el logo según el tema
};

interface ThemeContextData {
    themeMode: ThemeMode;
    appTheme: AppTheme;
    isDark: boolean;
    colors: ThemeColors;
    setThemeMode: (mode: ThemeMode) => Promise<void>;
    setAppTheme: (theme: AppTheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setMode] = useState<ThemeMode>('system');
    const [appTheme, setAppThemeState] = useState<AppTheme>('mountain');
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const storedTheme = await AsyncStorage.getItem('@app_theme');
                if (storedTheme) {
                    setMode(storedTheme as ThemeMode);
                }
                const storedAppTheme = await AsyncStorage.getItem('@app_color_scheme');
                if (storedAppTheme) {
                    setAppThemeState(storedAppTheme as AppTheme);
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

    const setAppTheme = async (newTheme: AppTheme) => {
        try {
            setAppThemeState(newTheme);
            await AsyncStorage.setItem('@app_color_scheme', newTheme);
        } catch (error) {
            console.error('Error saving app theme:', error);
        }
    };

    // Resolving exactly if we are currently displaying dark colors
    const isDark = themeMode === 'system'
        ? systemColorScheme === 'dark'
        : themeMode === 'dark';

    const activeTheme = isDark ? appColors.dark : appColors.light;
    const palette = palettes[appTheme];

    const colors: ThemeColors = {
        primary: palette.primary,
        secondary: palette.secondary,
        primaryLight: palette.primaryLight,
        primaryDark: palette.primaryDark,
        accent: palette.accent,
        logo: appTheme === 'mountain' 
            ? require('../../assets/images/icon-transparent.png')
            : appTheme === 'sunset'
            ? require('../../assets/images/logo-transparente.png')
            : require('../../assets/images/icon-transparent.png'), // Logo para Océano (puedes cambiarlo luego)
        ...activeTheme
    };

    if (!isInitialized) return null; // Avoid flickering on boot

    return (
        <ThemeContext.Provider value={{ themeMode, appTheme, isDark, colors, setThemeMode, setAppTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
