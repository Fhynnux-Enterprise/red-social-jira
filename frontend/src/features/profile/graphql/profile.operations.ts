import { gql } from '@apollo/client';

export const ADD_CUSTOM_FIELD = gql`
  mutation AddCustomField($title: String!, $value: String!) {
    addCustomField(title: $title, value: $value) {
      id
      title
      value
      isVisible
    }
  }
`;

export const UPDATE_CUSTOM_FIELD = gql`
  mutation UpdateCustomField($id: String!, $title: String!, $value: String!) {
    updateCustomField(id: $id, title: $title, value: $value) {
      id
      title
      value
      isVisible
    }
  }
`;

export const DELETE_CUSTOM_FIELD = gql`
  mutation DeleteCustomField($id: String!) {
    deleteCustomField(id: $id)
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($firstName: String, $lastName: String, $bio: String, $username: String, $phone: String) {
    updateProfile(firstName: $firstName, lastName: $lastName, bio: $bio, username: $username, phone: $phone) {
      id
      firstName
      lastName
      bio
      username
      phone
    }
  }
`;

export const UPDATE_BADGE = gql`
  mutation UpdateBadge($title: String!, $theme: String) {
    updateBadge(title: $title, theme: $theme) {
      id
      title
      theme
    }
  }
`;

export const GET_USER_PROFILE = gql`
  query GetUserProfile($id: String!, $limit: Int, $offset: Int) {
    getUserProfile(id: $id) {
      id
      firstName
      lastName
      username
      email
      bio
      phone
      photoUrl
      coverUrl
      role
      bannedUntil
      banReason
      isBlockedByMe
      theyBlockedMe
      customFields {
        id
        title
        value
        isVisible
      }
      badge {
        id
        title
        theme
      }
      followersCount
      followingCount
      posts(limit: $limit, offset: $offset) {
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
        likes {
          id
          user {
            id
            firstName
            lastName
            photoUrl
          }
        }
        commentsCount
      }
    }
  }
`;

export const UPDATE_PROFILE_MEDIA = gql`
  mutation UpdateProfileMedia($photoUrl: String, $coverUrl: String) {
    updateProfileMedia(photoUrl: $photoUrl, coverUrl: $coverUrl) {
      id
      photoUrl
      coverUrl
    }
  }
`;

export const GET_ME = gql`
  query GetMe {
    me {
      id
      firstName
      lastName
      username
      email
      photoUrl
      coverUrl
    }
  }
`;

export const CREATE_REPORT = gql`
  mutation CreateReport($reportedItemId: ID!, $reportedItemType: ReportedItemType!, $reason: String!) {
    createReport(input: { reportedItemId: $reportedItemId, reportedItemType: $reportedItemType, reason: $reason }) {
      id
      reason
      status
    }
  }
`;

export const GET_MY_REPORT_STATUS = gql`
  query GetMyReportStatus($reportedItemId: ID!) {
    getMyReportStatus(reportedItemId: $reportedItemId) {
      id
      status
      reason
      createdAt
    }
  }
`;
