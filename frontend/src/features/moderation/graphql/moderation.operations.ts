import { gql } from '@apollo/client';

export const GET_ALL_REPORTS = gql`
    query GetAllReports($limit: Int, $offset: Int) {
        getAllReports(limit: $limit, offset: $offset) {
            id
            reason
            status
            reportedItemId
            reportedItemType
            createdAt
            moderatorNote
            contentDeleted
            reporter {
                id
                firstName
                lastName
                username
                photoUrl
            }
        }
    }
`;

export const GET_PENDING_REPORTS = gql`
    query GetPendingReports($limit: Int, $offset: Int) {
        getPendingReports(limit: $limit, offset: $offset) {
            id
            reason
            status
            reportedItemId
            reportedItemType
            createdAt
            reporter {
                id
                firstName
                lastName
                username
                photoUrl
            }
        }
    }
`;

export const RESOLVE_REPORT = gql`
    mutation ResolveReport($input: ResolveReportInput!) {
        resolveReport(input: $input) {
            id
            status
            moderatorNote
        }
    }
`;

export const DISMISS_REPORT = gql`
    mutation DismissReport($reportId: ID!, $moderatorNote: String) {
        dismissReport(reportId: $reportId, moderatorNote: $moderatorNote) {
            id
            status
        }
    }
`;

export const DIRECT_MODERATE_CONTENT = gql`
    mutation DirectModerateContent($input: DirectModerateInput!) {
        directModerateContent(input: $input) {
            id
            status
            contentDeleted
            moderatorNote
        }
    }
`;

export const GET_POST_BY_ID = gql`
    query GetPostById($id: String!) {
        getPostById(id: $id) {
            id
            content
            title
            createdAt
            commentsCount
            author {
                id
                username
                firstName
                lastName
                photoUrl
                badge {
                    title
                    theme
                }
            }
            media {
                url
                type
                order
            }
            likes {
                user { id }
            }
        }
    }
`;

export const GET_STORE_PRODUCT_BY_ID = gql`
    query GetStoreProductById($id: ID!) {
        getStoreProductById(id: $id) {
            id
            title
            description
            price
            currency
            location
            contactPhone
            condition
            category
            isAvailable
            createdAt
            seller {
                id
                username
                firstName
                lastName
                photoUrl
            }
            media {
                url
                type
                order
            }
            likes {
                user { id }
            }
        }
    }
`;

export const GET_JOB_OFFER_BY_ID = gql`
    query GetJobOfferById($id: ID!) {
        getJobOfferById(id: $id) {
            id
            title
            description
            location
            salary
            contactPhone
            createdAt
            author {
                id
                firstName
                lastName
                photoUrl
            }
        }
    }
`;
