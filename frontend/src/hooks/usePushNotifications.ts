import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { router } from 'expo-router';
import { SEND_MESSAGE } from '../features/chat/graphql/chat.operations';
import notifee, { AndroidStyle } from '@notifee/react-native';
import { updateSummaryNotification, resolveAvatarUrl } from './useChatBackgroundHandler';
import { ActiveChatTracker } from '../features/chat/ActiveChatTracker';

const REGISTER_PUSH_TOKEN_MUTATION = gql`
    mutation RegisterPushToken($token: String!, $platform: String) {
        registerPushToken(token: $token, platform: $platform)
    }
`;

// Configuración global para cómo se manejan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        const data = notification?.request?.content?.data as any;
        const isChat = data?.type === 'CHAT_ROOM';
        const isLocal = data?.isLocal === true;

        // Si el usuario está dentro del mismo chat del que llega el mensaje, silenciamos la notificación por completo
        const activeConvId = ActiveChatTracker.getActiveConversationId();
        const isCurrentChat = isChat && activeConvId && data?.conversationId === activeConvId;

        return {
            shouldShowAlert: (!isChat || isLocal) && !isCurrentChat, // Oculta visualmente si es el chat activo
            shouldPlaySound: !isCurrentChat,                         // Silencia el sonido si es el chat activo
            shouldSetBadge: false,
        };
    },
});

// Configuración de la categoría de notificaciones para chat (Respuesta Rápida)
if (Platform.OS !== 'web') {
    Notifications.setNotificationCategoryAsync('chat-message', [
        {
            identifier: 'reply',
            buttonTitle: 'Responder',
            textInput: {
                submitButtonTitle: 'Enviar',
                placeholder: 'Escribe un mensaje...',
            },
            options: {
                opensAppToPerformAction: false,
            },
        },
    ]).catch(err => console.error('Error al configurar la categoría de notificaciones de chat:', err));
}

export const usePushNotifications = (isAuthenticated: boolean) => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
    const [notification, setNotification] = useState<Notifications.Notification | undefined>();
    const notificationListener = useRef<Notifications.Subscription>();
    const responseListener = useRef<Notifications.Subscription>();
    const hasRegistered = useRef(false);

    const [registerPushToken] = useMutation(REGISTER_PUSH_TOKEN_MUTATION);
    const [sendMessageMutation] = useMutation(SEND_MESSAGE);

    useEffect(() => {
        if (!isAuthenticated) return;
        
        // Evitamos intentar registrar el token múltiples veces por sesión
        if (hasRegistered.current) return;

        const registerForPushNotificationsAsync = async () => {
            try {
                if (Platform.OS === 'android') {
                    await Notifications.setNotificationChannelAsync('default', {
                        name: 'default',
                        importance: Notifications.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#FF231F7C',
                    });
                }

                if (!Device.isDevice) {
                    console.log('Las notificaciones Push requieren un dispositivo físico.');
                    return;
                }

                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus !== 'granted') {
                    console.log('No se concedieron los permisos para notificaciones push.');
                    return;
                }

                const projectId =
                    Constants?.expoConfig?.extra?.eas?.projectId ??
                    Constants?.easConfig?.projectId;

                if (!projectId) {
                    console.warn('Project ID no encontrado en la configuración de Expo. No se puede obtener el token de push.');
                    return;
                }

                const tokenData = await Notifications.getExpoPushTokenAsync({
                    projectId,
                });

                const token = tokenData.data;
                setExpoPushToken(token);

                // Enviar el token al backend
                await registerPushToken({
                    variables: {
                        token,
                        platform: Platform.OS,
                    },
                });

                hasRegistered.current = true;
                console.log('Token de notificaciones registrado correctamente:', token);
            } catch (error: any) {
                if (error?.message?.includes('Unauthorized')) {
                    console.warn('No se pudo registrar el push token: Sesión expirada o no autorizada.');
                } else {
                    console.error('Error al registrar las notificaciones push:', error);
                }
            }
        };

        registerForPushNotificationsAsync();

        // Listeners para recibir notificaciones cuando la app está abierta o interactuando
        notificationListener.current = Notifications.addNotificationReceivedListener(async notification => {
            const data = notification?.request?.content?.data as any;
            const isChat = data?.type === 'CHAT_ROOM';
            const isLocal = data?.isLocal === true;
            const conversationId = data?.conversationId;

            if (isChat && !isLocal && conversationId) {
                // Solo disparamos la notificación si NO estamos dentro de esta misma conversación
                const activeConvId = ActiveChatTracker.getActiveConversationId();
                if (conversationId !== activeConvId) {
                    // Al programar la notificación local usando 'identifier: conversationId', 
                    // le decimos a Android/iOS que reemplace/modifique la notificación existente de ese chat,
                    // logrando que se actualice sobre la misma tarjeta y no cree nuevas notificaciones.
                    Notifications.scheduleNotificationAsync({
                        identifier: conversationId,
                        content: {
                            title: notification.request.content.title,
                            body: notification.request.content.body,
                            data: { ...data, isLocal: true },
                        },
                        trigger: null,
                    }).catch(err => console.error('Error al programar notificación local en primer plano:', err));
                }
            }
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Usuario interactuó con la notificación:', response);
            try {
                const data = response?.notification?.request?.content?.data as any;
                if (data) {
                    // 1. Manejo de Quick Reply (Respuesta Rápida)
                    if (response.actionIdentifier === 'reply') {
                        const userText = (response as any).userText;
                        const conversationId = data.conversationId;
                        if (userText && conversationId) {
                            console.log(`[QuickReply] Enviando respuesta rápida a conversación ${conversationId}:`, userText);
                            sendMessageMutation({
                                variables: {
                                    conversationId,
                                    content: userText
                                }
                            }).then(() => {
                                console.log('[QuickReply] Respuesta enviada con éxito');
                            }).catch(err => {
                                console.error('[QuickReply] Error al enviar respuesta rápida:', err);
                            });
                        }
                        return;
                    }

                    // 2. Manejo de clic para abrir el chat room
                    if (data.type === 'CHAT_ROOM' && data.conversationId) {
                        console.log('Deep linking to chatRoom with ID:', data.conversationId);
                        router.push({
                            pathname: '/chatRoom',
                            params: { conversationId: data.conversationId }
                        });
                        return;
                    }

                    // 3. Otros tipos de deep linking
                    if (data.postId && (data.type === 'POST_DETAIL' || data.type === 'STORE_DETAIL')) {
                        console.log('Deep linking to postDetail with ID:', data.postId, 'isStore:', data.type === 'STORE_DETAIL');
                        router.push({
                            pathname: '/postDetail',
                            params: { postId: data.postId, isStore: data.type === 'STORE_DETAIL' ? 'true' : 'false' }
                        });
                    } else if (data.userId && data.type === 'USER_PROFILE') {
                        console.log('Deep linking to profile with ID:', data.userId);
                        router.push({
                            pathname: '/profile',
                            params: { userId: data.userId }
                        });
                    }
                }
            } catch (err) {
                console.error('Error handling notification press:', err);
            }
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [isAuthenticated, registerPushToken]);

    return {
        expoPushToken,
        notification,
    };
};
