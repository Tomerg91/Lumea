// Placeholder for resource-related API calls

export interface Resource {
  id: string;
  title: string;
  content: string; // Or maybe a URL, or structured content
  type: 'article' | 'video' | string; // Allow for other types but specify common ones
  // Add other fields like assignedClientIds, coachId, fileId, tags if they come from backend
  // and are needed on the frontend.
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const fetchResources = async (): Promise<Resource[]> => {
  console.log('Attempting to fetch resources from backend...');
  const response = await fetch(`${API_BASE_URL}/resources/`); // Note trailing slash
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch resources and parse error' }));
    throw new Error(errorData.message || 'Failed to fetch resources');
  }
  const data = await response.json();
  // Assuming backend returns an array of resources directly, or { resources: [] }
  // Ensure the structure matches the Resource type defined above.
  // This might require mapping if the backend structure is different.
  return data.resources || data || []; 
};

// Add other resource-related API functions if needed (e.g., createResource for admins) 