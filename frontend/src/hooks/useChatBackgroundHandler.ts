import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import notifee, { AndroidStyle, EventType } from '@notifee/react-native';
import { apolloClient } from '../api/apollo.client';
import { SEND_MESSAGE } from '../features/chat/graphql/chat.operations';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_CHAT_NOTIF_TASK';

// Helper function to resolve avatar URLs correctly (handling relative paths)
export const resolveAvatarUrl = (url?: string | null, username: string = 'U') => {
    if (!url) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=E5E5EA&color=8E8E93&size=150`;
    }
    if (url.startsWith('http') || url.startsWith('file://')) return url;
    const serverUrl = 'https://canton-enterprise-production.up.railway.app';
    return `${serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Helper function to update or remove the Android group summary notification
export const updateSummaryNotification = async () => {
    try {
        const activeNotifications = await notifee.getDisplayedNotifications();
        
        // Find all active chat notifications (excluding the summary itself)
        const chatNotifications = activeNotifications.filter(
            (n: any) => n.notification.id !== 'chat-group-summary' && n.notification.data?.type === 'CHAT_ROOM'
        );
        
        const conversationsCount = chatNotifications.length;
        
        if (conversationsCount >= 2) {
            let totalMessages = 0;
            
            for (const n of chatNotifications) {
                try {
                    const parsed = JSON.parse(n.notification.data?.messagesJson as string || '[]');
                    totalMessages += parsed.length || 1;
                } catch (e) {
                    totalMessages += 1;
                }
                
                // Ensure all notifications in the group have the groupId set
                if (n.notification.android?.groupId !== 'chat-group') {
                    const existingAndroid = n.notification.android || {};
                    await notifee.displayNotification({
                        ...n.notification,
                        android: {
                            ...existingAndroid,
                            groupId: 'chat-group',
                        },
                    });
                }
            }
            
            const title = `${totalMessages} mensaje${totalMessages > 1 ? 's' : ''} nuevo${totalMessages > 1 ? 's' : ''}`;
            const subtitle = `de ${conversationsCount} chat${conversationsCount > 1 ? 's' : ''}`;
            
            await notifee.displayNotification({
                id: 'chat-group-summary',
                title,
                subtitle,
                android: {
                    channelId: 'chat-messages',
                    groupId: 'chat-group',
                    groupSummary: true,
                },
            });
        } else {
            // Cancel summary if less than 2 chats are active
            await notifee.cancelNotification('chat-group-summary');
            
            // If exactly 1 chat is active, remove its groupId so the sender's avatar displays collapsed
            if (conversationsCount === 1) {
                const singleNotif = chatNotifications[0];
                if (singleNotif.notification.android?.groupId === 'chat-group') {
                    const existingAndroid = { ...singleNotif.notification.android };
                    delete existingAndroid.groupId;
                    
                    await notifee.displayNotification({
                        ...singleNotif.notification,
                        android: existingAndroid,
                    });
                }
            }
        }
    } catch (err) {
        console.error('[Summary Notification] Error updating summary:', err);
    }
};

// ─── 1. Background Event Handler for Notifee (Quick Reply) ─────────────────
notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction, input } = detail;
    if (type === EventType.ACTION_PRESS && pressAction?.id === 'reply' && input) {
        const conversationId = notification?.data?.conversationId as string;
        const userText = input;
        
        console.log(`[Notifee Background Event] Replying to conversation ${conversationId}: ${userText}`);
        
        try {
            await apolloClient.mutate({
                mutation: SEND_MESSAGE,
                variables: {
                    conversationId,
                    content: userText,
                },
            });
            console.log('[Notifee Background Event] Reply sent successfully via Apollo Client');
            
            // Dismiss notification after successful reply
            if (notification?.id) {
                await notifee.cancelNotification(notification.id);
                await updateSummaryNotification();
            }
        } catch (err) {
            console.error('[Notifee Background Event] Error replying to message:', err);
        }
    }
});

// ─── 2. Background Task for Expo-Notifications (Interception) ───────────────
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }: any) => {
    if (error) {
        console.error('[Background Task] Task failed with error:', error);
        return;
    }

    const remoteMessage = data.notification;
    const msgData = remoteMessage?.data;

    // Process only if it is a CHAT_ROOM type notification
    if (msgData?.type === 'CHAT_ROOM') {
        const senderName = msgData.senderName || 'Usuario';
        const senderAvatar = msgData.senderAvatar || null;
        const messageBody = msgData.body || remoteMessage?.body || 'Nuevo mensaje';
        const conversationId = msgData.conversationId;

        if (!conversationId) return;

        try {
            // Get active notifications to group messages from the same conversation
            const activeNotifications = await notifee.getDisplayedNotifications();
            let existingMessages: any[] = [];

            const chatNotifications = activeNotifications.filter(
                (n: any) => n.notification.id !== 'chat-group-summary' && n.notification.data?.type === 'CHAT_ROOM'
            );

            const existingNotif = chatNotifications.find(
                (n: any) => n.notification.id === conversationId
            );

            if (existingNotif && existingNotif.notification.data?.messagesJson) {
                try {
                    const parsed = JSON.parse(existingNotif.notification.data.messagesJson as string);
                    if (Array.isArray(parsed)) {
                        existingMessages = parsed;
                    }
                } catch (e) {
                    console.error('[Background Task] Error parsing existing messages:', e);
                }
            }

            const resolvedAvatar = resolveAvatarUrl(senderAvatar, senderName);

            const newMessage = {
                text: messageBody,
                timestamp: Date.now(),
                person: {
                    name: senderName,
                    icon: resolvedAvatar,
                },
            };

            const updatedMessages = [...existingMessages, newMessage].slice(-10); // Keep last 10 messages

            // Calculate if we should display with groupId right now
            const isAlreadyDisplayed = chatNotifications.some(n => n.notification.id === conversationId);
            const activeConversationsCount = chatNotifications.length + (isAlreadyDisplayed ? 0 : 1);
            const shouldGroup = activeConversationsCount >= 2;

            // Create notification channel (Android only, required for displaying)
            await notifee.createChannel({
                id: 'chat-messages',
                name: 'Mensajes de Chat',
                importance: 4, // high importance
            });

            const androidConfig: any = {
                channelId: 'chat-messages',
                largeIcon: resolvedAvatar || undefined,
                style: {
                    type: AndroidStyle.MESSAGING,
                    person: {
                        name: 'Tú',
                    },
                    messages: updatedMessages,
                },
                pressAction: {
                    id: 'default',
                },
                actions: [
                    {
                        title: 'Responder',
                        pressAction: {
                            id: 'reply',
                        },
                        input: {
                            placeholder: 'Escribe una respuesta...',
                        },
                    },
                ],
            };

            if (shouldGroup) {
                androidConfig.groupId = 'chat-group';
            }

            await notifee.displayNotification({
                id: conversationId, // Group under same notification ID per conversation
                title: senderName,
                body: messageBody,
                data: {
                    ...msgData,
                    messagesJson: JSON.stringify(updatedMessages),
                },
                android: androidConfig,
                ios: {
                    threadId: conversationId,
                },
            });

            // Update Android group summary notification
            await updateSummaryNotification();
        } catch (err) {
            console.error('[Background Task] Error displaying Notifee notification:', err);
        }
    }
});

// Register background task with expo-notifications
Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK)
    .then(() => console.log('[Background Task] Task registered successfully'))
    .catch(err => console.error('[Background Task] Registration failed:', err));
