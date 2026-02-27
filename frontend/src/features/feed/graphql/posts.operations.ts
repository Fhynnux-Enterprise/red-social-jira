import { gql } from '@apollo/client';

export const GET_POSTS = gql`
    query GetPosts {
        getPosts {
            id
            content
            createdAt
            author {
                firstName
                lastName
                username
            }
        }
    }
`;

export const CREATE_POST = gql`
    mutation CreatePost($content: String!) {
        createPost(content: $content) {
            id
            content
            createdAt
            author {
                firstName
                lastName
                username
            }
        }
    }
`;
