import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Types for real-time events
export interface RealtimeEvent<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
  table: string;
  schema: string;
}

// Event handlers type
export type EventHandler<T> = (event: RealtimeEvent<T>) => void;

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private isConnected = false;
  private currentUserId: string | null = null;

  constructor() {
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers() {
    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.currentUserId = session.user.id;
        this.connect();
      } else if (event === 'SIGNED_OUT') {
        this.currentUserId = null;
        this.disconnect();
      }
    });
  }

  private async connect() {
    if (this.isConnected || !this.currentUserId) return;

    try {
      console.log('[RealtimeService] Connecting to real-time features...');
      this.isConnected = true;
    } catch (error) {
      console.error('[RealtimeService] Failed to connect:', error);
      this.isConnected = false;
    }
  }

  private disconnect() {
    console.log('[RealtimeService] Disconnecting from real-time features...');
    
    // Unsubscribe from all channels
    this.channels.forEach((channel, channelName) => {
      console.log(`[RealtimeService] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
    });
    
    this.channels.clear();
    this.isConnected = false;
  }

  // Subscribe to notifications for the current user
  subscribeToNotifications(handler: EventHandler<any>): () => void {
    if (!this.currentUserId) {
      console.warn('[RealtimeService] Cannot subscribe to notifications: user not authenticated');
      return () => {};
    }

    const channelName = `notifications:${this.currentUserId}`;
    
    if (this.channels.has(channelName)) {
      console.log(`[RealtimeService] Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${this.currentUserId}`
        },
        (payload: any) => {
          console.log('[RealtimeService] Notification event:', payload);
          handler({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            table: payload.table,
            schema: payload.schema
          });
        }
      )
      .subscribe((status) => {
        console.log(`[RealtimeService] Notifications subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  // Subscribe to session updates for the current user
  subscribeToSessions(handler: EventHandler<any>): () => void {
    if (!this.currentUserId) {
      console.warn('[RealtimeService] Cannot subscribe to sessions: user not authenticated');
      return () => {};
    }

    const channelName = `sessions:${this.currentUserId}`;
    
    if (this.channels.has(channelName)) {
      console.log(`[RealtimeService] Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `client_id=eq.${this.currentUserId}`
        },
        (payload: any) => {
          console.log('[RealtimeService] Session event (client):', payload);
          handler({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            table: payload.table,
            schema: payload.schema
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `coach_id=eq.${this.currentUserId}`
        },
        (payload: any) => {
          console.log('[RealtimeService] Session event (coach):', payload);
          handler({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            table: payload.table,
            schema: payload.schema
          });
        }
      )
      .subscribe((status) => {
        console.log(`[RealtimeService] Sessions subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  // Subscribe to reflections for the current user
  subscribeToReflections(handler: EventHandler<any>): () => void {
    if (!this.currentUserId) {
      console.warn('[RealtimeService] Cannot subscribe to reflections: user not authenticated');
      return () => {};
    }

    const channelName = `reflections:${this.currentUserId}`;
    
    if (this.channels.has(channelName)) {
      console.log(`[RealtimeService] Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reflections',
          filter: `user_id=eq.${this.currentUserId}`
        },
        (payload: any) => {
          console.log('[RealtimeService] Reflection event:', payload);
          handler({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            table: payload.table,
            schema: payload.schema
          });
        }
      )
      .subscribe((status) => {
        console.log(`[RealtimeService] Reflections subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  // Subscribe to coach notes (for coaches only)
  subscribeToCoachNotes(handler: EventHandler<any>): () => void {
    if (!this.currentUserId) {
      console.warn('[RealtimeService] Cannot subscribe to coach notes: user not authenticated');
      return () => {};
    }

    const channelName = `coach_notes:${this.currentUserId}`;
    
    if (this.channels.has(channelName)) {
      console.log(`[RealtimeService] Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coach_notes',
          filter: `coach_id=eq.${this.currentUserId}`
        },
        (payload: any) => {
          console.log('[RealtimeService] Coach note event:', payload);
          handler({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            table: payload.table,
            schema: payload.schema
          });
        }
      )
      .subscribe((status) => {
        console.log(`[RealtimeService] Coach notes subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  // Subscribe to shared coach notes (for clients to see non-private notes)
  subscribeToSharedCoachNotes(handler: EventHandler<any>): () => void {
    if (!this.currentUserId) {
      console.warn('[RealtimeService] Cannot subscribe to shared coach notes: user not authenticated');
      return () => {};
    }

    const channelName = `shared_coach_notes:${this.currentUserId}`;
    
    if (this.channels.has(channelName)) {
      console.log(`[RealtimeService] Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coach_notes',
          filter: `client_id=eq.${this.currentUserId}`
        },
        (payload: any) => {
          // Only handle non-private notes for clients
          if (payload.new && !payload.new.is_private) {
            console.log('[RealtimeService] Shared coach note event:', payload);
            handler({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: payload.table,
              schema: payload.schema
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`[RealtimeService] Shared coach notes subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  // Generic subscription method for custom tables
  subscribeToTable<T>(
    tableName: string,
    filter: string | null,
    handler: EventHandler<T>,
    channelSuffix?: string
  ): () => void {
    if (!this.currentUserId) {
      console.warn(`[RealtimeService] Cannot subscribe to ${tableName}: user not authenticated`);
      return () => {};
    }

    const channelName = `${tableName}:${this.currentUserId}${channelSuffix ? `:${channelSuffix}` : ''}`;
    
    if (this.channels.has(channelName)) {
      console.log(`[RealtimeService] Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    const subscriptionConfig: any = {
      event: '*',
      schema: 'public',
      table: tableName
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', subscriptionConfig, (payload: any) => {
        console.log(`[RealtimeService] ${tableName} event:`, payload);
        handler({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
          table: payload.table,
          schema: payload.schema
        });
      })
      .subscribe((status) => {
        console.log(`[RealtimeService] ${tableName} subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  // Unsubscribe from a specific channel
  private unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      console.log(`[RealtimeService] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Get active subscriptions count
  getActiveSubscriptionsCount(): number {
    return this.channels.size;
  }

  // Get list of active channel names
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  // Force disconnect (useful for cleanup)
  forceDisconnect() {
    this.disconnect();
  }
}

// Create and export singleton instance
export const realtimeService = new RealtimeService();

// Export the class for testing
export { RealtimeService }; 