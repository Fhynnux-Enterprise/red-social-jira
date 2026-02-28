import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FeedScreen from '../features/feed/screens/FeedScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import EditProfileScreen from '../features/profile/screens/EditProfileScreen';
import { useTheme } from '../theme/ThemeContext';

export type AppStackParamList = {
    MainTabs: undefined;
    EditProfile: undefined;
};

export type AppTabParamList = {
    Feed: undefined;
    Profile: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

function MainTabNavigator() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'home';

                    if (route.name === 'Feed') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={22} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    minHeight: Platform.OS === 'ios' ? 85 : 67 + insets.bottom,
                    paddingBottom: Platform.OS === 'ios' ? 25 : Math.max(insets.bottom, 12) + 10,
                    paddingTop: 8,
                    elevation: 0, // Quita sombra oscura rara en android
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: 'bold',
                    paddingBottom: 4,
                },
                tabBarIconStyle: {
                    marginTop: 0, // Restauramos el margen porque son más pequeños
                }
            })}
        >
            <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarLabel: 'Inicio' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        </Stack.Navigator>
    );
}
