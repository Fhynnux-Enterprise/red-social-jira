import ProfileScreen from '../src/features/profile/screens/ProfileScreen';
import { useLocalSearchParams } from 'expo-router';

export default function ProfileRoute() {
    const params = useLocalSearchParams();
    return <ProfileScreen userId={params.userId as string} />;
}
