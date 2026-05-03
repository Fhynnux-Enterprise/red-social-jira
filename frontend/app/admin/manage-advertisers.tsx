import { Stack } from 'expo-router';
import ManageAdvertisersScreen from '../../src/features/advertisers/screens/ManageAdvertisersScreen';

export default function ManageAdvertisersRoute() {
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <ManageAdvertisersScreen />
        </>
    );
}
