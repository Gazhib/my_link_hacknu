import { apiClient } from './axiosClient';

export interface User {
  id: number;
  email: string;
  role: string;
  username?: string;
  cvUrl?: string;
}

export const userService = {
  async getMe(): Promise<User> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async getCVUrl(): Promise<string> {
    const response = await apiClient.get('/auth/me/cv-url');
    return response.data.url;
  },

  async updateCV(cvFile: File): Promise<User> {
    const formData = new FormData();
    formData.append('cv', cvFile);
    const response = await apiClient.post('/auth/me/cv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
