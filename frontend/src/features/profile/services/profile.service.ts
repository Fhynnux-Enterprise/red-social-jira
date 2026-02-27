import { apiClient } from '../../../api/axios.client';

export interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    photoUrl?: string | null;
}

export class ProfileService {
    static async getProfile(): Promise<UserProfile> {
        const response = await apiClient.get<UserProfile>('/auth/me');
        return response.data;
    }
}
