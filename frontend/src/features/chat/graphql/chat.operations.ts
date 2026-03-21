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
      isDeletedForAll
      editedAt
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

export const DELETE_MESSAGE_FOR_ME = gql`
  mutation DeleteMessageForMe($id_message: String!) {
    deleteMessageForMe(id_message: $id_message)
  }
`;

export const DELETE_CONVERSATION_FOR_ME = gql`
  mutation DeleteConversationForMe($id_conversation: String!) {
    deleteConversationForMe(id_conversation: $id_conversation)
  }
`;

export const DELETE_MESSAGE_FOR_ALL = gql`
  mutation DeleteMessageForAll($id_message: String!) {
    deleteMessageForAll(id_message: $id_message)
  }
`;

export const EDIT_MESSAGE = gql`
  mutation EditMessage($id_message: String!, $newContent: String!) {
    editMessage(id_message: $id_message, newContent: $newContent) {
      id_message
      content
      editedAt
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
      isDeletedForAll
      editedAt
      sender {
        id
      }
    }
  }
`;
