import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

const PING_PRESENCE_MUTATION = gql`
  mutation PingPresence {
    pingPresence
  }
`;

export const usePresencePing = (isAuthenticated: boolean) => {
  const [pingPresence] = useMutation(PING_PRESENCE_MUTATION, {
    onError: (err) => {
      console.log('Error silente en pingPresence:', err.message);
    }
  });
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated) return;

    let pingInterval: ReturnType<typeof setInterval>;

    const executePing = () => {
      pingPresence().catch((err: any) => {
        // Ignoramos errores de red silentes para no molestar al usuario
        console.log('Error silente en pingPresence:', err.message);
      });
    };

    // Ejecutar inmediatamente al montar y autenticarse estar activo
    if (appState.current === 'active') {
      executePing();
      pingInterval = setInterval(executePing, 3 * 60 * 1000); // 3 minutos
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App pasa a primer plano (activo)
        executePing();
        pingInterval = setInterval(executePing, 3 * 60 * 1000);
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App pasa a segundo plano
        if (pingInterval) clearInterval(pingInterval);
      }
      appState.current = nextAppState;
    });

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      subscription.remove();
    };
  }, [isAuthenticated, pingPresence]);
};
