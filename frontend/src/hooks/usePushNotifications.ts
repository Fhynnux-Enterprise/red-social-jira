import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

const REGISTER_PUSH_TOKEN_MUTATION = gql`
    mutation RegisterPushToken($token: String!, $platform: String) {
        registerPushToken(token: $token, platform: $platform)
    }
`;

// Configuración global para cómo se manejan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const usePushNotifications = (isAuthenticated: boolean) => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
    const [notification, setNotification] = useState<Notifications.Notification | undefined>();
    const notificationListener = useRef<Notifications.Subscription>();
    const responseListener = useRef<Notifications.Subscription>();
    const hasRegistered = useRef(false);

    const [registerPushToken] = useMutation(REGISTER_PUSH_TOKEN_MUTATION);

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
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Usuario interactuó con la notificación:', response);
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
