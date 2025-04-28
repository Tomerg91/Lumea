export type ResourceType = 'Document' | 'Video' | 'Link' | 'Exercise';

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  url: string;
  coachId: string;
  clientIds: string[]; // List of clients who have access to this resource
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceDto {
  title: string;
  description: string;
  type: ResourceType;
  url: string;
  clientIds: string[];
  tags: string[];
}

export interface UpdateResourceDto {
  title?: string;
  description?: string;
  type?: ResourceType;
  url?: string;
  clientIds?: string[];
  tags?: string[];
} 