import { gql } from '@apollo/client';

export const STORE_PRODUCT_FIELDS = gql`
  fragment StoreProductFields on StoreProduct {
    id
    title
    description
    price
    currency
    location
    contactPhone
    condition
    category
    isAvailable
    createdAt
    seller {
      id
      username
      firstName
      lastName
      photoUrl
    }
    media {
      url
      type
      order
    }
    commentsCount
    likes {
      id
      user {
        id
      }
    }
  }
`;

export const GET_STORE_PRODUCTS = gql`
  query GetStoreProducts($limit: Int, $offset: Int) {
    storeProducts(limit: $limit, offset: $offset) {
      id
      title
      description
      price
      currency
      location
      contactPhone
      condition
      category
      isAvailable
      createdAt
      seller {
        id
        username
        firstName
        lastName
        photoUrl
      }
      media {
        url
        type
        order
      }
      commentsCount
      likes {
        id
        user {
          id
        }
      }
    }
  }
`;

export const GET_MY_STORE_PRODUCTS = gql`
  query GetMyStoreProducts {
    myStoreProducts {
      id
      title
      description
      price
      currency
      location
      contactPhone
      condition
      category
      isAvailable
      createdAt
      seller {
        id
        username
        firstName
        lastName
        photoUrl
      }
      media {
        url
        type
        order
      }
      commentsCount
      likes {
        id
        user {
          id
        }
      }
    }
  }
`;

export const CREATE_STORE_PRODUCT = gql`
  mutation CreateStoreProduct($input: CreateStoreProductInput!) {
    createStoreProduct(input: $input) {
      id
      title
      description
      price
      currency
      location
      contactPhone
      condition
      category
      isAvailable
      createdAt
      seller {
        id
        username
        firstName
        lastName
        photoUrl
      }
      media {
        url
        type
        order
      }
      commentsCount
      likes {
        id
        user {
          id
        }
      }
    }
  }
`;

export const UPDATE_STORE_PRODUCT = gql`
  mutation UpdateStoreProduct($input: UpdateStoreProductInput!) {
    updateStoreProduct(input: $input) {
      id
      title
      description
      price
      currency
      location
      contactPhone
      condition
      category
      isAvailable
      createdAt
      seller {
        id
        username
        firstName
        lastName
        photoUrl
      }
      media {
        url
        type
        order
      }
      commentsCount
      likes {
        id
        user {
          id
        }
      }
    }
  }
`;

export const GET_STORE_PRODUCTS_BY_USER = gql`
  query GetStoreProductsByUser($userId: ID!) {
    storeProductsByUser(userId: $userId) {
      id
      title
      description
      price
      currency
      location
      contactPhone
      condition
      category
      isAvailable
      createdAt
      seller {
        id
        username
        firstName
        lastName
        photoUrl
      }
      media {
        url
        type
        order
      }
      commentsCount
      likes {
        id
        user {
          id
        }
      }
    }
  }
`;

export const DELETE_STORE_PRODUCT = gql`
  mutation DeleteStoreProduct($id: ID!) {
    deleteStoreProduct(id: $id)
  }
`;

export const TOGGLE_STORE_PRODUCT_LIKE = gql`
  mutation ToggleStoreProductLike($productId: ID!) {
    toggleStoreProductLike(productId: $productId) {
      id
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

export const CREATE_STORE_PRODUCT_COMMENT = gql`
  mutation CreateStoreProductComment($productId: ID!, $content: String!, $parentId: ID) {
    createStoreProductComment(productId: $productId, content: $content, parentId: $parentId) {
      id
      content
      createdAt
      user {
        id
        firstName
        lastName
        photoUrl
      }
    }
  }
`;

export const GET_STORE_PRODUCT_COMMENTS = gql`
  query GetStoreProductComments($productId: ID!, $limit: Int, $offset: Int) {
    getStoreProductComments(productId: $productId, limit: $limit, offset: $offset) {
      id
      content
      createdAt
      likesCount
      isLikedByMe
      user {
        id
        firstName
        lastName
        photoUrl
      }
      replies {
        id
        content
        createdAt
        likesCount
        isLikedByMe
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

export const DELETE_STORE_PRODUCT_COMMENT = gql`
  mutation DeleteStoreProductComment($commentId: ID!) {
    deleteStoreProductComment(commentId: $commentId)
  }
`;

export const TOGGLE_STORE_PRODUCT_COMMENT_LIKE = gql`
  mutation ToggleStoreProductCommentLike($commentId: ID!) {
    toggleStoreProductCommentLike(commentId: $commentId) {
      id
      likesCount
      isLikedByMe
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
