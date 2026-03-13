import { gql } from '@apollo/client';

export const GET_COMMENTS = gql`
  query GetCommentsByPost($postId: String!) {
    getCommentsByPost(postId: $postId) {
      id
      content
      createdAt
      updatedAt
      likesCount
      isLikedByMe
      user {
        id
        username
        firstName
        lastName
        photoUrl
      }
    }
  }
`;

export const CREATE_COMMENT = gql`
  mutation CreateComment($postId: String!, $content: String!) {
    createComment(postId: $postId, content: $content) {
      id
      content
      createdAt
      updatedAt
      likesCount
      isLikedByMe
      user {
        id
        username
        firstName
        lastName
        photoUrl
      }
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($id: String!) {
    deleteComment(id: $id)
  }
`;

export const UPDATE_COMMENT = gql`
  mutation UpdateComment($id: String!, $content: String!) {
    updateComment(id: $id, content: $content) {
      id
      content
      createdAt
      updatedAt
      likesCount
      isLikedByMe
    }
  }
`;

export const TOGGLE_LIKE_COMMENT = gql`
  mutation ToggleCommentLike($commentId: String!) {
    toggleCommentLike(commentId: $commentId) {
      id
      likesCount
      isLikedByMe
    }
  }
`;
