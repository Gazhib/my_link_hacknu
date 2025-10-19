import { apiClient } from './axiosClient';

export interface Application {
  id: number;
  vacancy_id: number;
  candidate_name: string;
  candidate_email: string;
  cv_file_path: string;
  relevance_score?: number;
  mismatch_reasons?: string;
  summary_text?: string;
  status?: string;
  created_at?: string;
}

export interface ApplicationDetails {
  _id: string;
  userId: string;
  createdAt: string;
  relevance_score: number;
  mismatch_reasons: string[];
  summary_text: string;
  relevanceScore: number;
  mismatchReasons: string[];
  summaryText: string;
  id?: number;
  vacancy_id?: number;
  candidate_name?: string;
  candidate_email?: string;
  status?: string;
}

export interface ApplicationListItem {
  id: number;
  vacancy_id: number;
  vacancy_title: string;
  relevance_score?: number;
  status?: string;
  created_at?: string;
}

export interface ApplicationSummary {
  relevance_score?: number;
  mismatch_reasons?: string[];
  summary_text?: string;
}

export interface CreateApplicationResponse {
  application_id: number;
  chat_token: string;
  ws_url: string;
}

export interface ApplicationListResponse {
  items: Application[];
  total: number;
}

export const applicationService = {
  async apply(vacancyId: number): Promise<CreateApplicationResponse> {
    const formData = new FormData();
    formData.append('vacancy_id', vacancyId.toString());
    
    const response = await apiClient.post('/applications', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getMyApplications(): Promise<ApplicationListItem[]> {
    const response = await apiClient.get('/applications/mine');
    return response.data;
  },

  async getSummary(applicationId: number): Promise<ApplicationSummary> {
    const response = await apiClient.get(`/applications/${applicationId}/summary`);
    return response.data;
  },

  async deleteApplication(applicationId: number): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete(`/applications/${applicationId}`);
    return response.data;
  },

  async getApplicationsForVacancy(vacancyId: number | string): Promise<Application[]> {
    const response = await apiClient.get(`/employer/vacancies/${vacancyId}/applications`);
    return response.data;
  },

  async acceptApplication(applicationId: number | string): Promise<void> {
    await apiClient.post(`/employer/applications/${applicationId}/accept`);
  },

  async rejectApplication(applicationId: number | string): Promise<void> {
    await apiClient.post(`/employer/applications/${applicationId}/reject`);
  },
};
