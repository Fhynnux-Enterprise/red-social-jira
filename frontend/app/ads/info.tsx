import { Stack } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { ActivityIndicator, View } from 'react-native';
import AdsInfoScreen from '../../src/features/ads/screens/AdsInfoScreen';
import AdvertiserDashboardScreen from '../../src/features/advertisers/screens/AdvertiserDashboardScreen';
import { HAS_ADVERTISER_PERMISSION } from '../../src/features/advertisers/graphql/advertisers.operations';
import { useTheme } from '../../src/theme/ThemeContext';

export default function AdsInfoRoute() {
    const { colors } = useTheme();
    const { data, loading } = useQuery(HAS_ADVERTISER_PERMISSION, {
        fetchPolicy: 'cache-and-network',
    });

    const hasPermission = data?.hasAdvertiserPermission === true;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {loading && !data ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                hasPermission ? <AdvertiserDashboardScreen /> : <AdsInfoScreen />
            )}
        </View>
    );
}
