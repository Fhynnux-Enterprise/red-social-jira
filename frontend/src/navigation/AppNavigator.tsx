import React from 'react';
import { Platform, View, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import FeedScreen from '../features/feed/screens/FeedScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import EditProfileScreen from '../features/profile/screens/EditProfileScreen';
import ChatListScreen from '../features/chat/screens/ChatListScreen';
import ChatRoomScreen from '../features/chat/screens/ChatRoomScreen';
import ChatDetailsScreen from '../features/chat/screens/ChatDetailsScreen';
import NewChatScreen from '../features/chat/screens/NewChatScreen';
import { useTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useSubscription } from '@apollo/client/react';
import { GET_USER_CONVERSATIONS, INBOX_UPDATE_SUBSCRIPTION } from '../features/chat/graphql/chat.operations';
import { useAuth } from '../features/auth/context/AuthContext';

export type AppStackParamList = {
    MainTabs: { screen?: string; params?: any } | undefined;
    EditProfile: undefined;
    ChatRoom: { id_conversation: string; activateSearch?: boolean };
    ChatDetails: { id_conversation: string };
    NewChat: undefined;
    Profile: { userId?: string } | undefined;
};

export type AppTabParamList = {
    Feed: undefined;
    ChatList: undefined;
    Profile: { userId?: string } | undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

function MainTabNavigator() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const { user } = useAuth() as any;

    // Obtener conversaciones para calcular el total de mensajes no leídos
    const { data: convData, refetch } = useQuery<any>(GET_USER_CONVERSATIONS, {
        skip: !user,
        fetchPolicy: 'cache-and-network',
    });

    // Suscribirse a nuevos mensajes para actualizar el badge en tiempo real
    useSubscription(INBOX_UPDATE_SUBSCRIPTION, {
        skip: !user,
        onData: () => {
            refetch();
        }
    });

    const totalUnread = React.useMemo(() => {
        if (!convData?.getUserConversations) return 0;
        return convData.getUserConversations.reduce((acc: number, conv: any) => acc + (conv.unreadCount || 0), 0);
    }, [convData]);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'home';

                    if (route.name === 'Feed') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'ChatList') {
                        iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    const icon = <Ionicons name={iconName} size={24} color={focused ? 'white' : color} />;

                    if (focused) {
                        return (
                            <MaskedView maskElement={<View style={styles.iconCenterer}>{icon}</View>}>
                                <LinearGradient
                                    colors={['#BF360C', '#FF5722', '#FF9800']} // De naranja tierra profundo a naranja fuego a naranja vibrante
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 0.7, y: 0.7 }}
                                    style={{ width: 30, height: 30 }}
                                />
                            </MaskedView>
                        );
                    }

                    return icon;
                },
                tabBarLabel: ({ focused, color, children }) => {
                    const label = (
                        <Text style={[styles.tabLabel, { color: focused ? 'white' : colors.textSecondary }]}>
                            {children}
                        </Text>
                    );

                    if (focused) {
                        return (
                            <MaskedView maskElement={<View style={styles.labelMaskContainer}>{label}</View>}>
                                <LinearGradient
                                    colors={['#BF360C', '#FF5722', '#FBC02D']} // Naranja rojizo -> naranja fuego -> ámbar
                                    start={{ x: 0.2, y: 0 }}
                                    end={{ x: 0.8, y: 0 }}
                                    style={{ width: 80, height: 20 }}
                                />
                            </MaskedView>
                        );
                    }

                    return label;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    backgroundColor: colors.surface,
                    minHeight: Platform.OS === 'ios' ? 92 : 72 + insets.bottom,
                    paddingBottom: Platform.OS === 'ios' ? 32 : Math.max(insets.bottom, 12) + 10,
                    paddingTop: 8,
                    elevation: 8,
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                },
                tabBarIconStyle: {
                    marginTop: 0,
                    width: 30,
                    height: 30,
                    justifyContent: 'center',
                    alignItems: 'center',
                }
            })}
        >
            <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarLabel: 'Inicio' }} />
            <Tab.Screen 
                name="ChatList" 
                component={ChatListScreen} 
                options={{ 
                    tabBarLabel: 'Mensajes',
                    tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
                    tabBarBadgeStyle: {
                        backgroundColor: '#FF3B30',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 'bold',
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        textAlign: 'center',
                        textAlignVertical: 'center',
                        lineHeight: Platform.OS === 'ios' ? 18 : 16, // El lineHeight ayuda mucho en iOS
                        padding: 0,
                    }
                }} 
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ tabBarLabel: 'Perfil' }}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('Profile', { userId: undefined });
                    },
                })}
            />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            <Stack.Screen name="ChatDetails" component={ChatDetailsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen 
                name="NewChat" 
                component={NewChatScreen} 
                options={{ 
                    presentation: 'fullScreenModal',
                    animation: 'slide_from_bottom' 
                }} 
            />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    iconCenterer: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    labelMaskContainer: {
        width: 80,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
