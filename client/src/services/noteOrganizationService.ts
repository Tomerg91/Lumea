import { 
  NoteCategory, 
  NoteFolder, 
  NoteTemplate, 
  NoteCollection, 
  NoteLinkage, 
  NoteOrganizationAnalytics 
} from '../types/coachNote';

class NoteOrganizationService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/notes/organization${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Request failed');
    }

    return response.json();
  }

  // === CATEGORIES ===
  async getCategories(): Promise<NoteCategory[]> {
    return this.request<NoteCategory[]>('/categories');
  }

  async createCategory(category: Omit<NoteCategory, '_id' | 'coachId' | 'createdAt' | 'updatedAt'>): Promise<NoteCategory> {
    return this.request<NoteCategory>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  }

  async updateCategory(categoryId: string, updates: Partial<NoteCategory>): Promise<NoteCategory> {
    return this.request<NoteCategory>(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCategory(categoryId: string): Promise<void> {
    return this.request<void>(`/categories/${categoryId}`, {
      method: 'DELETE',
    });
  }

  async reorderCategories(categoryIds: string[]): Promise<void> {
    return this.request<void>('/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ categoryIds }),
    });
  }

  // === FOLDERS ===
  async getFolders(): Promise<NoteFolder[]> {
    return this.request<NoteFolder[]>('/folders');
  }

  async createFolder(folder: Omit<NoteFolder, '_id' | 'coachId' | 'noteCount' | 'createdAt' | 'updatedAt'>): Promise<NoteFolder> {
    return this.request<NoteFolder>('/folders', {
      method: 'POST',
      body: JSON.stringify(folder),
    });
  }

  async updateFolder(folderId: string, updates: Partial<NoteFolder>): Promise<NoteFolder> {
    return this.request<NoteFolder>(`/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteFolder(folderId: string, moveNotesToFolderId?: string): Promise<void> {
    const params = moveNotesToFolderId ? `?moveToFolder=${moveNotesToFolderId}` : '';
    return this.request<void>(`/folders/${folderId}${params}`, {
      method: 'DELETE',
    });
  }

  async moveNotesToFolder(noteIds: string[], folderId: string | null): Promise<void> {
    return this.request<void>('/folders/move-notes', {
      method: 'PUT',
      body: JSON.stringify({ noteIds, folderId }),
    });
  }

  // === TEMPLATES ===
  async getTemplates(): Promise<NoteTemplate[]> {
    return this.request<NoteTemplate[]>('/templates');
  }

  async createTemplate(template: Omit<NoteTemplate, '_id' | 'coachId' | 'usageCount' | 'createdAt' | 'updatedAt'>): Promise<NoteTemplate> {
    return this.request<NoteTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updateTemplate(templateId: string, updates: Partial<NoteTemplate>): Promise<NoteTemplate> {
    return this.request<NoteTemplate>(`/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTemplate(templateId: string): Promise<void> {
    return this.request<void>(`/templates/${templateId}`, {
      method: 'DELETE',
    });
  }

  async incrementTemplateUsage(templateId: string): Promise<void> {
    return this.request<void>(`/templates/${templateId}/increment-usage`, {
      method: 'POST',
    });
  }

  // === COLLECTIONS ===
  async getCollections(): Promise<NoteCollection[]> {
    return this.request<NoteCollection[]>('/collections');
  }

  async createCollection(collection: Omit<NoteCollection, '_id' | 'coachId' | 'createdAt' | 'updatedAt'>): Promise<NoteCollection> {
    return this.request<NoteCollection>('/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
    });
  }

  async updateCollection(collectionId: string, updates: Partial<NoteCollection>): Promise<NoteCollection> {
    return this.request<NoteCollection>(`/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCollection(collectionId: string): Promise<void> {
    return this.request<void>(`/collections/${collectionId}`, {
      method: 'DELETE',
    });
  }

  async addNotesToCollection(collectionId: string, noteIds: string[]): Promise<void> {
    return this.request<void>(`/collections/${collectionId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ noteIds }),
    });
  }

  async removeNotesFromCollection(collectionId: string, noteIds: string[]): Promise<void> {
    return this.request<void>(`/collections/${collectionId}/notes`, {
      method: 'DELETE',
      body: JSON.stringify({ noteIds }),
    });
  }

  // === LINKAGES ===
  async getNoteLinkages(noteId: string): Promise<NoteLinkage[]> {
    return this.request<NoteLinkage[]>(`/linkages/${noteId}`);
  }

  async createNoteLinkage(linkage: Omit<NoteLinkage, '_id' | 'createdBy' | 'createdAt'>): Promise<NoteLinkage> {
    return this.request<NoteLinkage>('/linkages', {
      method: 'POST',
      body: JSON.stringify(linkage),
    });
  }

  async deleteNoteLinkage(linkageId: string): Promise<void> {
    return this.request<void>(`/linkages/${linkageId}`, {
      method: 'DELETE',
    });
  }

  async getRelatedNotes(noteId: string): Promise<{
    incoming: NoteLinkage[];
    outgoing: NoteLinkage[];
  }> {
    return this.request<{
      incoming: NoteLinkage[];
      outgoing: NoteLinkage[];
    }>(`/linkages/${noteId}/related`);
  }

  // === ANALYTICS ===
  async getOrganizationAnalytics(): Promise<NoteOrganizationAnalytics> {
    return this.request<NoteOrganizationAnalytics>('/analytics');
  }

  // === BULK OPERATIONS ===
  async bulkCategorizeNotes(noteIds: string[], categoryId: string | null): Promise<void> {
    return this.request<void>('/bulk/categorize', {
      method: 'PUT',
      body: JSON.stringify({ noteIds, categoryId }),
    });
  }

  async bulkMoveToFolder(noteIds: string[], folderId: string | null): Promise<void> {
    return this.request<void>('/bulk/move-folder', {
      method: 'PUT',
      body: JSON.stringify({ noteIds, folderId }),
    });
  }

  async bulkAddToCollection(noteIds: string[], collectionId: string): Promise<void> {
    return this.request<void>('/bulk/add-collection', {
      method: 'PUT',
      body: JSON.stringify({ noteIds, collectionId }),
    });
  }

  // === SYSTEM CATEGORIES AND TEMPLATES ===
  async initializeSystemCategories(): Promise<NoteCategory[]> {
    return this.request<NoteCategory[]>('/system/categories', {
      method: 'POST',
    });
  }

  async initializeSystemTemplates(): Promise<NoteTemplate[]> {
    return this.request<NoteTemplate[]>('/system/templates', {
      method: 'POST',
    });
  }
}

export const noteOrganizationService = new NoteOrganizationService(); 