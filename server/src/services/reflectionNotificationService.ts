import { serverTables } from '../lib/supabase';
import { SupabaseNotificationService } from './supabaseNotificationService';
import { NotificationTemplates } from '../models/Notification';

export interface ReflectionNotificationData {
  reflectionId: string;
  clientId: string;
  sessionId?: string;
  content: string;
  mood?: string;
}

export class ReflectionNotificationService {
  private notificationService: SupabaseNotificationService;

  constructor() {
    this.notificationService = SupabaseNotificationService.getInstance();
  }

  /**
   * Send notification to coach when a client submits a reflection
   */
  async notifyCoachOfReflection(data: ReflectionNotificationData): Promise<boolean> {
    try {
      const { reflectionId, clientId, sessionId, content, mood } = data;

      // If no session_id, we can't determine the coach, so skip notification
      if (!sessionId) {
        console.log(`[ReflectionNotification] No session ID for reflection ${reflectionId}, skipping coach notification`);
        return true; // Not an error, just no notification needed
      }

      // Get session details to find the coach
      const { data: session, error: sessionError } = await serverTables.sessions()
        .select('id, coach_id, client_id, date')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error(`[ReflectionNotification] Session ${sessionId} not found:`, sessionError);
        return false;
      }

      // Get client details
      const { data: client, error: clientError } = await serverTables.users()
        .select('id, name, email')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        console.error(`[ReflectionNotification] Client ${clientId} not found:`, clientError);
        return false;
      }

      // Get coach details
      const { data: coach, error: coachError } = await serverTables.users()
        .select('id, name, email')
        .eq('id', session.coach_id)
        .single();

      if (coachError || !coach) {
        console.error(`[ReflectionNotification] Coach ${session.coach_id} not found:`, coachError);
        return false;
      }

      // Create reflection preview (first 150 characters)
      const reflectionPreview = content.length > 150 
        ? content.substring(0, 150) + '...' 
        : content;

      // Get the notification template
      const template = NotificationTemplates.reflection_submitted;
      
      // Prepare template variables
      const variables = {
        coachName: coach.name || 'Coach',
        clientName: client.name || 'Client',
        sessionDate: new Date(session.date).toLocaleDateString(),
        submittedAt: new Date().toLocaleString(),
        mood: mood || '',
        reflectionPreview,
        reflectionUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/reflections/${reflectionId}`,
      };

      // Replace template variables in subject and body
      const subject = this.replaceTemplateVariables(template.subject, variables);
      const htmlBody = this.replaceTemplateVariables(template.htmlBody, variables);
      const textBody = this.replaceTemplateVariables(template.textBody, variables);

      // Create notification record
      const notificationId = await this.notificationService.createNotification({
        recipient_id: coach.id,
        sender_id: client.id,
        session_id: sessionId,
        type: 'reflection_submitted',
        channel: 'email',
        subject,
        html_body: htmlBody,
        text_body: textBody,
        variables,
        priority: 'medium',
      });

      if (notificationId) {
        console.log(`[ReflectionNotification] Created notification ${notificationId} for coach ${coach.id} about reflection ${reflectionId}`);
        return true;
      } else {
        console.error(`[ReflectionNotification] Failed to create notification for reflection ${reflectionId}`);
        return false;
      }

    } catch (error) {
      console.error('[ReflectionNotification] Error sending reflection notification:', error);
      return false;
    }
  }

  /**
   * Replace template variables in a string using Handlebars-like syntax
   */
  private replaceTemplateVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Replace {{variable}} patterns
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });

    // Handle conditional blocks like {{#if mood}}...{{/if}}
    result = result.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, condition, content) => {
      return variables[condition] ? content : '';
    });

    return result;
  }
}

// Export singleton instance
export const reflectionNotificationService = new ReflectionNotificationService(); 