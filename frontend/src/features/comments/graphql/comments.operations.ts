import { gql } from '@apollo/client';

export const GET_COMMENTS = gql`
  query GetCommentsByPost($postId: String!, $limit: Int, $offset: Int) {
    getCommentsByPost(postId: $postId, limit: $limit, offset: $offset) {
      id
      content
      createdAt
      updatedAt
      editedAt
      likesCount
      isLikedByMe
      user {
        id
        username
        firstName
        lastName
        photoUrl
      }
      replies {
        id
        content
        createdAt
        updatedAt
        editedAt
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
  }
`;

export const CREATE_COMMENT = gql`
  mutation CreateComment($postId: String!, $content: String!, $parentId: String) {
    createComment(postId: $postId, content: $content, parentId: $parentId) {
      id
      content
      createdAt
      updatedAt
      editedAt
      likesCount
      isLikedByMe
      parentId
      user {
        id
        username
        firstName
        lastName
        photoUrl
      }
      replies {
        id
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
      editedAt
      likesCount
      isLikedByMe
      replies {
        id
      }
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
