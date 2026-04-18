import { gql } from '@apollo/client';

export const GET_MY_NOTIFICATIONS = gql`
    query GetMyNotifications($limit: Int, $offset: Int) {
        getMyNotifications(limit: $limit, offset: $offset) {
            id
            title
            message
            type
            isRead
            createdAt
        }
    }
`;

export const MARK_AS_READ = gql`
    mutation MarkNotificationAsRead($id: ID!) {
        markNotificationAsRead(id: $id) {
            id
            isRead
        }
    }
`;

export const GET_UNREAD_NOTIFICATIONS_COUNT = gql`
    query GetUnreadNotificationsCount {
        getUnreadNotificationsCount
    }
`;

export const CREATE_APPEAL = gql`
    mutation CreateAppeal($input: CreateAppealInput!) {
        createAppeal(input: $input) {
            id
            reason
            status
            type
            referenceId
            createdAt
        }
    }
`;
