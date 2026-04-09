import { gql } from '@apollo/client';

export const GET_JOB_OFFERS = gql`
  query GetJobOffers($limit: Int, $offset: Int) {
    jobOffers(limit: $limit, offset: $offset) {
      id_job_offer
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
      id_professional_profile
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
    }
  }
`;

export const CREATE_JOB_OFFER = gql`
  mutation CreateJobOffer($input: CreateJobOfferInput!) {
    createJobOffer(createJobOfferInput: $input) {
      id_job_offer
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
      id_professional_profile
      profession
      description
      experienceYears
      user {
        id
        username
        photoUrl
      }
    }
  }
`;

export const APPLY_TO_JOB = gql`
  mutation ApplyToJob($input: ApplyToJobInput!) {
    applyToJob(input: $input) {
      application {
        id_job_application
        status
        message
        cvUrl
        createdAt
        jobOffer {
          id_job_offer
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
      id_job_application
      status
      message
      cvUrl
      createdAt
      updatedAt
      jobOffer {
        id_job_offer
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
  query GetJobApplications($id_job_offer: ID!) {
    jobApplications(id_job_offer: $id_job_offer) {
      id_job_application
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
      id_job_application
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
      id_job_offer
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

export const GET_MY_PROFESSIONAL_PROFILE = gql`
  query GetMyProfessionalProfile {
    myProfessionalProfile {
      id_professional_profile
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
    }
  }
`;
