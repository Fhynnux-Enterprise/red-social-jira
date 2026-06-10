import React from 'react';
import { Platform, View, StyleSheet, Text, Image, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import FeedScreen from '../features/feed/screens/FeedScreen';
import PostDetailScreen from '../features/feed/screens/PostDetailScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import EditProfileScreen from '../features/profile/screens/EditProfileScreen';
import ChatListScreen from '../features/chat/screens/ChatListScreen';
import ChatRoomScreen from '../features/chat/screens/ChatRoomScreen';
import ChatDetailsScreen from '../features/chat/screens/ChatDetailsScreen';
import NewChatScreen from '../features/chat/screens/NewChatScreen';
import ChatBotScreen from '../features/chat/screens/ChatBotScreen';
import StoryViewerScreen from '../features/stories/screens/StoryViewerScreen';
import JobsScreen from '../features/jobs/screens/JobsScreen';
import StoreScreen from '../features/store/screens/StoreScreen';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import ModerationScreen from '../features/moderation/screens/ModerationScreen';
import AdminScreen from '../features/moderation/screens/AdminScreen';
import BannedScreen from '../features/auth/screens/BannedScreen';
import { useTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useSubscription } from '@apollo/client/react';
import { GET_USER_CONVERSATIONS, INBOX_UPDATE_SUBSCRIPTION } from '../features/chat/graphql/chat.operations';
import { GET_UNREAD_NOTIFICATIONS_COUNT, NOTIFICATION_ADDED_SUBSCRIPTION } from '../features/notifications/graphql/notifications.operations';
import { useAuth } from '../features/auth/context/AuthContext';

export type AppStackParamList = {
    MainTabs: { screen?: string; params?: any } | undefined;
    EditProfile: undefined;
    ChatRoom: { conversationId: string; activateSearch?: boolean };
    ChatDetails: { conversationId: string };
    NewChat: undefined;
    Profile: { userId?: string } | undefined;
    StoryViewer: { userId: string; initialStoryId?: string };
    Moderation: { initialTab?: string } | undefined;
    Admin: undefined;
    PostDetail: { postId: string; isStore?: boolean };
};

export type AppTabParamList = {
    Feed: undefined;
    Jobs: undefined;
    Store: undefined;
    ChatBot: undefined;
    ChatList: undefined;
    Notifications: undefined;
    Profile: { userId?: string } | undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

interface CustomTabBarButtonProps {
    children?: React.ReactNode;
    onPress?: (event: any) => void;
    accessibilityState?: any;
    style?: any;
}

const CustomTabBarButton: React.FC<CustomTabBarButtonProps> = ({ onPress, accessibilityState, style }) => {
    const { colors, isDark } = useTheme();
    const focused = accessibilityState?.selected;
    return (
        <TouchableOpacity
            style={[style, styles.customButtonContainer]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <View style={[styles.customButtonOutline, { backgroundColor: colors.surface, shadowColor: '#000' }]}>
                <LinearGradient
                    colors={focused 
                        ? [colors.primary, colors.secondary, colors.accent] 
                        : [isDark ? '#2A2A2A' : '#EAEAEA', isDark ? '#3A3A3A' : '#F2F2F2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.customButton}
                >
                    <Image 
                        source={require('../../assets/chunchi-city-images/fynnux-corte-512x512.png')} 
                        style={{ 
                            width: 38,
                            height: 38,
                            resizeMode: 'contain',
                            alignSelf: 'center',
                            opacity: focused ? 1 : 0.7,
                            tintColor: focused ? undefined : colors.textSecondary,
                        }} 
                    />
                </LinearGradient>
            </View>
        </TouchableOpacity>
    );
};

const ProfileTabBarButton: React.FC<CustomTabBarButtonProps> = ({ onPress, accessibilityState, style }) => {
    const { colors, isDark } = useTheme();
    const { user } = useAuth() as any;
    const focused = accessibilityState?.selected;
    const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U' : 'U';

    return (
        <TouchableOpacity
            style={[style, styles.profileTabButtonContainer]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            {user?.photoUrl ? (
                <LinearGradient
                    colors={focused 
                        ? [colors.primary, colors.secondary, colors.accent] 
                        : [colors.border, colors.border]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.profileTabButtonOutlineGradient}
                >
                    <View style={[styles.profileTabButtonInner, { backgroundColor: colors.surface }]}>
                        <Image 
                            source={{ uri: user.photoUrl }} 
                            style={styles.profileTabButtonImage} 
                        />
                    </View>
                </LinearGradient>
            ) : (
                <View style={[
                    styles.profileTabButtonOutline,
                    { 
                        borderWidth: focused ? 0 : 2,
                        borderColor: colors.border,
                        backgroundColor: isDark ? 'rgba(255, 101, 36, 0.15)' : 'rgba(255, 101, 36, 0.08)' 
                    }
                ]}>
                    {focused && (
                        <LinearGradient
                            colors={[colors.primary, colors.secondary, colors.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                        />
                    )}
                    <Text style={[
                        styles.profileTabButtonInitials, 
                        { color: focused ? '#FFFFFF' : colors.textSecondary }
                    ]}>
                        {initials}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

function MainTabNavigator() {
    const insets = useSafeAreaInsets();
    const { colors, isDark, appTheme } = useTheme();
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

    const { data: notifData, refetch: refetchNotifCount } = useQuery<any>(GET_UNREAD_NOTIFICATIONS_COUNT, {
        skip: !user,
        pollInterval: 15000, // Refrescar cada 15 segundos
        fetchPolicy: 'cache-and-network',
    });

    useSubscription(NOTIFICATION_ADDED_SUBSCRIPTION, {
        skip: !user || !user?.id,
        variables: { userId: user?.id },
        onData: () => {
            refetchNotifCount();
        }
    });

    const unreadNotificationsCount = notifData?.getUnreadNotificationsCount || 0;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'home';
                     if (route.name === 'Feed') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Jobs') {
                        iconName = focused ? 'business' : 'business-outline';
                    } else if (route.name === 'Store') {
                        iconName = focused ? 'pricetags' : 'pricetags-outline';
                    } else if (route.name === 'ChatBot') {
                        iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
                    } else if (route.name === 'ChatList') {
                        iconName = focused ? 'paper-plane' : 'paper-plane-outline';
                    } else if (route.name === 'Notifications') {
                        iconName = focused ? 'notifications' : 'notifications-outline';
                    }

                    const icon = <Ionicons name={iconName} size={24} color={focused ? 'white' : color} />;

                    if (focused) {
                        const gradientColors: [string, string, string] = [colors.primary, colors.secondary, colors.accent];
                        const locations: [number, number, number] = [0, 0.95, 1];

                        return (
                            <MaskedView maskElement={<View style={styles.iconCenterer}>{icon}</View>}>
                                <LinearGradient
                                    colors={gradientColors}
                                    locations={locations}
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
                        const labelGradientColors: [string, string, string] = [colors.primary, colors.secondary, colors.accent];
                        const labelLocations: [number, number, number] = [0, 0.95, 1];

                        return (
                            <MaskedView maskElement={<View style={styles.labelMaskContainer}>{label}</View>}>
                                <LinearGradient
                                    colors={labelGradientColors}
                                    locations={labelLocations}
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
                    minHeight: Platform.OS === 'ios' ? 90 : 70 + insets.bottom,
                    paddingBottom: Platform.OS === 'ios' ? 30 : Math.max(insets.bottom, 12) + 8,
                    paddingTop: 8,
                    elevation: 8,
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                },
                tabBarIconStyle: {
                    marginTop: 2, // Desplazado 2px hacia abajo
                    width: 30,
                    height: 30,
                    justifyContent: 'center',
                    alignItems: 'center',
                }
            })}
        >
            <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarLabel: 'Inicio' }} />
            <Tab.Screen name="Jobs" component={JobsScreen} options={{ tabBarLabel: 'Empleo' }} />
            <Tab.Screen name="Store" component={StoreScreen} options={{ tabBarLabel: 'Tienda' }} />
            <Tab.Screen 
                name="ChatBot" 
                component={ChatBotScreen} 
                options={{ 
                    tabBarLabel: 'IA',
                    tabBarButton: (props) => <CustomTabBarButton {...props} />,
                    tabBarHideOnKeyboard: true
                }} 
            />
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
                name="Notifications" 
                component={NotificationsScreen} 
                options={{ 
                    tabBarLabel: 'Avisos',
                    tabBarBadge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
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
                        lineHeight: Platform.OS === 'ios' ? 18 : 16,
                        padding: 0,
                    }
                }} 
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ 
                    tabBarLabel: () => null,
                    tabBarButton: (props) => <ProfileTabBarButton {...props} />
                }}
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
    const { banInfo, signOut } = useAuth() as any;

    // Si el usuario está baneado, mostrar la pantalla de castigo en lugar de la app
    if (banInfo) {
        return (
            <BannedScreen
                bannedUntil={banInfo.bannedUntil}
                banReason={banInfo.banReason}
                onSignOut={signOut}
            />
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            <Stack.Screen name="ChatDetails" component={ChatDetailsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen 
                name="NewChat" 
                component={NewChatScreen} 
                options={{ 
                    presentation: 'fullScreenModal',
                    animation: 'slide_from_bottom' 
                }} 
            />
            <Stack.Screen 
                name="StoryViewer" 
                component={StoryViewerScreen} 
                options={{ 
                    presentation: 'fullScreenModal',
                    animation: 'fade' 
                }} 
            />
            <Stack.Screen
                name="Moderation"
                component={ModerationScreen}
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="Admin"
                component={AdminScreen}
                options={{ animation: 'slide_from_right' }}
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
    },
    profileTabButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        margin: 0,
        padding: 0,
        alignSelf: 'stretch',
        flex: 1,
        height: '100%',
        top: Platform.OS === 'ios' ? 8 : 6, // Desplazado 2px hacia abajo (antes era 6 : 4)
    },
    profileTabButtonOutlineGradient: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 3, // Anillo de selección de 3px, visible y nítido
    },
    profileTabButtonInner: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderRadius: 21, // Concentricidad perfecta: 24 (radio externo) - 3 (ancho de borde)
        overflow: 'hidden',
    },
    profileTabButtonOutline: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileTabButtonImage: {
        width: '100%',
        height: '100%',
    },
    profileTabButtonInitials: {
        fontSize: 15,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    customButtonContainer: {
        top: Platform.OS === 'ios' ? 0 : 2, // Desplazado 2px hacia abajo (antes era -2 : 0)
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        margin: 0,
        padding: 0,
        alignSelf: 'stretch',
        flex: 1,
    },
    customButtonOutline: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center', // Asegura el centrado exacto en la cuadrícula horizontal
        elevation: 3,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    customButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
