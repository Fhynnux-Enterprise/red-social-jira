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
            editedAt
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
            updatedAt
            editedAt
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
            editedAt
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
                postTitle: title
                createdAt
                updatedAt
                editedAt
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
                jobLocation: location
                salary
                jobContactPhone: contactPhone
                createdAt
                editedAt
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
                profContactPhone: contactPhone
                createdAt
                editedAt
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
            ... on StoreProduct {
                id
                storeTitle: title
                description
                price
                currency
                storeLocation: location
                storeContactPhone: contactPhone
                condition
                category
                isAvailable
                createdAt
                editedAt
                commentsCount
                storeMedia: media {
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
                seller {
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

export const TOGGLE_SAVE_POST = gql`
    mutation ToggleSavePost($postId: String!, $itemType: SavedItemType) {
        toggleSavePost(postId: $postId, itemType: $itemType)
    }
`;

export const GET_SAVED_POSTS = gql`
    query GetSavedPosts($limit: Int, $offset: Int) {
        getSavedPosts(limit: $limit, offset: $offset) {
            __typename
            ... on Post {
                id
                content
                postTitle: title
                createdAt
                updatedAt
                editedAt
                commentsCount
                postMedia: media {
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
            ... on JobOffer {
                id
                jobTitle: title
                description
                jobLocation: location
                salary
                jobContactPhone: contactPhone
                createdAt
                editedAt
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
                profContactPhone: contactPhone
                createdAt
                editedAt
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
            ... on StoreProduct {
                id
                storeTitle: title
                description
                price
                currency
                storeLocation: location
                storeContactPhone: contactPhone
                condition
                category
                isAvailable
                createdAt
                editedAt
                commentsCount
                storeMedia: media {
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
                seller {
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

export const GET_LIKED_POSTS = gql`
    query GetLikedItems($limit: Int, $offset: Int) {
        getLikedItems(limit: $limit, offset: $offset) {
            __typename
            ... on Post {
                id
                content
                postTitle: title
                createdAt
                updatedAt
                editedAt
                commentsCount
                postMedia: media {
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
                likes {
                    id
                    user {
                        id
                    }
                }
            }
            ... on StoreProduct {
                id
                storeTitle: title
                description
                price
                currency
                storeLocation: location
                storeContactPhone: contactPhone
                condition
                category
                isAvailable
                createdAt
                editedAt
                commentsCount
                storeMedia: media {
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
                seller {
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

export const GET_POST_BY_ID = gql`
    query GetPostById($id: String!) {
        getPostById(id: $id) {
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
            editedAt
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
