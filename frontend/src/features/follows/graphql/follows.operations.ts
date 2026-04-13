import { gql } from '@apollo/client';

export const TOGGLE_FOLLOW = gql`
  mutation ToggleFollow($followingId: String!) {
    toggleFollow(followingId: $followingId)
  }
`;

export const IS_FOLLOWING = gql`
  query IsFollowing($followingId: String!) {
    isFollowing(followingId: $followingId)
  }
`;

export const GET_FOLLOWERS = gql`
  query GetFollowers($userId: String!) {
    getFollowers(userId: $userId) {
      id
      firstName
      lastName
      username
      photoUrl
    }
  }
`;

export const GET_FOLLOWING = gql`
  query GetFollowing($userId: String!) {
    getFollowing(userId: $userId) {
      id
      firstName
      lastName
      username
      photoUrl
      lastActiveAt
    }
  }
`;

export const GET_ONLINE_FOLLOWING = gql`
  query GetOnlineFollowing {
    getOnlineFollowing {
      id
      firstName
      lastName
      username
      photoUrl
      lastActiveAt
    }
  }
`;

export const GET_ONLINE_FOLLOWING_COUNT = gql`
  query GetOnlineFollowingCount {
    getOnlineFollowingCount
  }
`;
