import ChatDetailsScreen from '../src/features/chat/screens/ChatDetailsScreen';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function ChatDetailsRoute() {
    const params = useLocalSearchParams();
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <ChatDetailsScreen route={{ params }} />
        </>
    );
}
