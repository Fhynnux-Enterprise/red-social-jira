import { apiClient } from '../../../api/axios.client';

export const ProfileService = {
    async getProfile() {
        try {
            const response = await apiClient.get('/auth/me');
            return response.data;
        } catch (error) {
            throw error;
        }
    },
};
