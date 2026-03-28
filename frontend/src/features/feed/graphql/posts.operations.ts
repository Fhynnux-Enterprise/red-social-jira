import { gql } from '@apollo/client';

export const GET_POSTS = gql`
    query GetPosts($limit: Int, $offset: Int) {
        getPosts(limit: $limit, offset: $offset) {
            id
            content
            title
            media {
                id
                url
                type
                order
            }
            createdAt
            updatedAt
            commentsCount
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
    mutation CreatePost($content: String!, $title: String, $media: [PostMediaInput!]) {
        createPost(content: $content, title: $title, media: $media) {
            id
            content
            title
            media {
                id
                url
                type
                order
            }
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
    mutation UpdatePost($id: String!, $content: String!, $title: String) {
        updatePost(id: $id, content: $content, title: $title) {
            id
            content
            title
            media {
                id
                url
                type
                order
            }
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
            commentsCount
            likes {
                id_post_like
                user {
                    id
                    firstName
                    lastName
                    photoUrl
                }
            }
        }
    }
`;
