import ChatRoomScreen from '../src/features/chat/screens/ChatRoomScreen';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function ChatRoomRoute() {
    const params = useLocalSearchParams();
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <ChatRoomScreen route={{ params }} />
        </>
    );
}
