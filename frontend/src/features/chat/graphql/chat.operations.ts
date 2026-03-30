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
          lastActiveAt
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
          lastActiveAt
        }
      }
      lastMessage {
        content
        imageUrl
        videoUrl
        createdAt
      }
      unreadCount
    }
  }
`;

export const GET_CHAT_MESSAGES = gql`
  query GetChatMessages($id_conversation: String!, $limit: Float, $offset: Float) {
    getChatMessages(id_conversation: $id_conversation, limit: $limit, offset: $offset) {
      id_message
      content
      imageUrl
      videoUrl
      createdAt
      isRead
      isDeletedForAll
      editedAt
      storyId
      sender {
        id
      }
    }
  }
`;

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription OnMessageAdded($id_conversation: String!) {
    messageAdded(id_conversation: $id_conversation) {
      id_message
      content
      imageUrl
      videoUrl
      createdAt
      isRead
      isDeletedForAll
      editedAt
      storyId
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
  mutation SendMessage($id_conversation: String!, $content: String, $imageUrl: String, $videoUrl: String, $storyId: String) {
    sendMessage(id_conversation: $id_conversation, content: $content, imageUrl: $imageUrl, videoUrl: $videoUrl, storyId: $storyId) {
      id_message
      content
      imageUrl
      videoUrl
      createdAt
      isRead
      isDeletedForAll
      editedAt
      storyId
      sender {
        id
      }
    }
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($searchTerm: String!) {
    searchUsers(searchTerm: $searchTerm) {
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
`;

export const SEARCH_MESSAGES_IN_CHAT = gql`
  query SearchMessagesInChat($id_conversation: String!, $searchTerm: String!) {
    searchMessagesInChat(id_conversation: $id_conversation, searchTerm: $searchTerm) {
      id_message
    }
  }
`;

export const MARK_MESSAGES_AS_READ = gql`
  mutation MarkMessagesAsRead($id_conversation: String!) {
    markMessagesAsRead(id_conversation: $id_conversation)
  }
`;

export const MESSAGES_READ_SUBSCRIPTION = gql`
  subscription OnMessagesRead($id_conversation: String!) {
    messagesRead(id_conversation: $id_conversation) {
      id_conversation
      readerId
    }
  }
`;export const INBOX_UPDATE_SUBSCRIPTION = gql`
  subscription OnInboxUpdate {
    inboxUpdate {
      id_message
      content
      imageUrl
      videoUrl
      createdAt
      id_conversation
      storyId
      sender {
        id
      }
    }
  }
`;

export const GET_CHAT_MEDIA = gql`
  query GetChatMedia($id_conversation: String!) {
    getChatMedia(id_conversation: $id_conversation) {
      id_message
      imageUrl
      videoUrl
    }
  }
`;
