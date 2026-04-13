import { gql } from '@apollo/client';

export const GET_CONVERSATION = gql`
  query GetConversation($conversationId: String!) {
    getConversation(conversationId: $conversationId) {
      id
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
      id
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
  query GetChatMessages($conversationId: String!, $limit: Float, $offset: Float) {
    getChatMessages(conversationId: $conversationId, limit: $limit, offset: $offset) {
      id
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
  subscription OnMessageAdded($conversationId: String!) {
    messageAdded(conversationId: $conversationId) {
      id
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
      id
    }
  }
`;

export const DELETE_MESSAGE_FOR_ME = gql`
  mutation DeleteMessageForMe($messageId: String!) {
    deleteMessageForMe(messageId: $messageId)
  }
`;

export const DELETE_CONVERSATION_FOR_ME = gql`
  mutation DeleteConversationForMe($conversationId: String!) {
    deleteConversationForMe(conversationId: $conversationId)
  }
`;

export const DELETE_MESSAGE_FOR_ALL = gql`
  mutation DeleteMessageForAll($messageId: String!) {
    deleteMessageForAll(messageId: $messageId)
  }
`;

export const EDIT_MESSAGE = gql`
  mutation EditMessage($messageId: String!, $newContent: String!) {
    editMessage(messageId: $messageId, newContent: $newContent) {
      id
      content
      editedAt
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($conversationId: String!, $content: String, $imageUrl: String, $videoUrl: String, $storyId: String) {
    sendMessage(conversationId: $conversationId, content: $content, imageUrl: $imageUrl, videoUrl: $videoUrl, storyId: $storyId) {
      id
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
  query SearchMessagesInChat($conversationId: String!, $searchTerm: String!) {
    searchMessagesInChat(conversationId: $conversationId, searchTerm: $searchTerm) {
      id
    }
  }
`;

export const MARK_MESSAGES_AS_READ = gql`
  mutation MarkMessagesAsRead($conversationId: String!) {
    markMessagesAsRead(conversationId: $conversationId)
  }
`;

export const MESSAGES_READ_SUBSCRIPTION = gql`
  subscription OnMessagesRead($conversationId: String!) {
    messagesRead(conversationId: $conversationId) {
      conversationId
      readerId
    }
  }
`;

export const INBOX_UPDATE_SUBSCRIPTION = gql`
  subscription OnInboxUpdate {
    inboxUpdate {
      id
      content
      imageUrl
      videoUrl
      createdAt
      conversationId
      storyId
      sender {
        id
      }
    }
  }
`;

export const GET_CHAT_MEDIA = gql`
  query GetChatMedia($conversationId: String!) {
    getChatMedia(conversationId: $conversationId) {
      id
      imageUrl
      videoUrl
    }
  }
`;
