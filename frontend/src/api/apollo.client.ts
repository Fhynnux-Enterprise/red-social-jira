import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import * as SecureStore from 'expo-secure-store';

// Define the GraphQL endpoint connecting securely to the local NestJS server
const httpLink = createHttpLink({
    uri: 'http://192.168.1.129:3000/graphql',
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

// Configure and export Apollo Client
export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});
