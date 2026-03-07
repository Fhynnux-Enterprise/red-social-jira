import { apiClient } from '../../../api/axios.client';

export interface UserCustomField {
    id: string;
    title: string;
    value: string;
    isVisible: boolean;
}

export interface UserBadge {
    id: string;
    title: string;
    theme: string;
}

export interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    bio?: string;
    phone?: string;
    photoUrl?: string | null;
    customFields?: UserCustomField[];
    badge?: UserBadge;
    posts?: any[]; // Temporal array of posts
}

export class ProfileService {
    static async getProfile(): Promise<UserProfile> {
        const response = await apiClient.get<UserProfile>('/auth/me');
        return response.data;
    }
}
