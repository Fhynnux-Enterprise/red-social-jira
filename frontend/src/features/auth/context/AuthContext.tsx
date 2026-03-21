import React, { createContext, useState, useEffect, useContext } from 'react';
import { DeviceEventEmitter } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/auth.service';
import { ProfileService, UserProfile } from '../../profile/services/profile.service';

type AuthContextData = {
    userToken: string | null;
    user: UserProfile | null;
    isLoading: boolean;
    signIn: (token: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const signOut = async () => {
        await AuthService.logout();
        setUserToken(null);
        setUser(null);
    };

    useEffect(() => {
        const checkToken = async () => {
            try {
                const token = await SecureStore.getItemAsync('access_token');
                if (token) {
                    setUserToken(token);
                    try {
                        const profile = await ProfileService.getProfile();
                        setUser(profile);
                    } catch (e) {
                        console.log('Error fetching profile in AuthContext - invalid token or network error');
                        // Si falla, removemos el token inválido silenciosamente
                        setUserToken(null);
                        await SecureStore.deleteItemAsync('access_token');
                    }
                }
            } catch (error) {
                console.log('Error al recuperar el token de SecureStore', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkToken();

        // Escuchar el evento de sesión expirada
        const subscription = DeviceEventEmitter.addListener('session_expired', () => {
            signOut();
        });

        return () => subscription.remove();
    }, []);

    const signIn = async (token: string) => {
        await SecureStore.setItemAsync('access_token', token);
        setUserToken(token);
        try {
            const profile = await ProfileService.getProfile();
            setUser(profile);
        } catch (e) {
            console.error('Error fetching profile on login');
        }
    };

    const refreshProfile = async () => {
        try {
            const profile = await ProfileService.getProfile();
            setUser(profile);
        } catch (e) {
            console.error('Error refreshing profile:', e);
        }
    };

    return (
        <AuthContext.Provider value={{ userToken, user, isLoading, signIn, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
