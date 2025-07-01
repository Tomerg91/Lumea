/**
 * Enhanced Authentication Service for Production
 * Provides comprehensive authentication with security features
 */

import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser extends User {
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    email_verified?: boolean;
    phone_verified?: boolean;
    two_factor_enabled?: boolean;
  };
}

export interface AuthSession extends Session {
  device_info?: {
    device_type: string;
    browser: string;
    os: string;
    ip_address?: string;
  };
}

export interface LoginAttempt {
  email: string;
  ip_address: string;
  user_agent: string;
  attempt_type: 'success' | 'failed' | 'blocked';
  failure_reason?: string;
  location?: {
    country?: string;
    city?: string;
  };
  created_at: string;
}

export interface SecurityPolicy {
  policy_name: string;
  policy_value: Record<string, any>;
  description: string;
  is_active: boolean;
}

export interface AuthProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'coach' | 'client';
  avatar_url?: string;
  language: 'he' | 'en';
  email_verified_at?: string;
  phone_number?: string;
  phone_verified_at?: string;
  two_factor_enabled: boolean;
  last_login_at?: string;
  last_login_ip?: string;
  login_count: number;
  account_locked_until?: string;
  failed_login_attempts: number;
  session_timeout_minutes: number;
  created_at: string;
  updated_at: string;
}

class EnhancedAuthService {
  private static instance: EnhancedAuthService;
  private currentUser: AuthUser | null = null;
  private currentSession: AuthSession | null = null;
  private deviceInfo: Record<string, string> = {};

  constructor() {
    this.initializeDeviceInfo();
    this.setupAuthListener();
  }

  static getInstance(): EnhancedAuthService {
    if (!EnhancedAuthService.instance) {
      EnhancedAuthService.instance = new EnhancedAuthService();
    }
    return EnhancedAuthService.instance;
  }

  /**
   * Initialize device information for security tracking
   */
  private initializeDeviceInfo(): void {
    const userAgent = navigator.userAgent;
    this.deviceInfo = {
      device_type: this.detectDeviceType(),
      browser: this.detectBrowser(userAgent),
      os: this.detectOS(userAgent),
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };
  }

  /**
   * Setup authentication state listener
   */
  private setupAuthListener(): void {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.currentUser = session.user as AuthUser;
        this.currentSession = session as AuthSession;
        
        // Track successful login
        await this.trackLoginAttempt(
          session.user.email!,
          'success'
        );
        
        // Update session info
        await this.updateSessionInfo(session);
        
        // Update last login information
        await this.updateLastLogin();
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        this.currentSession = null;
        
        // Clear local storage security data
        this.clearSecurityData();
      }
    });
  }

  /**
   * Enhanced sign in with security tracking
   */
  async signIn(email: string, password: string): Promise<{
    user: AuthUser | null;
    session: AuthSession | null;
    error: any;
  }> {
    try {
      // Check if account is locked
      const isLocked = await this.checkAccountLocked(email);
      if (isLocked) {
        const error = new Error('Account is temporarily locked due to too many failed login attempts');
        await this.trackLoginAttempt(email, 'blocked', 'Account locked');
        return { user: null, session: null, error };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Track failed login attempt
        await this.trackLoginAttempt(email, 'failed', error.message);
        
        // Increment failed login counter
        await this.incrementFailedLogins(email);
        
        return { user: null, session: null, error };
      }

      // Reset failed login counter on success
      await this.resetFailedLogins(email);

      return {
        user: data.user as AuthUser,
        session: data.session as AuthSession,
        error: null,
      };
    } catch (error) {
      console.error('Enhanced sign in error:', error);
      return { user: null, session: null, error };
    }
  }

  /**
   * Enhanced sign up with email verification
   */
  async signUp(
    email: string,
    password: string,
    userData: {
      full_name: string;
      role: 'coach' | 'client';
      language?: 'he' | 'en';
    }
  ): Promise<{
    user: AuthUser | null;
    session: AuthSession | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name,
            role: userData.role,
            language: userData.language || 'he',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        await this.trackLoginAttempt(email, 'failed', `Registration failed: ${error.message}`);
        return { user: null, session: null, error };
      }

      // Track successful registration
      await this.trackLoginAttempt(email, 'success', 'Registration completed');

      return {
        user: data.user as AuthUser,
        session: data.session as AuthSession,
        error: null,
      };
    } catch (error) {
      console.error('Enhanced sign up error:', error);
      return { user: null, session: null, error };
    }
  }

  /**
   * Sign out with session cleanup
   */
  async signOut(): Promise<{ error: any }> {
    try {
      // Clean up active session
      if (this.currentSession) {
        await this.deactivateSession(this.currentSession.access_token);
      }

      const { error } = await supabase.auth.signOut();
      
      if (!error) {
        this.clearSecurityData();
      }

      return { error };
    } catch (error) {
      console.error('Enhanced sign out error:', error);
      return { error };
    }
  }

  /**
   * Get current user with profile information
   */
  async getCurrentUser(): Promise<AuthProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return profile;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Update user profile with security validation
   */
  async updateProfile(updates: Partial<AuthProfile>): Promise<{ error: any }> {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.currentUser.id);

      if (!error) {
        // Log profile update
        await this.createAuditLog(
          'profile_updated',
          { updated_fields: Object.keys(updates) },
          true
        );
      }

      return { error };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error };
    }
  }

  /**
   * Change password with security requirements
   */
  async changePassword(newPassword: string): Promise<{ error: any }> {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      // Validate password strength
      const validationError = this.validatePasswordStrength(newPassword);
      if (validationError) {
        return { error: new Error(validationError) };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (!error) {
        // Update password changed timestamp
        await supabase
          .from('profiles')
          .update({
            password_changed_at: new Date().toISOString(),
            must_change_password: false,
          })
          .eq('id', this.currentUser.id);

        // Log password change
        await this.createAuditLog(
          'password_changed',
          { success: true },
          true
        );
      }

      return { error };
    } catch (error) {
      console.error('Change password error:', error);
      return { error };
    }
  }

  /**
   * Request password reset
   */
  async resetPassword(email: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      // Log password reset request
      await this.trackLoginAttempt(
        email,
        'success',
        'Password reset requested'
      );

      return { error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error };
    }
  }

  /**
   * Get user's active sessions
   */
  async getActiveSessions(): Promise<any[]> {
    try {
      if (!this.currentUser) return [];

      const { data } = await supabase
        .from('auth_sessions')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('Get active sessions error:', error);
      return [];
    }
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('auth_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (!error) {
        await this.createAuditLog(
          'session_revoked',
          { session_id: sessionId },
          true
        );
      }

      return { error };
    } catch (error) {
      console.error('Revoke session error:', error);
      return { error };
    }
  }

  /**
   * Get login history
   */
  async getLoginHistory(limit: number = 10): Promise<LoginAttempt[]> {
    try {
      if (!this.currentUser) return [];

      const { data } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('email', this.currentUser.email)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('Get login history error:', error);
      return [];
    }
  }

  /**
   * Security helper methods
   */
  private async trackLoginAttempt(
    email: string,
    type: 'success' | 'failed' | 'blocked',
    reason?: string
  ): Promise<void> {
    try {
      await supabase.rpc('track_login_attempt', {
        p_email: email,
        p_ip_address: await this.getClientIP(),
        p_user_agent: navigator.userAgent,
        p_attempt_type: type,
        p_failure_reason: reason,
        p_location: await this.getLocation(),
      });
    } catch (error) {
      console.error('Track login attempt error:', error);
    }
  }

  private async checkAccountLocked(email: string): Promise<boolean> {
    try {
      const { data } = await supabase.rpc('should_lock_account', {
        p_email: email,
      });
      return data || false;
    } catch (error) {
      console.error('Check account locked error:', error);
      return false;
    }
  }

  private async incrementFailedLogins(email: string): Promise<void> {
    try {
      await supabase.rpc('increment_failed_logins', {
        user_email: email
      });
    } catch (error) {
      console.error('Increment failed logins error:', error);
    }
  }

  private async resetFailedLogins(email: string): Promise<void> {
    try {
      await supabase
        .from('profiles')
        .update({
          failed_login_attempts: 0,
          account_locked_until: null,
        })
        .eq('email', email);
    } catch (error) {
      console.error('Reset failed logins error:', error);
    }
  }

  private async updateSessionInfo(session: any): Promise<void> {
    try {
      await supabase.from('auth_sessions').insert({
        user_id: session.user.id,
        token_hash: await this.hashToken(session.access_token),
        device_info: this.deviceInfo,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        location: await this.getLocation(),
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
      });
    } catch (error) {
      console.error('Update session info error:', error);
    }
  }

  private async updateLastLogin(): Promise<void> {
    try {
      if (!this.currentUser) return;

      await supabase.rpc('update_last_login', {
        user_id: this.currentUser.id,
        ip_address: await this.getClientIP()
      });
    } catch (error) {
      console.error('Update last login error:', error);
    }
  }

  private async deactivateSession(token: string): Promise<void> {
    try {
      const tokenHash = await this.hashToken(token);
      await supabase
        .from('auth_sessions')
        .update({ is_active: false })
        .eq('token_hash', tokenHash);
    } catch (error) {
      console.error('Deactivate session error:', error);
    }
  }

  private async createAuditLog(
    eventType: string,
    eventDetails: Record<string, any>,
    success: boolean,
    riskScore: number = 0
  ): Promise<void> {
    try {
      await supabase.rpc('create_auth_audit_log', {
        p_user_id: this.currentUser?.id || null,
        p_event_type: eventType,
        p_event_details: eventDetails,
        p_ip_address: await this.getClientIP(),
        p_user_agent: navigator.userAgent,
        p_success: success,
        p_risk_score: riskScore,
        p_location: await this.getLocation(),
      });
    } catch (error) {
      console.error('Create audit log error:', error);
    }
  }

  private validatePasswordStrength(password: string): string | null {
    if (password.length < 12) {
      return 'Password must be at least 12 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  }

  private clearSecurityData(): void {
    localStorage.removeItem('auth_session_info');
    sessionStorage.removeItem('auth_device_info');
  }

  private detectDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private detectBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private detectOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '127.0.0.1';
    }
  }

  private async getLocation(): Promise<Record<string, any>> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return {
        country: data.country_name,
        city: data.city,
        region: data.region,
      };
    } catch {
      return {};
    }
  }
}

// Export singleton instance
export const enhancedAuthService = EnhancedAuthService.getInstance();
export default enhancedAuthService;