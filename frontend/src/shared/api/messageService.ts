import { apiClient } from './axiosClient';

export interface Message {
  id: number;
  session_id: number;
  sender: string;
  body: string;
  userId?: number;
  created_at: string;
}

export interface ChatSessionResponse {
  state: 'open' | 'closed';
  exists: boolean;
  sessionId?: number;
}

export const messageService = {
  async getMessages(applicationId: number | string): Promise<Message[]> {
    try {
      const response = await apiClient.get(`/applications/${applicationId}/messages`);
      
      // Ensure we return an array even if the response is invalid
      if (!response.data || !Array.isArray(response.data)) {
        console.warn('Invalid message history response:', response.data);
        return [];
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to load message history:', error);
      if (error.response?.status === 403) {
        throw new Error('You do not have permission to view these messages. Please make sure you are logged in.');
      }
      if (error.response?.status === 404) {
        // Application or messages not found - return empty array
        return [];
      }
      // For other errors, return empty array instead of throwing
      return [];
    }
  },

  async getChatSession(applicationId: number | string): Promise<ChatSessionResponse> {
    try {
      const response = await apiClient.get(`/applications/${applicationId}/session`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get chat session:', error);
      // Return default open state if endpoint fails
      return {
        state: 'open',
        exists: false,
      };
    }
  },

  // Create WebSocket connection for real-time chat
  createWebSocket(wsUrl: string): WebSocket {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
    const wsBaseUrl = baseUrl.replace('http', 'ws');
    return new WebSocket(`${wsBaseUrl}${wsUrl}`);
  },
};
