import { authClient, apiClient } from './axiosClient';

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  confirmPassword: string;
  role?: string;
}

export interface UserPayload {
  id: number;
  email: string;
  role: string;
}

export interface AuthResponse {
  role: string;
  email: string;
}

export const authService = {
  async login(data: LoginData): Promise<UserPayload> {
    const response = await authClient.post<AuthResponse>('/auth/login', {
      email: data.username,
      password: data.password,
    });
    
    // Token is now in HTTPOnly cookie, no need to store it
    // Just return the user data
    return {
      id: 0, // Will be fetched from /auth/me
      email: response.data.email,
      role: response.data.role,
    };
  },

  async register(data: RegisterData): Promise<UserPayload> {
    // Map frontend role to backend role
    const roleMap: Record<string, string> = {
      'CANDIDATE': 'user',
      'RECRUITER': 'employer',
      'ADMIN': 'admin',
    };
    
    const response = await authClient.post<AuthResponse>('/auth/register', {
      email: data.username,
      password: data.password,
      role: roleMap[data.role || 'CANDIDATE'] || 'user',
    });
    
    // Token is now in HTTPOnly cookie, no need to store it
    return {
      id: 0,
      email: response.data.email,
      role: response.data.role,
    };
  },

  async me(): Promise<UserPayload> {
    // Cookie will be sent automatically
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    // Call backend logout to clear the cookie
    await authClient.post('/auth/logout');
  },

  // Check if user is authenticated by calling /auth/me
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.me();
      return true;
    } catch {
      return false;
    }
  },
};
