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
            if (extensions?.code === 'UNAUTHENTICATED' || message.includes('Unauthorized')) {
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
        DeviceEventEmitter.emit('session_expired');
        Toast.show({ type: 'error', text1: 'Sesión expirada', text2: 'Por favor, inicia sesión nuevamente.' });
    }
});

// Configure and export Apollo Client
export const apolloClient = new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache({
        typePolicies: {
            Query: {
                fields: {
                    getCommentsByPost: {
                        merge(existing, incoming) {
                            return incoming;
                        },
                    },
                },
            },
        },
    }),
});
