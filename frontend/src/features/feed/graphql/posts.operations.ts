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
                id
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
                id
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

export const GET_FEED = gql`
    query GetFeed($limit: Int, $offset: Int) {
        getFeed(limit: $limit, offset: $offset) {
            __typename
            ... on Post {
                id
                content
                title
                createdAt
                updatedAt
                commentsCount
                postMedia: media {
                    id
                    url
                    type
                    order
                }
                likes {
                    id
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
            ... on JobOffer {
                id
                jobTitle: title
                description
                location
                salary
                contactPhone
                createdAt
                jobMedia: media {
                    id
                    url
                    type
                    order
                }
                author {
                    id
                    firstName
                    lastName
                    username
                    photoUrl
                }
            }
            ... on ProfessionalProfile {
                id
                profession
                description
                experienceYears
                contactPhone
                createdAt
                profMedia: media {
                    id
                    url
                    type
                    order
                }
                user {
                    id
                    firstName
                    lastName
                    username
                    photoUrl
                }
            }
        }
    }
`;
