import { gql } from '@apollo/client';

export const GET_NEXT_AD = gql`
  query GetNextAd {
    getNextAd {
      type
      localAd {
        id
        title
        description
        actionUrl
        actionLabel
        whatsappPhone
        advertiser {
          id
          firstName
          lastName
          username
          photoUrl
        }
        media {
          id
          url
          type
        }
      }
    }
  }
`;

export const REGISTER_AD_CLICK = gql`
  mutation RegisterAdClick($adId: String!) {
    registerAdClick(adId: $adId)
  }
`;

export const GET_AD_FREQUENCY = gql`
  query GetAdFrequency {
    getAdFrequency
  }
`;

export const UPDATE_AD_FREQUENCY = gql`
  mutation UpdateAdFrequency($frequency: Int!) {
    updateAdFrequency(frequency: $frequency)
  }
`;

export const GET_AD_PROBABILITY = gql`
  query GetAdProbability {
    getAdProbability
  }
`;

export const UPDATE_AD_PROBABILITY = gql`
  mutation UpdateAdProbability($probability: Int!) {
    updateAdProbability(probability: $probability)
  }
`;
