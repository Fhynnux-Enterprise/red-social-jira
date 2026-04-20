import { gql } from '@apollo/client';

export const CREATE_REPORT = gql`
    mutation CreateReport($input: CreateReportInput!) {
        createReport(input: $input) {
            id
            reason
            status
            reportedItemId
            reportedItemType
            createdAt
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
