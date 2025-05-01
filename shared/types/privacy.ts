export interface PrivacySettings {
  id: string;
  userId: string;
  dataSharing: {
    shareReflections: boolean;
    shareProgress: boolean;
    sharePaymentHistory: boolean;
  };
  dataRetention: {
    deleteDataAfterDays: number | null; // null means keep forever
    autoDeleteReflections: boolean;
    autoDeleteResources: boolean;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePrivacySettingsDto {
  dataSharing?: {
    shareReflections?: boolean;
    shareProgress?: boolean;
    sharePaymentHistory?: boolean;
  };
  dataRetention?: {
    deleteDataAfterDays?: number | null;
    autoDeleteReflections?: boolean;
    autoDeleteResources?: boolean;
  };
  notifications?: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
}

export interface DataExportRequest {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  dataTypes: ('reflections' | 'sessions' | 'payments' | 'resources')[];
  format: 'json' | 'csv' | 'pdf';
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataExportRequestDto {
  dataTypes: ('reflections' | 'sessions' | 'payments' | 'resources')[];
  format: 'json' | 'csv' | 'pdf';
}

export interface DataDeletionRequest {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  dataTypes: ('reflections' | 'sessions' | 'payments' | 'resources' | 'all')[];
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataDeletionRequestDto {
  dataTypes: ('reflections' | 'sessions' | 'payments' | 'resources' | 'all')[];
  reason?: string;
}
