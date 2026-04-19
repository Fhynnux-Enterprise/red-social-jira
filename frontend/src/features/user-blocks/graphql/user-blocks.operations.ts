import { gql } from '@apollo/client';

export const BLOCK_USER = gql`
  mutation BlockUser($userId: String!) {
    blockUser(userId: $userId) {
      id
      blockerId
      blockedId
      createdAt
    }
  }
`;

export const UNBLOCK_USER = gql`
  mutation UnblockUser($userId: String!) {
    unblockUser(userId: $userId)
  }
`;

export const GET_MY_BLOCKED_USERS = gql`
  query GetMyBlockedUsers($limit: Float, $offset: Float) {
    getMyBlockedUsers(limit: $limit, offset: $offset) {
      id
      username
      firstName
      lastName
      photoUrl
    }
  }
`;
