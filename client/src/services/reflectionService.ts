import { 
  ReflectionTemplateType,
  GetReflectionFormResponse,
  SaveReflectionRequest,
  SaveReflectionResponse,
  Reflection 
} from '../types/reflection';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

class ReflectionService {
  // Get available reflection templates
  async getAvailableTemplates(): Promise<{ type: ReflectionTemplateType; name: string; description: string; estimatedMinutes: number }[]> {
    const response = await fetch(`${API_BASE}/reflections/templates`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get templates: ${response.statusText}`);
    }

    const data = await response.json();
    return data.templates;
  }

  // Get reflection form for a session
  async getReflectionForm(
    sessionId: string, 
    templateType: ReflectionTemplateType = 'standard'
  ): Promise<GetReflectionFormResponse> {
    const response = await fetch(
      `${API_BASE}/reflections/form/${sessionId}?template=${templateType}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get reflection form: ${response.statusText}`);
    }

    return response.json();
  }

  // Get existing reflection for a session
  async getReflection(sessionId: string): Promise<Reflection> {
    const response = await fetch(`${API_BASE}/reflections/${sessionId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No reflection found for this session');
      }
      throw new Error(`Failed to get reflection: ${response.statusText}`);
    }

    return response.json();
  }

  // Save or update reflection
  async saveReflection(
    sessionId: string, 
    data: SaveReflectionRequest
  ): Promise<SaveReflectionResponse> {
    const response = await fetch(`${API_BASE}/reflections/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to save reflection: ${response.statusText}`);
    }

    return response.json();
  }

  // Update existing reflection
  async updateReflection(
    sessionId: string, 
    data: SaveReflectionRequest
  ): Promise<SaveReflectionResponse> {
    const response = await fetch(`${API_BASE}/reflections/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update reflection: ${response.statusText}`);
    }

    return response.json();
  }

  // Delete reflection (drafts only)
  async deleteReflection(sessionId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/reflections/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete reflection: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all reflections for current client
  async getClientReflections(page = 1, limit = 10): Promise<{
    reflections: Reflection[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const response = await fetch(
      `${API_BASE}/reflections/client/all?page=${page}&limit=${limit}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get client reflections: ${response.statusText}`);
    }

    return response.json();
  }

  // Get reflections for coach (submitted only)
  async getCoachReflections(page = 1, limit = 10, clientId?: string): Promise<{
    reflections: Reflection[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    let url = `${API_BASE}/reflections/coach/all?page=${page}&limit=${limit}`;
    if (clientId) {
      url += `&clientId=${clientId}`;
    }

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get coach reflections: ${response.statusText}`);
    }

    return response.json();
  }
}

export const reflectionService = new ReflectionService(); 