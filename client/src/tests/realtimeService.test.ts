import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealtimeService } from '../services/realtimeService';

// Mock Supabase
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

const mockSupabase = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
  auth: {
    onAuthStateChange: vi.fn(),
  },
};

// Mock the supabase import
vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('RealtimeService', () => {
  let realtimeService: RealtimeService;

  beforeEach(() => {
    vi.clearAllMocks();
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
      const authCallback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
      authCallback('SIGNED_IN', { user: { id: mockUserId } });
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
      const authCallback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
      authCallback('SIGNED_OUT', null);

      const unsubscribe = realtimeService.subscribeToNotifications(mockHandler);

      expect(mockSupabase.channel).not.toHaveBeenCalled();
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(0);

      unsubscribe(); // Should not throw
    });
  });

  describe('connection management', () => {
    it('should handle auth state changes', () => {
      const authCallback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
      const mockUserId = 'test-user-id';

      // Sign in
      authCallback('SIGNED_IN', { user: { id: mockUserId } });
      expect(realtimeService.getConnectionStatus()).toBe(true);

      // Sign out
      authCallback('SIGNED_OUT', null);
      expect(realtimeService.getConnectionStatus()).toBe(false);
    });

    it('should disconnect all channels on sign out', () => {
      const authCallback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
      const mockUserId = 'test-user-id';

      // Sign in and create subscriptions
      authCallback('SIGNED_IN', { user: { id: mockUserId } });
      realtimeService.subscribeToNotifications(vi.fn());
      realtimeService.subscribeToSessions(vi.fn());

      expect(realtimeService.getActiveSubscriptionsCount()).toBe(2);

      // Sign out
      authCallback('SIGNED_OUT', null);

      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(2);
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(0);
    });

    it('should force disconnect', () => {
      const authCallback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
      authCallback('SIGNED_IN', { user: { id: 'test-user-id' } });

      realtimeService.subscribeToNotifications(vi.fn());
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(1);

      realtimeService.forceDisconnect();

      expect(mockSupabase.removeChannel).toHaveBeenCalled();
      expect(realtimeService.getActiveSubscriptionsCount()).toBe(0);
      expect(realtimeService.getConnectionStatus()).toBe(false);
    });
  });

  describe('event handling', () => {
    it('should handle notification events', () => {
      const mockHandler = vi.fn();
      const mockUserId = 'test-user-id';

      // Sign in
      const authCallback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
      authCallback('SIGNED_IN', { user: { id: mockUserId } });

      realtimeService.subscribeToNotifications(mockHandler);

      // Get the event handler that was passed to the channel
      const eventHandler = mockChannel.on.mock.calls[0][2];

      // Simulate a notification event
      const mockPayload = {
        eventType: 'INSERT',
        new: { id: '1', subject: 'Test notification' },
        old: null,
        table: 'notifications',
        schema: 'public',
      };

      eventHandler(mockPayload);

      expect(mockHandler).toHaveBeenCalledWith({
        eventType: 'INSERT',
        new: { id: '1', subject: 'Test notification' },
        old: null,
        table: 'notifications',
        schema: 'public',
      });
    });

    it('should filter private coach notes for shared subscription', () => {
      const mockHandler = vi.fn();
      const mockUserId = 'test-user-id';

      // Sign in
      const authCallback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
      authCallback('SIGNED_IN', { user: { id: mockUserId } });

      realtimeService.subscribeToSharedCoachNotes(mockHandler);

      // Get the event handler
      const eventHandler = mockChannel.on.mock.calls[0][2];

      // Test private note (should not trigger handler)
      eventHandler({
        eventType: 'INSERT',
        new: { id: '1', is_private: true, content: 'Private note' },
        old: null,
        table: 'coach_notes',
        schema: 'public',
      });

      expect(mockHandler).not.toHaveBeenCalled();

      // Test public note (should trigger handler)
      eventHandler({
        eventType: 'INSERT',
        new: { id: '2', is_private: false, content: 'Public note' },
        old: null,
        table: 'coach_notes',
        schema: 'public',
      });

      expect(mockHandler).toHaveBeenCalledWith({
        eventType: 'INSERT',
        new: { id: '2', is_private: false, content: 'Public note' },
        old: null,
        table: 'coach_notes',
        schema: 'public',
      });
    });
  });
}); 