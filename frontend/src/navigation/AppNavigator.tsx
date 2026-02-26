import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.dark.textSecondary,
                tabBarStyle: {
                    backgroundColor: colors.dark.surface,
                    borderTopColor: colors.dark.border,
                },
            })}
        >
            <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarLabel: 'Inicio' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
        </Tab.Navigator>
    );
}
