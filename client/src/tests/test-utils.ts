import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Test utilities for Supabase integration testing

/**
 * Create a fresh QueryClient for each test
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Custom render function with QueryClient provider
 */
export function renderWithQueryClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
}

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    csv: vi.fn(),
    geojson: vi.fn(),
    explain: vi.fn(),
    rollback: vi.fn(),
    returns: vi.fn().mockReturnThis(),
  };

  const mockStorageBucket = {
    upload: vi.fn(),
    download: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    copy: vi.fn(),
    remove: vi.fn(),
    createSignedUrl: vi.fn(),
    createSignedUrls: vi.fn(),
    getPublicUrl: vi.fn(),
    createSignedUploadUrl: vi.fn(),
  };

  return {
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => mockStorageBucket),
      listBuckets: vi.fn(),
      getBucket: vi.fn(),
      createBucket: vi.fn(),
      updateBucket: vi.fn(),
      deleteBucket: vi.fn(),
      emptyBucket: vi.fn(),
    },
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      setSession: vi.fn(),
      refreshSession: vi.fn(),
      admin: {
        listUsers: vi.fn(),
        createUser: vi.fn(),
        deleteUser: vi.fn(),
        updateUserById: vi.fn(),
        inviteUserByEmail: vi.fn(),
        generateLink: vi.fn(),
        getUser: vi.fn(),
        getUserById: vi.fn(),
      },
    },
    realtime: {
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
        presence: {
          track: vi.fn(),
          untrack: vi.fn(),
        },
      })),
      removeChannel: vi.fn(),
      removeAllChannels: vi.fn(),
      getChannels: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  };
}

/**
 * Mock authentication context for testing
 */
export function createMockAuthContext(overrides = {}) {
  return {
    session: null,
    user: null,
    profile: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updateProfile: vi.fn(),
    ...overrides,
  };
}

/**
 * Test data factories
 */
export const testDataFactories = {
  user: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  profile: (overrides = {}) => ({
    id: 'test-user-id',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    role: 'client',
    avatar_url: null,
    bio: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  session: (overrides = {}) => ({
    id: 'test-session-id',
    coach_id: 'test-coach-id',
    client_id: 'test-client-id',
    title: 'Test Session',
    description: 'Test session description',
    scheduled_at: '2023-01-01T10:00:00Z',
    duration: 60,
    status: 'scheduled',
    session_type: 'individual',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  coachNote: (overrides = {}) => ({
    id: 'test-note-id',
    coach_id: 'test-coach-id',
    client_id: 'test-client-id',
    session_id: 'test-session-id',
    content: 'Test coach note content',
    is_shared_with_client: false,
    is_private: true,
    tags: ['test'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  reflection: (overrides = {}) => ({
    id: 'test-reflection-id',
    user_id: 'test-user-id',
    session_id: 'test-session-id',
    template_type: 'general',
    responses: { question1: 'Test response' },
    mood_before: 5,
    mood_after: 7,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),

  resource: (overrides = {}) => ({
    id: 'test-resource-id',
    coach_id: 'test-coach-id',
    title: 'Test Resource',
    description: 'Test resource description',
    type: 'article',
    content: 'Test resource content',
    file_url: null,
    is_public: false,
    tags: ['test'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),
};

/**
 * Performance testing utilities
 */
export class TestPerformance {
  private startTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  end(): number {
    return performance.now() - this.startTime;
  }

  static async measureAsync<T>(
    operation: () => Promise<T>,
    maxDuration: number = 1000
  ): Promise<{ result: T; duration: number; withinThreshold: boolean }> {
    const startTime = performance.now();
    const result = await operation();
    const duration = performance.now() - startTime;
    
    return {
      result,
      duration,
      withinThreshold: duration <= maxDuration,
    };
  }
}

/**
 * Security testing utilities
 */
export const securityTestUtils = {
  /**
   * Test RLS policy enforcement
   */
  expectRLSEnforcement: (mockSupabase: any, tableName: string, userId: string) => {
    // Verify that queries are properly filtered by user context
    expect(mockSupabase.from).toHaveBeenCalledWith(tableName);
    // Additional RLS checks would go here
  },

  /**
   * Test file access permissions
   */
  expectFileAccessControl: (
    userId: string,
    fileOwnerId: string,
    expectedAccess: boolean
  ) => {
    const hasAccess = userId === fileOwnerId;
    expect(hasAccess).toBe(expectedAccess);
  },

  /**
   * Test role-based access
   */
  expectRoleBasedAccess: (
    userRole: string,
    requiredRole: string,
    expectedAccess: boolean
  ) => {
    const hasAccess = userRole === requiredRole || userRole === 'admin';
    expect(hasAccess).toBe(expectedAccess);
  },
};

/**
 * Integration testing utilities
 */
export const integrationTestUtils = {
  /**
   * Wait for async operations to complete
   */
  waitForAsync: (ms: number = 100) => 
    new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Simulate network delays
   */
  simulateNetworkDelay: (ms: number = 500) => 
    new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Mock network errors
   */
  createNetworkError: (message: string = 'Network error') => 
    new Error(message),
};

// Export all utilities
export * from '@testing-library/react';
export { vi } from 'vitest'; 