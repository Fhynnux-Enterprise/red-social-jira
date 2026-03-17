import { gql } from '@apollo/client';

export const GET_CONVERSATION = gql`
  query GetConversation($id_conversation: String!) {
    getConversation(id_conversation: $id_conversation) {
      id_conversation
      participants {
        user {
          id
          firstName
          lastName
          username
          photoUrl
          badge {
            title
          }
        }
      }
    }
  }
`;

export const GET_USER_CONVERSATIONS = gql`
  query GetUserConversations {
    getUserConversations {
      id_conversation
      updatedAt
      participants {
        user {
          id
          firstName
          lastName
          photoUrl
        }
      }
      lastMessage {
        content
        createdAt
      }
    }
  }
`;

export const GET_CHAT_MESSAGES = gql`
  query GetChatMessages($id_conversation: String!) {
    getChatMessages(id_conversation: $id_conversation) {
      id_message
      content
      createdAt
      isRead
      sender {
        id
      }
    }
  }
`;

export const GET_OR_CREATE_CHAT = gql`
  mutation GetOrCreateOneOnOneChat($targetUserId: String!) {
    getOrCreateOneOnOneChat(targetUserId: $targetUserId) {
      id_conversation
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($id_conversation: String!, $content: String!) {
    sendMessage(id_conversation: $id_conversation, content: $content) {
      id_message
      content
      createdAt
      isRead
      sender {
        id
      }
    }
  }
`;
