import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';
import Toast from 'react-native-toast-message';

// Define the GraphQL endpoint connecting securely to the local NestJS server
const httpLink = createHttpLink({
    uri: `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/graphql`,
});

// Create authentication link to intercept requests and inject JWT
const authLink = setContext(async (_, { headers }) => {
    // Read the token from Secure Store (global)
    const token = await SecureStore.getItemAsync('access_token');

    // Return the authorization header so the httpLink processes it
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        }
    }
});

// Global Error Link for Apollo Client
const errorLink = onError(({ graphQLErrors, networkError }) => {
    let isUnauthorized = false;

    if (graphQLErrors) {
        graphQLErrors.forEach(({ extensions, message }) => {
            // Buscamos el código estándar UNAUTHENTICATED o la palabra Unauthorized en el mensaje
            if (
                extensions?.code === 'UNAUTHENTICATED' || 
                extensions?.code === '401' ||
                message.includes('Unauthorized') || 
                message.includes('not authenticated')
            ) {
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

    if (isUnauthorized) {
        // Limpiamos la caché de Apollo inmediatamente para mayor seguridad
        apolloClient.clearStore().catch(e => console.error('Error clearing store:', e));
        
        DeviceEventEmitter.emit('session_expired');
        Toast.show({ 
            type: 'error', 
            text1: 'Sesión expirada', 
            text2: 'Tus credenciales han caducado, por favor inicia sesión de nuevo.',
            visibilityTime: 4000
        });
    }
});

// Configure and export Apollo Client
export const apolloClient = new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache({
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
                    getCommentsByPost: {
                        keyArgs: ['postId'],
                        merge(existing = [], incoming) {
                            const existingRefs = new Set(existing.map((ref: any) => ref.__ref));
                            const uniqueIncoming = incoming.filter((ref: any) => !existingRefs.has(ref.__ref));
                            return [...existing, ...uniqueIncoming];
                        },
                    },
                    getUserProfile: {
                        keyArgs: ['id'],
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
        },
    }),
});
