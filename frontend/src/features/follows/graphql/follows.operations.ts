import { gql } from '@apollo/client';

export const TOGGLE_FOLLOW = gql`
  mutation ToggleFollow($id_following: String!) {
    toggleFollow(id_following: $id_following)
  }
`;

export const IS_FOLLOWING = gql`
  query IsFollowing($id_following: String!) {
    isFollowing(id_following: $id_following)
  }
`;

export const GET_FOLLOWERS = gql`
  query GetFollowers($id_user: String!) {
    getFollowers(id_user: $id_user) {
      id
      firstName
      lastName
      username
      photoUrl
    }
  }
`;

export const GET_FOLLOWING = gql`
  query GetFollowing($id_user: String!) {
    getFollowing(id_user: $id_user) {
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
