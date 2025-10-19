import { apiClient } from "./axiosClient";

export interface Vacancy {
  id: number;
  title: string;
  city: string;
  description?: string;
  min_experience_years?: number;
  employment_type?: string;
  education_level?: string;
  languages?: string[];
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  skills?: string[];
  created_by?: number;
  salary?: number;
  experience?: string;
  requirements?: string[];
  createdAt?: string;
}

export interface CreateVacancyData {
  title: string;
  city: string;
  description?: string;
  min_experience_years?: number;
  employment_type?: string;
  education_level?: string;
  languages?: string[];
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  skills?: string[];
  salary?: number;
  experience?: string;
  requirements?: string[];
}

export interface VacancyFilters {
  q?: string;
  city?: string;
  minSalary?: number;
  maxSalary?: number;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface VacancyListResponse {
  items: Vacancy[];
  total: number;
}

export const vacancyService = {
  async list(filters: VacancyFilters = {}): Promise<VacancyListResponse> {
    const response = await apiClient.get("/vacancies", { params: filters });
    return response.data;
  },

  async getById(id: number | string): Promise<Vacancy> {
    const response = await apiClient.get(`/vacancies/${id}`);
    return response.data;
  },

  async create(data: CreateVacancyData): Promise<Vacancy> {
    const response = await apiClient.post("/vacancies", data);
    return response.data;
  },

  async update(id: number | string, data: Partial<CreateVacancyData>): Promise<Vacancy> {
    const response = await apiClient.patch(`/vacancies/${id}`, data);
    return response.data;
  },

  async delete(id: number | string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete(`/vacancies/${id}`);
    return response.data;
  },
};
