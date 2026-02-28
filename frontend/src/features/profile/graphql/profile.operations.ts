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
