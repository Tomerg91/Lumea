import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealtimeService } from '../services/realtimeService';

// Mock the supabase import
vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(),
    },
  },
}));

// Import the mocked module
import { supabase } from '../lib/supabase';

// Get typed mocks
const mockSupabase = vi.mocked(supabase);

describe('RealtimeService', () => {
  let realtimeService: RealtimeService;
  let mockChannel: any;

  beforeEach(() => {
    // Create mock channel for each test
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };

    vi.clearAllMocks();
    mockSupabase.channel.mockReturnValue(mockChannel);
    
    realtimeService = new RealtimeService();
  });

  afterEach(() => {
    realtimeService.forceDisconnect();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      expect(realtimeService.getConnectionStatus()).toBe(false);
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(0);
      expect(realtimeService.getActiveChannels()).toEqual([]);
    });

    it('should set up auth state change listener', () => {
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('subscriptions', () => {
    const mockHandler = vi.fn();
    const mockUserId = 'test-user-id';

    beforeEach(() => {
      // Simulate user authentication
      const authCallback = vi.mocked(mockSupabase.auth.onAuthStateChange).mock.calls[0][0];
      authCallback('SIGNED_IN', { user: { id: mockUserId } } as any);
    });

    it('should subscribe to notifications', () => {
      const unsubscribe = realtimeService.subscribeToNotifications(mockHandler);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`notifications:${mockUserId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${mockUserId}`,
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalledWith(expect.any(Function));

      expect(realtimeService.getActiveSubscriptionsCount()).toBe(1);
      expect(realtimeService.getActiveChannels()).toContain(`notifications:${mockUserId}`);

      // Test unsubscribe
      unsubscribe();
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('should subscribe to sessions', () => {
      const unsubscribe = realtimeService.subscribeToSessions(mockHandler);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`sessions:${mockUserId}`);
      expect(mockChannel.on).toHaveBeenCalledTimes(2); // Both client and coach filters
      expect(mockChannel.subscribe).toHaveBeenCalledWith(expect.any(Function));

      expect(realtimeService.getActiveSubscriptionsCount()).toBe(1);

      unsubscribe();
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('should subscribe to reflections', () => {
      const unsubscribe = realtimeService.subscribeToReflections(mockHandler);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`reflections:${mockUserId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reflections',
          filter: `user_id=eq.${mockUserId}`,
        },
        expect.any(Function)
      );

      unsubscribe();
    });

    it('should subscribe to coach notes', () => {
      const unsubscribe = realtimeService.subscribeToCoachNotes(mockHandler);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`coach_notes:${mockUserId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coach_notes',
          filter: `coach_id=eq.${mockUserId}`,
        },
        expect.any(Function)
      );

      unsubscribe();
    });

    it('should subscribe to shared coach notes', () => {
      const unsubscribe = realtimeService.subscribeToSharedCoachNotes(mockHandler);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`shared_coach_notes:${mockUserId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coach_notes',
          filter: `client_id=eq.${mockUserId}`,
        },
        expect.any(Function)
      );

      unsubscribe();
    });

    it('should subscribe to custom table', () => {
      const tableName = 'custom_table';
      const filter = 'user_id=eq.test';
      const channelSuffix = 'custom';

      const unsubscribe = realtimeService.subscribeToTable(
        tableName,
        filter,
        mockHandler,
        channelSuffix
      );

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `${tableName}:${mockUserId}:${channelSuffix}`
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: filter,
        },
        expect.any(Function)
      );

      unsubscribe();
    });

    it('should prevent duplicate subscriptions', () => {
      const unsubscribe1 = realtimeService.subscribeToNotifications(mockHandler);
      const unsubscribe2 = realtimeService.subscribeToNotifications(mockHandler);

      // Should only create one channel
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(1);

      unsubscribe1();
      unsubscribe2();
    });

    it('should not subscribe when user is not authenticated', () => {
      // Simulate user sign out
      const authCallback = vi.mocked(mockSupabase.auth.onAuthStateChange).mock.calls[0][0];
      authCallback('SIGNED_OUT', null);

      const unsubscribe = realtimeService.subscribeToNotifications(mockHandler);

      expect(mockSupabase.channel).not.toHaveBeenCalled();
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(0);

      unsubscribe(); // Should not throw
    });
  });

  describe('connection management', () => {
    it('should track connection status', () => {
      expect(realtimeService.getConnectionStatus()).toBe(false);
      
      // Connection status changes are typically managed by Supabase
      // We can test the getter/setter functionality if exposed
    });

    it('should force disconnect all channels', () => {
      const mockHandler = vi.fn();
      
      // Simulate authenticated user
      const authCallback = vi.mocked(mockSupabase.auth.onAuthStateChange).mock.calls[0][0];
      authCallback('SIGNED_IN', { user: { id: 'test-user' } } as any);
      
      // Create some subscriptions
      realtimeService.subscribeToNotifications(mockHandler);
      realtimeService.subscribeToSessions(mockHandler);
      
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(2);
      
      // Force disconnect
      realtimeService.forceDisconnect();
      
      // All channels should be removed
      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(2);
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(0);
      expect(realtimeService.getActiveChannels()).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle subscription errors gracefully', () => {
      const mockHandler = vi.fn();
      
      // Simulate authenticated user
      const authCallback = vi.mocked(mockSupabase.auth.onAuthStateChange).mock.calls[0][0];
      authCallback('SIGNED_IN', { user: { id: 'test-user' } } as any);
      
      // Mock channel subscription to throw error
      mockChannel.subscribe.mockImplementation(() => {
        throw new Error('Subscription failed');
      });
      
      // Should not throw when subscription fails
      expect(() => {
        realtimeService.subscribeToNotifications(mockHandler);
      }).not.toThrow();
    });

    it('should handle unsubscribe errors gracefully', () => {
      const mockHandler = vi.fn();
      
      // Simulate authenticated user
      const authCallback = vi.mocked(mockSupabase.auth.onAuthStateChange).mock.calls[0][0];
      authCallback('SIGNED_IN', { user: { id: 'test-user' } } as any);
      
      const unsubscribe = realtimeService.subscribeToNotifications(mockHandler);
      
      // Mock removeChannel to throw error
      mockSupabase.removeChannel.mockImplementation(() => {
        throw new Error('Remove channel failed');
      });
      
      // Should not throw when unsubscribe fails
      expect(() => {
        unsubscribe();
      }).not.toThrow();
    });
  });

  describe('channel management', () => {
    it('should return active channels list', () => {
      const mockHandler = vi.fn();
      const mockUserId = 'test-user-id';
      
      // Simulate authenticated user
      const authCallback = vi.mocked(mockSupabase.auth.onAuthStateChange).mock.calls[0][0];
      authCallback('SIGNED_IN', { user: { id: mockUserId } } as any);
      
      // Subscribe to multiple services
      const unsubscribe1 = realtimeService.subscribeToNotifications(mockHandler);
      const unsubscribe2 = realtimeService.subscribeToSessions(mockHandler);
      
      const activeChannels = realtimeService.getActiveChannels();
      expect(activeChannels).toContain(`notifications:${mockUserId}`);
      expect(activeChannels).toContain(`sessions:${mockUserId}`);
      expect(activeChannels).toHaveLength(2);
      
      unsubscribe1();
      unsubscribe2();
    });

    it('should return correct subscription count', () => {
      const mockHandler = vi.fn();
      const mockUserId = 'test-user-id';
      
      // Simulate authenticated user
      const authCallback = vi.mocked(mockSupabase.auth.onAuthStateChange).mock.calls[0][0];
      authCallback('SIGNED_IN', { user: { id: mockUserId } } as any);
      
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(0);
      
      const unsubscribe1 = realtimeService.subscribeToNotifications(mockHandler);
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(1);
      
      const unsubscribe2 = realtimeService.subscribeToSessions(mockHandler);
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(2);
      
      unsubscribe1();
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(1);
      
      unsubscribe2();
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(0);
    });
  });
}); 