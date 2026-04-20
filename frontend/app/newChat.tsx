import NewChatScreen from '../src/features/chat/screens/NewChatScreen';
import { Stack } from 'expo-router';
import React from 'react';

export default function NewChatRoute() {
    return (
        <>
            <Stack.Screen options={{ 
                headerShown: false,
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom'
            }} />
            <NewChatScreen />
        </>
    );
}
