import { gql } from '@apollo/client';

export const GET_JOB_OFFERS = gql`
  query GetJobOffers($limit: Int, $offset: Int) {
    jobOffers(limit: $limit, offset: $offset) {
      id
      title
      description
      location
      salary
      createdAt
      author {
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
    }
  }
`;

export const GET_PROFESSIONALS = gql`
  query GetProfessionalProfiles($limit: Int, $offset: Int) {
    professionalProfiles(limit: $limit, offset: $offset) {
      id
      profession
      description
      experienceYears
      user {
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
    }
  }
`;

export const CREATE_JOB_OFFER = gql`
  mutation CreateJobOffer($input: CreateJobOfferInput!) {
    createJobOffer(createJobOfferInput: $input) {
      id
      title
      description
      location
      salary
      createdAt
      author {
        id
        username
        photoUrl
      }
      media {
        url
        type
        order
      }
    }
  }
`;

export const UPSERT_PROFESSIONAL_PROFILE = gql`
  mutation UpsertProfessionalProfile($input: UpsertProfessionalProfileInput!) {
    upsertProfessionalProfile(upsertProfessionalProfileInput: $input) {
      id
      profession
      description
      experienceYears
      user {
        id
        username
        photoUrl
      }
      media {
        url
        type
        order
      }
    }
  }
`;

export const APPLY_TO_JOB = gql`
  mutation ApplyToJob($input: ApplyToJobInput!) {
    applyToJob(input: $input) {
      application {
        id
        status
        message
        cvUrl
        createdAt
        jobOffer {
          id
          title
        }
      }
      cvUploadUrl
      cvPublicUrl
    }
  }
`;

export const GET_MY_APPLICATIONS = gql`
  query GetMyApplications {
    myApplications {
      id
      status
      message
      cvUrl
      createdAt
      updatedAt
      jobOffer {
        id
        title
        location
        author {
          id
          firstName
          lastName
          photoUrl
        }
      }
    }
  }
`;

export const GET_JOB_APPLICATIONS = gql`
  query GetJobApplications($jobOfferId: ID!) {
    jobApplications(jobOfferId: $jobOfferId) {
      id
      status
      message
      cvUrl
      createdAt
      applicant {
        id
        firstName
        lastName
        username
        photoUrl
      }
    }
  }
`;

export const UPDATE_APPLICATION_STATUS = gql`
  mutation UpdateApplicationStatus($input: UpdateApplicationStatusInput!) {
    updateApplicationStatus(input: $input) {
      id
      status
      updatedAt
      applicant {
        id
        firstName
        lastName
      }
    }
  }
`;

export const GET_MY_JOB_OFFERS = gql`
  query GetMyJobOffers {
    myJobOffers {
      id
      title
      description
      location
      salary
      contactPhone
      createdAt
      author {
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
    }
  }
`;

export const GET_MY_PROFESSIONAL_PROFILE = gql`
  query GetMyProfessionalProfile {
    myProfessionalProfile {
      id
      profession
      description
      experienceYears
      user {
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
    }
  }
`;

export const UPDATE_JOB_OFFER = gql`
  mutation UpdateJobOffer($input: UpdateJobOfferInput!) {
    updateJobOffer(input: $input) {
      id
      title
      description
      location
      salary
      contactPhone
      createdAt
      author {
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
    }
  }
`;

export const DELETE_JOB_OFFER = gql`
  mutation DeleteJobOffer($id: ID!) {
    deleteJobOffer(id: $id)
  }
`;
