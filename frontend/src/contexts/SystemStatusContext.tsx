import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { registerSystemStatusHandler, unregisterSystemStatusHandler } from '../api/apollo.client';
import { useAuth } from '../features/auth/context/AuthContext';
import * as Application from 'expo-application';

export const GET_SYSTEM_CONFIG = gql`
  query GetSystemConfig {
    getSystemConfig {
      id
      isMaintenanceMode
      minRequiredAppVersion
      maintenanceMessage
      storeUrlIos
      storeUrlAndroid
    }
  }
`;

type SystemStatus = 'OK' | 'MAINTENANCE_MODE' | 'UPDATE_REQUIRED';

interface SystemStatusContextData {
    status: SystemStatus;
    message: string;
    storeUrlIos?: string;
    storeUrlAndroid?: string;
    checkStatus: () => void;
}

const SystemStatusContext = createContext<SystemStatusContextData>({
    status: 'OK',
    message: '',
    checkStatus: () => { },
});

export const SystemStatusProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth() as any;
    const [status, setStatus] = useState<SystemStatus>('OK');
    const [message, setMessage] = useState('');
    const [storeUrlIos, setStoreUrlIos] = useState<string | undefined>();
    const [storeUrlAndroid, setStoreUrlAndroid] = useState<string | undefined>();

    const isAdmin = user?.role === 'ADMIN';

    const { data, refetch } = useQuery(GET_SYSTEM_CONFIG, {
        fetchPolicy: 'network-only',
        notifyOnNetworkStatusChange: true,
    });

    const isVersionOutdated = (clientVersion: string, minVersion: string): boolean => {
        const parse = (v: string) => v.replace(/[^0-9.]/g, '').split('.').map(Number);
        const clientParts = parse(clientVersion);
        const minParts = parse(minVersion);
    
        for (let i = 0; i < Math.max(clientParts.length, minParts.length); i++) {
            const c = clientParts[i] || 0;
            const m = minParts[i] || 0;
            if (c < m) return true;
            if (c > m) return false;
        }
        return false;
    };

    // Evaluar la config al cargar o al cambiar usuario/data
    useEffect(() => {
        if (data?.getSystemConfig) {
            const config = data.getSystemConfig;
            setStoreUrlIos(config.storeUrlIos);
            setStoreUrlAndroid(config.storeUrlAndroid);

            if (!isAdmin) {
                const currentVersion = Application.nativeApplicationVersion || '1.0.0';
                if (config.minRequiredAppVersion && isVersionOutdated(currentVersion, config.minRequiredAppVersion)) {
                    setStatus('UPDATE_REQUIRED');
                    setMessage('Es necesario actualizar la aplicación para continuar.');
                    return;
                }

                if (config.isMaintenanceMode) {
                    setStatus('MAINTENANCE_MODE');
                    setMessage(config.maintenanceMessage || 'El sistema se encuentra en mantenimiento.');
                    return;
                }
            }
            
            setStatus('OK');
        }
    }, [data, user]);

    // Suscribirse a eventos del Apollo Client (errores globales)
    useEffect(() => {
        const handler = (info: { type: 'MAINTENANCE_MODE' | 'UPDATE_REQUIRED'; message: string }) => {
            if (!isAdmin) {
                setStatus(info.type);
                setMessage(info.message);
            }
        };

        registerSystemStatusHandler(handler);
        return () => {
            unregisterSystemStatusHandler();
        };
    }, [isAdmin]);

    return (
        <SystemStatusContext.Provider value={{ status, message, storeUrlIos, storeUrlAndroid, checkStatus: () => refetch() }}>
            {children}
        </SystemStatusContext.Provider>
    );
};

export const useSystemStatus = () => useContext(SystemStatusContext);
