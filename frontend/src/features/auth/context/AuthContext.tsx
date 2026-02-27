import React, { createContext, useState, useEffect, useContext } from 'react';
import { DeviceEventEmitter } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/auth.service';

type AuthContextData = {
    userToken: string | null;
    isLoading: boolean;
    signIn: (token: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const signOut = async () => {
        await AuthService.logout();
        setUserToken(null);
    };

    useEffect(() => {
        const checkToken = async () => {
            try {
                const token = await SecureStore.getItemAsync('access_token');
                if (token) {
                    setUserToken(token);
                }
            } catch (error) {
                console.error('Error al recuperar el token de SecureStore', error);
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
    };

    return (
        <AuthContext.Provider value={{ userToken, isLoading, signIn, signOut }}>
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
