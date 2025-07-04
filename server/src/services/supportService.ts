import { QueueService } from './queueService';
import { BackupService } from './backupService';
import logger from '../utils/logger';

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  tags: string[];
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  internalNotes: SupportNote[];
  userMessages: SupportMessage[];
}

export interface SupportNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  isInternal: boolean;
}

export interface SupportMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  fromUser: boolean;
}

export interface UserFeedback {
  id: string;
  userId: string;
  userEmail: string;
  type: 'feature_request' | 'bug_report' | 'general_feedback' | 'satisfaction' | 'usability';
  rating?: number; // 1-5 stars
  content: string;
  page?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt: Date;
  status: 'new' | 'reviewed' | 'planned' | 'implemented' | 'rejected';
  adminResponse?: string;
  tags: string[];
}

export interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  priority: number;
  isPublished: boolean;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  views: number;
  helpful: number;
  notHelpful: number;
  relatedArticles: string[];
}

export interface AdminNotification {
  id: string;
  type: 'urgent_ticket' | 'system_alert' | 'high_priority_feedback' | 'security_alert' | 'backup_failed';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  data?: any;
  createdAt: Date;
  readBy: string[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export class SupportService {
  private static instance: SupportService;
  private queueService: QueueService;
  private supportTickets: Map<string, SupportTicket> = new Map();
  private userFeedback: Map<string, UserFeedback> = new Map();
  private helpArticles: Map<string, HelpArticle> = new Map();
  private adminNotifications: Map<string, AdminNotification> = new Map();

  constructor() {
    this.queueService = QueueService.getInstance();
    this.initializeDefaultHelpArticles();
  }

  public static getInstance(): SupportService {
    if (!SupportService.instance) {
      SupportService.instance = new SupportService();
    }
    return SupportService.instance;
  }

  /**
   * Support Ticket Management
   */
  public async createSupportTicket(ticketData: Omit<SupportTicket, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'internalNotes' | 'userMessages'>): Promise<SupportTicket> {
    const ticketId = this.generateId('ticket');
    
    const ticket: SupportTicket = {
      ...ticketData,
      id: ticketId,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      internalNotes: [],
      userMessages: []
    };

    this.supportTickets.set(ticketId, ticket);

    // Send confirmation email to user
    await this.queueService.addEmailJob({
      to: ticket.userEmail,
      subject: `Support Ticket Created - ${ticket.subject}`,
      text: `Your support ticket has been created. Reference ID: ${ticketId}`,
      html: this.generateTicketConfirmationEmail(ticket)
    });

    // Notify admins for high/urgent priority tickets
    if (ticket.priority === 'high' || ticket.priority === 'urgent') {
      await this.createAdminNotification({
        type: 'urgent_ticket',
        title: `${ticket.priority.toUpperCase()} Priority Ticket Created`,
        message: `New ${ticket.priority} priority ticket: ${ticket.subject}`,
        severity: ticket.priority === 'urgent' ? 'critical' : 'warning',
        data: { ticketId, userId: ticket.userId }
      });
    }

    logger.info('Support ticket created', { ticketId, userId: ticket.userId, priority: ticket.priority });
    return ticket;
  }

  public async updateTicketStatus(ticketId: string, status: SupportTicket['status'], adminId?: string): Promise<SupportTicket> {
    const ticket = this.supportTickets.get(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updatedAt = new Date();

    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
    }

    this.supportTickets.set(ticketId, ticket);

    // Notify user of status change
    await this.queueService.addEmailJob({
      to: ticket.userEmail,
      subject: `Support Ticket Update - ${ticket.subject}`,
      text: `Your support ticket status has been updated from ${oldStatus} to ${status}`,
      html: this.generateTicketUpdateEmail(ticket, oldStatus)
    });

    logger.info('Support ticket status updated', { ticketId, oldStatus, newStatus: status, adminId });
    return ticket;
  }

  public addTicketMessage(ticketId: string, authorId: string, authorName: string, content: string, fromUser: boolean = false): SupportMessage {
    const ticket = this.supportTickets.get(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const message: SupportMessage = {
      id: this.generateId('message'),
      authorId,
      authorName,
      content,
      createdAt: new Date(),
      fromUser
    };

    ticket.userMessages.push(message);
    ticket.updatedAt = new Date();
    this.supportTickets.set(ticketId, ticket);

    return message;
  }

  public getSupportTickets(filters?: {
    status?: SupportTicket['status'];
    priority?: SupportTicket['priority'];
    category?: SupportTicket['category'];
    assignedTo?: string;
    limit?: number;
  }): SupportTicket[] {
    let tickets = Array.from(this.supportTickets.values());

    if (filters?.status) tickets = tickets.filter(t => t.status === filters.status);
    if (filters?.priority) tickets = tickets.filter(t => t.priority === filters.priority);
    if (filters?.category) tickets = tickets.filter(t => t.category === filters.category);
    if (filters?.assignedTo) tickets = tickets.filter(t => t.assignedTo === filters.assignedTo);

    tickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) tickets = tickets.slice(0, filters.limit);

    return tickets;
  }

  /**
   * User Feedback Management
   */
  public async submitUserFeedback(feedbackData: Omit<UserFeedback, 'id' | 'createdAt' | 'status' | 'tags'>): Promise<UserFeedback> {
    const feedbackId = this.generateId('feedback');
    
    const feedback: UserFeedback = {
      ...feedbackData,
      id: feedbackId,
      createdAt: new Date(),
      status: 'new',
      tags: []
    };

    this.userFeedback.set(feedbackId, feedback);

    // Auto-categorize and tag feedback
    feedback.tags = this.autoTagFeedback(feedback);

    // Send confirmation email
    await this.queueService.addEmailJob({
      to: feedback.userEmail,
      subject: 'Thank you for your feedback',
      text: 'We appreciate your feedback and will review it carefully.',
      html: this.generateFeedbackConfirmationEmail(feedback)
    });

    // Notify admins for high-priority feedback
    if (feedback.type === 'bug_report' || (feedback.rating && feedback.rating <= 2)) {
      await this.createAdminNotification({
        type: 'high_priority_feedback',
        title: 'High Priority Feedback Received',
        message: `${feedback.type}: ${feedback.content.substring(0, 100)}...`,
        severity: 'warning',
        data: { feedbackId, userId: feedback.userId }
      });
    }

    logger.info('User feedback submitted', { feedbackId, type: feedback.type, rating: feedback.rating });
    return feedback;
  }

  public getUserFeedback(filters?: {
    type?: UserFeedback['type'];
    status?: UserFeedback['status'];
    rating?: number;
    limit?: number;
  }): UserFeedback[] {
    let feedback = Array.from(this.userFeedback.values());

    if (filters?.type) feedback = feedback.filter(f => f.type === filters.type);
    if (filters?.status) feedback = feedback.filter(f => f.status === filters.status);
    if (filters?.rating) feedback = feedback.filter(f => f.rating === filters.rating);

    feedback.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) feedback = feedback.slice(0, filters.limit);

    return feedback;
  }

  /**
   * Help Documentation Management
   */
  public createHelpArticle(articleData: Omit<HelpArticle, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'helpful' | 'notHelpful'>): HelpArticle {
    const articleId = this.generateId('article');
    
    const article: HelpArticle = {
      ...articleData,
      id: articleId,
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      helpful: 0,
      notHelpful: 0
    };

    this.helpArticles.set(articleId, article);
    
    logger.info('Help article created', { articleId, title: article.title });
    return article;
  }

  public getHelpArticles(filters?: {
    category?: string;
    published?: boolean;
    searchTerm?: string;
  }): HelpArticle[] {
    let articles = Array.from(this.helpArticles.values());

    if (filters?.category) articles = articles.filter(a => a.category === filters.category);
    if (filters?.published !== undefined) articles = articles.filter(a => a.isPublished === filters.published);
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      articles = articles.filter(a => 
        a.title.toLowerCase().includes(term) ||
        a.content.toLowerCase().includes(term) ||
        a.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    articles.sort((a, b) => a.priority - b.priority);
    return articles;
  }

  public recordArticleView(articleId: string): void {
    const article = this.helpArticles.get(articleId);
    if (article) {
      article.views++;
      this.helpArticles.set(articleId, article);
    }
  }

  public recordArticleFeedback(articleId: string, helpful: boolean): void {
    const article = this.helpArticles.get(articleId);
    if (article) {
      if (helpful) {
        article.helpful++;
      } else {
        article.notHelpful++;
      }
      this.helpArticles.set(articleId, article);
    }
  }

  /**
   * Admin Notifications
   */
  public async createAdminNotification(notificationData: Omit<AdminNotification, 'id' | 'createdAt' | 'readBy' | 'acknowledged'>): Promise<AdminNotification> {
    const notificationId = this.generateId('notification');
    
    const notification: AdminNotification = {
      ...notificationData,
      id: notificationId,
      createdAt: new Date(),
      readBy: [],
      acknowledged: false
    };

    this.adminNotifications.set(notificationId, notification);

    // Send notification email to admins
    await this.queueService.addNotificationJob({
      userId: 'admin',
      type: 'system_alert',
      data: notification
    });

    logger.info('Admin notification created', { notificationId, type: notification.type, severity: notification.severity });
    return notification;
  }

  public getAdminNotifications(filters?: {
    type?: AdminNotification['type'];
    severity?: AdminNotification['severity'];
    acknowledged?: boolean;
    limit?: number;
  }): AdminNotification[] {
    let notifications = Array.from(this.adminNotifications.values());

    if (filters?.type) notifications = notifications.filter(n => n.type === filters.type);
    if (filters?.severity) notifications = notifications.filter(n => n.severity === filters.severity);
    if (filters?.acknowledged !== undefined) notifications = notifications.filter(n => n.acknowledged === filters.acknowledged);

    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) notifications = notifications.slice(0, filters.limit);

    return notifications;
  }

  /**
   * Analytics and Reporting
   */
  public getSupportAnalytics(): {
    ticketStats: any;
    feedbackStats: any;
    helpArticleStats: any;
    responseTimeStats: any;
  } {
    const tickets = Array.from(this.supportTickets.values());
    const feedback = Array.from(this.userFeedback.values());
    const articles = Array.from(this.helpArticles.values());

    return {
      ticketStats: {
        total: tickets.length,
        byStatus: this.groupBy(tickets, 'status'),
        byPriority: this.groupBy(tickets, 'priority'),
        byCategory: this.groupBy(tickets, 'category'),
        avgResolutionTime: this.calculateAvgResolutionTime(tickets)
      },
      feedbackStats: {
        total: feedback.length,
        byType: this.groupBy(feedback, 'type'),
        avgRating: this.calculateAvgRating(feedback),
        satisfactionTrend: this.getSatisfactionTrend(feedback)
      },
      helpArticleStats: {
        total: articles.length,
        totalViews: articles.reduce((sum, a) => sum + a.views, 0),
        avgHelpfulness: this.calculateArticleHelpfulness(articles),
        topArticles: articles.sort((a, b) => b.views - a.views).slice(0, 10)
      },
      responseTimeStats: this.calculateResponseTimeStats(tickets)
    };
  }

  /**
   * Private Helper Methods
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private autoTagFeedback(feedback: UserFeedback): string[] {
    const tags: string[] = [];
    const content = feedback.content.toLowerCase();

    // Auto-tag based on content
    if (content.includes('slow') || content.includes('performance')) tags.push('performance');
    if (content.includes('bug') || content.includes('error')) tags.push('bug');
    if (content.includes('ui') || content.includes('interface')) tags.push('ui');
    if (content.includes('mobile')) tags.push('mobile');
    if (content.includes('email')) tags.push('email');
    if (content.includes('payment') || content.includes('billing')) tags.push('billing');

    // Auto-tag based on rating
    if (feedback.rating) {
      if (feedback.rating <= 2) tags.push('negative');
      else if (feedback.rating >= 4) tags.push('positive');
    }

    return tags;
  }

  private generateTicketConfirmationEmail(ticket: SupportTicket): string {
    return `
      <h2>Support Ticket Created</h2>
      <p>Hello ${ticket.userName},</p>
      <p>Your support ticket has been created successfully.</p>
      <p><strong>Ticket ID:</strong> ${ticket.id}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p>We'll get back to you as soon as possible.</p>
    `;
  }

  private generateTicketUpdateEmail(ticket: SupportTicket, oldStatus: string): string {
    return `
      <h2>Support Ticket Update</h2>
      <p>Hello ${ticket.userName},</p>
      <p>Your support ticket status has been updated.</p>
      <p><strong>Ticket ID:</strong> ${ticket.id}</p>
      <p><strong>Status:</strong> ${oldStatus} → ${ticket.status}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
    `;
  }

  private generateFeedbackConfirmationEmail(feedback: UserFeedback): string {
    return `
      <h2>Thank You for Your Feedback</h2>
      <p>We've received your feedback and truly appreciate you taking the time to share your thoughts with us.</p>
      <p><strong>Feedback Type:</strong> ${feedback.type}</p>
      ${feedback.rating ? `<p><strong>Rating:</strong> ${feedback.rating}/5 stars</p>` : ''}
      <p>Our team will review your feedback carefully.</p>
    `;
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const group = item[key];
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateAvgResolutionTime(tickets: SupportTicket[]): number {
    const resolvedTickets = tickets.filter(t => t.resolvedAt);
    if (resolvedTickets.length === 0) return 0;

    const totalTime = resolvedTickets.reduce((sum, ticket) => {
      const resolutionTime = ticket.resolvedAt!.getTime() - ticket.createdAt.getTime();
      return sum + resolutionTime;
    }, 0);

    return totalTime / resolvedTickets.length / (1000 * 60 * 60); // Convert to hours
  }

  private calculateAvgRating(feedback: UserFeedback[]): number {
    const ratedFeedback = feedback.filter(f => f.rating);
    if (ratedFeedback.length === 0) return 0;

    const totalRating = ratedFeedback.reduce((sum, f) => sum + f.rating!, 0);
    return totalRating / ratedFeedback.length;
  }

  private getSatisfactionTrend(feedback: UserFeedback[]): any[] {
    // Group feedback by week and calculate average rating
    const weeklyData = new Map();
    
    feedback.forEach(f => {
      if (f.rating) {
        const week = this.getWeekKey(f.createdAt);
        if (!weeklyData.has(week)) {
          weeklyData.set(week, { total: 0, count: 0 });
        }
        const data = weeklyData.get(week);
        data.total += f.rating;
        data.count += 1;
      }
    });

    return Array.from(weeklyData.entries()).map(([week, data]) => ({
      week,
      avgRating: data.total / data.count
    })).sort((a, b) => a.week.localeCompare(b.week));
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private calculateArticleHelpfulness(articles: HelpArticle[]): number {
    const articlesWithFeedback = articles.filter(a => a.helpful + a.notHelpful > 0);
    if (articlesWithFeedback.length === 0) return 0;

    const totalHelpful = articlesWithFeedback.reduce((sum, a) => sum + a.helpful, 0);
    const totalFeedback = articlesWithFeedback.reduce((sum, a) => sum + a.helpful + a.notHelpful, 0);

    return (totalHelpful / totalFeedback) * 100;
  }

  private calculateResponseTimeStats(tickets: SupportTicket[]): any {
    // Calculate first response time statistics
    const respondedTickets = tickets.filter(t => t.userMessages.length > 0);
    
    const responseTimes = respondedTickets.map(ticket => {
      const firstResponse = ticket.userMessages.find(m => !m.fromUser);
      if (firstResponse) {
        return firstResponse.createdAt.getTime() - ticket.createdAt.getTime();
      }
      return null;
    }).filter(time => time !== null);

    if (responseTimes.length === 0) {
      return { avgFirstResponse: 0, medianFirstResponse: 0 };
    }

    const avgFirstResponse = responseTimes.reduce((sum, time) => sum + time!, 0) / responseTimes.length;
    const sortedTimes = responseTimes.sort((a, b) => a! - b!);
    const medianFirstResponse = sortedTimes[Math.floor(sortedTimes.length / 2)]!;

    return {
      avgFirstResponse: avgFirstResponse / (1000 * 60 * 60), // Convert to hours
      medianFirstResponse: medianFirstResponse / (1000 * 60 * 60) // Convert to hours
    };
  }

  private initializeDefaultHelpArticles(): void {
    const defaultArticles = [
      {
        title: 'Getting Started with SatyaCoaching',
        slug: 'getting-started',
        content: 'Learn how to use the SatyaCoaching platform effectively...',
        category: 'Getting Started',
        priority: 1,
        isPublished: true,
        authorId: 'system',
        tags: ['onboarding', 'basics'],
        relatedArticles: []
      },
      {
        title: 'How to Schedule Your First Session',
        slug: 'schedule-first-session',
        content: 'Step-by-step guide to scheduling your first coaching session...',
        category: 'Sessions',
        priority: 2,
        isPublished: true,
        authorId: 'system',
        tags: ['sessions', 'scheduling'],
        relatedArticles: []
      },
      {
        title: 'Understanding Your Coaching Journey',
        slug: 'coaching-journey',
        content: 'Learn about the coaching process and what to expect...',
        category: 'Coaching Process',
        priority: 3,
        isPublished: true,
        authorId: 'system',
        tags: ['coaching', 'process'],
        relatedArticles: []
      }
    ];

    defaultArticles.forEach(article => {
      this.createHelpArticle(article);
    });
  }
} 