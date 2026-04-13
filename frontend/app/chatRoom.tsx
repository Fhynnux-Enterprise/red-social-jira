import ChatRoomScreen from '../src/features/chat/screens/ChatRoomScreen';
import { Stack } from 'expo-router';
import React from 'react';

export default function ChatRoomRoute() {
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <ChatRoomScreen />
        </>
    );
}
