import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import * as SecureStore from 'expo-secure-store';
import { notifySessionExpired } from './session.manager';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';

// ─── Ban event emitter (singleton) ───────────────────────────────────────────
type BanHandler = (info: { bannedUntil: string; banReason: string }) => void;
let _banHandler: BanHandler | null = null;

export const registerBanHandler = (handler: BanHandler) => { _banHandler = handler; };
export const unregisterBanHandler = () => { _banHandler = null; };
const notifyBanned = (info: { bannedUntil: string; banReason: string }) => {
    _banHandler?.(info);
};

// Define the GraphQL endpoint connecting securely to the local NestJS server
const httpLink = createHttpLink({
    uri: `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/graphql`,
});

// Create authentication link to intercept requests and inject JWT
const authLink = setContext(async (_, { headers }) => {
    // Read the token from Secure Store (global)
    const token = await SecureStore.getItemAsync('access_token');
    const cityId = Constants.expoConfig?.extra?.cityId || 'chunchi';

    // Return the authorization header so the httpLink processes it
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
            'x-city-id': cityId,
        }
    }
});

// ─── Session expiry debounce (previene múltiples logout simultáneos) ─────────
// Cuando muchas queries fallan con 401 al mismo tiempo (token expirado),
// el errorLink se dispara para cada una. Esta bandera asegura que
// notifySessionExpired() solo se llame UNA VEZ hasta que el estado se resetee.
let _sessionExpiredFired = false;

/** Exportada para resetear la bandera al hacer login de nuevo. */
export const resetSessionExpiredFlag = () => { _sessionExpiredFired = false; };

// Global Error Link for Apollo Client
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
    let isUnauthorized = false;

    if (graphQLErrors) {
        graphQLErrors.forEach(({ extensions, message, path }) => {
            // Ignoramos errores 401 que vengan de suscripciones WebSocket (messageAdded).
            const isFromSubscription = path && path.includes('messageAdded');
            if (isFromSubscription) return;

            // ── Detectar USER_BANNED ──────────────────────────────────────────
            if (
                extensions?.code === 'UNAUTHENTICATED' ||
                extensions?.code === '401' ||
                message.includes('Unauthorized') ||
                message.includes('not authenticated')
            ) {
                // Intentar parsear si es un ban estructurado
                try {
                    const parsed = JSON.parse(message);
                    if (parsed?.code === 'USER_BANNED' && parsed?.bannedUntil) {
                        notifyBanned({
                            bannedUntil: parsed.bannedUntil,
                            banReason: parsed.banReason || 'Violación de las normas de la comunidad',
                        });
                        return; // No tratar como session expired
                    }
                } catch (_) { /* no era JSON de ban */ }

                isUnauthorized = true;
            }
        });
    }

    if (networkError) {
        if ('statusCode' in networkError && networkError.statusCode === 401) {
            isUnauthorized = true;
        } else {
            // Error de conexión (GraphQL) - IP incorrecta o servidor apagado
            Toast.show({
                type: 'error',
                text1: 'Servidor no disponible',
                text2: 'No se pudo conectar con el servidor.',
                visibilityTime: 5000,
            });
        }
    }

    if (isUnauthorized && !_sessionExpiredFired) {
        _sessionExpiredFired = true;

        // Limpiar caché para evitar datos rancios
        apolloClient.clearStore().catch(e => console.error('Error clearing store:', e));

        // Notificar al AuthContext para que haga logout y navegue al login
        notifySessionExpired();

        Toast.show({
            type: 'error',
            text1: '⏱ Sesión expirada',
            text2: 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.',
            visibilityTime: 4500,
        });

        // Resetear la bandera al cabo de 5 segundos para permitir nuevos logins
        setTimeout(() => { _sessionExpiredFired = false; }, 5000);
    }
});

const wsUrl = (`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/graphql`).replace('http://', 'ws://').replace('https://', 'wss://');

const wsLink = new GraphQLWsLink(createClient({
    url: wsUrl,
    connectionParams: async () => {
        const token = await SecureStore.getItemAsync('access_token');
        const cityId = Constants.expoConfig?.extra?.cityId || 'chunchi';
        return {
            Authorization: token ? `Bearer ${token}` : '',
            'x-city-id': cityId,
        };
    },
}));

// Router de Apollo: decide si envía por WebSocket o por HTTP
const splitLink = split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return (
            definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription'
        );
    },
    wsLink,
    authLink.concat(httpLink),
);

// Configure and export Apollo Client
export const apolloClient = new ApolloClient({
    link: from([errorLink, splitLink]),
    cache: new InMemoryCache({
        // Permite al cache entender qué tipos concretos puede devolver el union FeedItem y SavedContent
        possibleTypes: {
            FeedItem: ['Post', 'JobOffer', 'ProfessionalProfile', 'StoreProduct'],
            SavedContent: ['Post', 'JobOffer', 'ProfessionalProfile', 'StoreProduct'],
            LikedContent: ['Post', 'StoreProduct'],
        },
        typePolicies: {
            Query: {
                fields: {
                    getPosts: {
                        keyArgs: false,
                        merge(existing = [], incoming) {
                            // Deduplicación basada en las referencias internas de Apollo (__ref)
                            const existingRefs = new Set(existing.map((ref: any) => ref.__ref));
                            const uniqueIncoming = incoming.filter((ref: any) => !existingRefs.has(ref.__ref));
                            return [...existing, ...uniqueIncoming];
                        },
                    },
                    getFeed: {
                        keyArgs: false,
                        merge(existing = [], incoming) {
                            const existingRefs = new Set(existing.map((ref: any) => ref.__ref));
                            const uniqueIncoming = incoming.filter((ref: any) => !existingRefs.has(ref.__ref));
                            return [...existing, ...uniqueIncoming];
                        },
                    },
                    getCommentsByPost: {
                        keyArgs: ['postId'],
                        merge(existing = [], incoming) {
                            const existingRefs = new Set(existing.map((ref: any) => ref.__ref));
                            const uniqueIncoming = incoming.filter((ref: any) => !existingRefs.has(ref.__ref));
                            return [...existing, ...uniqueIncoming];
                        },
                    },
                    getChatMessages: {
                        keyArgs: ['conversationId'],
                        merge(existing = [], incoming) {
                            const existingRefs = new Set(existing.map((ref: any) => ref.__ref));
                            const uniqueIncoming = incoming.filter((ref: any) => !existingRefs.has(ref.__ref));
                            // Los incoming van después de los existing
                            return [...existing, ...uniqueIncoming];
                        },
                    },
                    getUserProfile: {
                        keyArgs: ['id'],
                    },
                    getMyBlockedUsers: {
                        keyArgs: false,
                        merge(existing = [], incoming, { args }) {
                            const offset = args?.offset || 0;
                            if (offset === 0) return incoming; // Si es la primera página o refetch, reemplazamos

                            const existingRefs = new Set(existing.map((ref: any) => ref.__ref));
                            const uniqueIncoming = incoming.filter((ref: any) => !existingRefs.has(ref.__ref));
                            return [...existing, ...uniqueIncoming];
                        },
                    },
                },
            },
            // Política para la entidad Post normalizada:
            // Apollo la identifica por __typename + id automáticamente.
            // Aquí le decimos que cuando lleguen nuevos 'likes', reemplace (no mezcle)
            // el array completo para evitar duplicados o datos rancios.
            Post: {
                fields: {
                    likes: {
                        merge(existing, incoming) {
                            // Siempre tomamos la lista más reciente del servidor
                            return incoming;
                        },
                    },
                },
            },
            StoreProduct: {
                fields: {
                    likes: {
                        merge(existing, incoming) {
                            // Siempre tomamos la lista más reciente del servidor
                            return incoming;
                        },
                    },
                },
            },
        },
    }),
});
