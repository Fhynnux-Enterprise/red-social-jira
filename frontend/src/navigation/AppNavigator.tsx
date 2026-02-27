import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FeedScreen from '../features/feed/screens/FeedScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import { colors } from '../theme/colors';

export type AppTabParamList = {
    Feed: undefined;
    Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppNavigator() {
    const insets = useSafeAreaInsets();

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
                tabBarInactiveTintColor: colors.dark.textSecondary,
                tabBarStyle: {
                    backgroundColor: colors.dark.surface,
                    borderTopColor: colors.dark.border,
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
