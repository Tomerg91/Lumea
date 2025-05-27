import { API_BASE_URL } from '../lib/api';
import {
  SessionTemplate,
  CreateSessionTemplateRequest,
  UpdateSessionTemplateRequest,
  CloneTemplateRequest,
  TemplateUsageStats,
  GetTemplatesResponse,
  GetTemplatesParams,
} from '../types/sessionTemplate';

/**
 * Performs a fetch request to the API.
 * Handles common headers, base URL, and basic error handling.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Essential for session cookies!
  };

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.indexOf('application/json') !== -1) {
      data = await response.json();
    } else {
      const text = await response.text();
      if (response.ok) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text || 'Success' };
        }
      } else {
        data = { message: text || `HTTP error ${response.status}` };
      }
    }

    if (!response.ok) {
      throw new Error(data?.message || `HTTP error ${response.status}`);
    }

    return data as T;
  } catch (error) {
    console.error(`API fetch error for endpoint ${endpoint}:`, error);
    throw error;
  }
}

class SessionTemplateService {
  private baseUrl = '/session-templates';

  async getTemplates(params?: GetTemplatesParams): Promise<GetTemplatesResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${this.baseUrl}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return await apiFetch<GetTemplatesResponse>(url);
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw new Error('Failed to fetch session templates');
    }
  }

  async getTemplate(id: string): Promise<SessionTemplate> {
    try {
      return await apiFetch<SessionTemplate>(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error('Error fetching template:', error);
      throw new Error('Failed to fetch session template');
    }
  }

  async createTemplate(data: CreateSessionTemplateRequest): Promise<SessionTemplate> {
    try {
      return await apiFetch<SessionTemplate>(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error('Failed to create session template');
    }
  }

  async updateTemplate(id: string, data: UpdateSessionTemplateRequest): Promise<SessionTemplate> {
    try {
      return await apiFetch<SessionTemplate>(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error('Failed to update session template');
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      await apiFetch<void>(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete session template');
    }
  }

  async cloneTemplate(id: string, data: CloneTemplateRequest): Promise<SessionTemplate> {
    try {
      return await apiFetch<SessionTemplate>(`${this.baseUrl}/${id}/clone`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Error cloning template:', error);
      throw new Error('Failed to clone session template');
    }
  }

  async getTemplateUsageStats(id: string): Promise<TemplateUsageStats> {
    try {
      return await apiFetch<TemplateUsageStats>(`${this.baseUrl}/${id}/usage-stats`);
    } catch (error) {
      console.error('Error fetching template usage stats:', error);
      throw new Error('Failed to fetch template usage statistics');
    }
  }

  async generateSessionFromTemplate(
    templateId: string, 
    clientId: string, 
    customizations?: Record<string, any>
  ): Promise<any> {
    try {
      return await apiFetch<any>(`${this.baseUrl}/${templateId}/generate-session`, {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          customizations,
        }),
      });
    } catch (error) {
      console.error('Error generating session from template:', error);
      throw new Error('Failed to generate session from template');
    }
  }

  async customizeTemplate(
    templateId: string,
    clientId: string,
    customizations: Record<string, any>
  ): Promise<SessionTemplate> {
    try {
      return await apiFetch<SessionTemplate>(`${this.baseUrl}/${templateId}/customize`, {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          customizations,
        }),
      });
    } catch (error) {
      console.error('Error customizing template:', error);
      throw new Error('Failed to customize session template');
    }
  }
}

export const sessionTemplateService = new SessionTemplateService(); 