export const palettes = {
    mountain: {
        primary: '#00b341',
        secondary: '#92d050',
        primaryLight: '#a8e61d',
        primaryDark: '#007a33',
        accent: '#ccff00',
    },
    sunset: {
        primary: '#ff6524',
        secondary: '#ffc31f',
        primaryLight: '#ff844f',
        primaryDark: '#cc501c',
        accent: '#ffcc00',
    },
    ocean: {
        primary: '#00ACC1',
        secondary: '#4DD0E1',
        primaryLight: '#80DEEA',
        primaryDark: '#00838F',
        accent: '#B2EBF2',
    }
};

export const colors = {
    // Estos se mantendrán como "punteros" que el ThemeContext actualizará
    primary: palettes.mountain.primary,
    secondary: palettes.mountain.secondary,
    primaryLight: palettes.mountain.primaryLight,
    primaryDark: palettes.mountain.primaryDark,
    accent: palettes.mountain.accent,

    light: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#1A1A1A',
        textSecondary: '#666666',
        border: '#E0E0E0',
        error: '#B00020',
    },
    dark: {
        background: '#000000',
        surface: '#060606ff',
        text: '#FFFFFF',
        textSecondary: '#808080',
        border: '#121212',
        error: '#CF6679',
    },
};
