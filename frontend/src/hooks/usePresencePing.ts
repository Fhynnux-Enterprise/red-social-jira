import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { notifySessionExpired } from '../api/session.manager';

const PING_PRESENCE_MUTATION = gql`
  mutation PingPresence {
    pingPresence
  }
`;

export const usePresencePing = (isAuthenticated: boolean) => {
  const [pingPresence] = useMutation(PING_PRESENCE_MUTATION, {
    onError: (err) => {
      const isAuthError =
        err.message?.includes('Unauthorized') ||
        err.message?.includes('not authenticated') ||
        err.graphQLErrors?.some(
          (e: any) => e.extensions?.code === 'UNAUTHENTICATED' || e.extensions?.code === '401'
        );

      if (isAuthError) {
        // La sesión expiró — activar el flujo de logout global
        notifySessionExpired();
      } else {
        // Otro error de red silente (no interrumpir al usuario)
        console.log('Error silente en pingPresence:', err.message);
      }
    }
  });
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated) return;

    let pingInterval: ReturnType<typeof setInterval>;

    const executePing = () => {
      pingPresence().catch((err: any) => {
        // Si llega aquí, ya fue manejado por onError; solo logueamos como respaldo
        if (
          err?.message?.includes('Unauthorized') ||
          err?.message?.includes('not authenticated')
        ) {
          notifySessionExpired();
        }
      });
    };

    // Ejecutar inmediatamente al montar y cuando la app está activa
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
