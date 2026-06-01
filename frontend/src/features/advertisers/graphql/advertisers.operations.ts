import { gql } from '@apollo/client';

const ADVERTISER_PERMISSION_FIELDS = gql`
  fragment AdvertiserPermissionFields on AdvertiserPermission {
    id
    userId
    isActive
    expiresAt
    maxAds
    grantedBy
    createdAt
    user {
      id
      username
      firstName
      lastName
      photoUrl
      email
      verificationType {
        id
        name
        iconUrl
      }
    }
  }
`;

const LOCAL_AD_FIELDS = gql`
  fragment LocalAdFields on LocalAd {
    id
    advertiserId
    title
    description
    actionUrl
    actionLabel
    whatsappPhone
    isActive
    views
    clicks
    createdAt
    advertiser {
      id
      username
      firstName
      lastName
      photoUrl
      verificationType {
        id
        name
        iconUrl
      }
    }
    media {
      id
      url
      type
      thumbnailUrl
    }
  }
`;

export const GET_ADVERTISER_PERMISSIONS = gql`
  ${ADVERTISER_PERMISSION_FIELDS}
  query GetAdvertiserPermissions($search: String, $limit: Int, $offset: Int) {
    getAdvertiserPermissions(search: $search, limit: $limit, offset: $offset) {
      ...AdvertiserPermissionFields
    }
  }
`;

export const GET_ADVERTISER_ADS = gql`
  ${LOCAL_AD_FIELDS}
  query GetAdvertiserAds($userId: String!) {
    getAdvertiserAds(userId: $userId) {
      ...LocalAdFields
    }
  }
`;

export const GET_ALL_LOCAL_ADS = gql`
  ${LOCAL_AD_FIELDS}
  query GetAllLocalAds {
    getAllLocalAds {
      ...LocalAdFields
    }
  }
`;

export const GRANT_ADVERTISER_PERMISSION = gql`
  ${ADVERTISER_PERMISSION_FIELDS}
  mutation GrantAdvertiserPermission($input: GrantAdvertiserInput!) {
    grantAdvertiserPermission(input: $input) {
      ...AdvertiserPermissionFields
    }
  }
`;

export const UPDATE_ADVERTISER_PERMISSION = gql`
  ${ADVERTISER_PERMISSION_FIELDS}
  mutation UpdateAdvertiserPermission($input: UpdateAdvertiserPermissionInput!) {
    updateAdvertiserPermission(input: $input) {
      ...AdvertiserPermissionFields
    }
  }
`;

export const REVOKE_ADVERTISER_PERMISSION = gql`
  mutation RevokeAdvertiserPermission($id: String!) {
    revokeAdvertiserPermission(id: $id)
  }
`;

export const TOGGLE_LOCAL_AD = gql`
  ${LOCAL_AD_FIELDS}
  mutation ToggleLocalAd($id: String!, $isActive: Boolean!) {
    toggleLocalAd(id: $id, isActive: $isActive) {
      ...LocalAdFields
    }
  }
`;

export const DELETE_LOCAL_AD = gql`
  mutation DeleteLocalAd($id: String!) {
    deleteLocalAd(id: $id)
  }
`;

export const UPDATE_LOCAL_AD = gql`
  mutation UpdateLocalAd($input: UpdateLocalAdInput!) {
    updateLocalAd(input: $input) {
      ...LocalAdFields
    }
  }
  ${LOCAL_AD_FIELDS}
`;

export const HAS_ADVERTISER_PERMISSION = gql`
  query HasAdvertiserPermission {
    hasAdvertiserPermission
  }
`;

export const GET_MY_ADS = gql`
  ${LOCAL_AD_FIELDS}
  query GetMyAds {
    getMyAds {
      ...LocalAdFields
    }
  }
`;

export const CREATE_LOCAL_AD = gql`
  ${LOCAL_AD_FIELDS}
  mutation CreateLocalAd($input: CreateLocalAdInput!) {
    createLocalAd(input: $input) {
      ...LocalAdFields
    }
  }
`;

export const GET_MY_ADVERTISER_PERMISSION = gql`
  ${ADVERTISER_PERMISSION_FIELDS}
  query GetMyAdvertiserPermission {
    getMyAdvertiserPermission {
      ...AdvertiserPermissionFields
    }
  }
`;
