import { gql } from '@apollo/client';

export const GET_POSTS = gql`
    query GetPosts {
        getPosts {
            id
            content
            createdAt
            updatedAt
            likes {
                id_post_like
                user {
                    id
                    firstName
                    lastName
                    username
                    photoUrl
                }
            }
            comments {
                id
            }
            author {
                id
                firstName
                lastName
                username
                photoUrl
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
            comments {
                id
            }
            author {
                id
                firstName
                lastName
                username
                photoUrl
            }
        }
    }
`;

export const UPDATE_POST = gql`
    mutation UpdatePost($id: String!, $content: String!) {
        updatePost(id: $id, content: $content) {
            id
            content
            createdAt
            comments {
                id
            }
            author {
                id
                firstName
                lastName
                username
                photoUrl
            }
        }
    }
`;

export const DELETE_POST = gql`
    mutation DeletePost($id: String!) {
        deletePost(id: $id)
    }
`;

export const TOGGLE_LIKE = gql`
    mutation ToggleLike($postId: String!) {
        toggleLike(postId: $postId) {
            id
            likes {
                id_post_like
                user {
                    id
                    firstName
                    lastName
                    photoUrl
                }
            }
            comments {
                id
            }
        }
    }
`;
