import { PrismaClient, Prisma } from '@prisma/client';
import { EmailService } from './emailService.js';

const prisma = new PrismaClient();
const emailService = new EmailService();

type SessionWithClient = {
  id: string;
  date: Date;
  status: string;
  reminderSent: boolean;
  client: {
    name: string | null;
    email: string;
  };
};

type PaymentWithUsers = {
  id: string;
  amount: number;
  status: string;
  dueDate: Date;
  reminderSent: boolean;
  client: {
    name: string | null;
    email: string;
  };
  coach: {
    name: string | null;
    email: string;
  };
};

export class ReminderService {
  private static instance: ReminderService;
  private constructor() {}

  public static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  public async sendSessionReminders(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const sessions = await prisma.session.findMany({
        where: {
          date: {
            gte: tomorrow,
            lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
          },
          status: 'Upcoming',
          reminderSent: false,
        },
        include: {
          client: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      for (const session of sessions) {
        await this.sendSessionReminder(session as unknown as SessionWithClient);
      }
    } catch (error) {
      console.error('Error sending session reminders:', error);
    }
  }

  public async sendPaymentReminders(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overduePayments = await prisma.payment.findMany({
        where: {
          dueDate: {
            lt: today,
          },
          status: 'Due',
          reminderSent: false,
        },
        include: {
          client: {
            select: {
              name: true,
              email: true,
            },
          },
          coach: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      for (const payment of overduePayments) {
        await this.sendPaymentReminder(payment as unknown as PaymentWithUsers);
      }
    } catch (error) {
      console.error('Error sending payment reminders:', error);
    }
  }

  private async sendSessionReminder(session: SessionWithClient): Promise<void> {
    const { client } = session;
    const sessionDate = new Date(session.date).toLocaleDateString();

    // Send reminder to client
    await emailService.sendEmail({
      to: client.email,
      subject: 'Upcoming Coaching Session Reminder',
      text: `Dear ${client.name || 'there'},\n\nThis is a reminder that you have a coaching session tomorrow at ${sessionDate}.\n\nBest regards,\nSatya Coaching Team`,
      html: `
        <h2>Upcoming Coaching Session Reminder</h2>
        <p>Dear ${client.name || 'there'},</p>
        <p>This is a reminder that you have a coaching session tomorrow at ${sessionDate}.</p>
        <p>Best regards,<br>Satya Coaching Team</p>
      `,
    });

    // Mark reminder as sent
    await prisma.session.update({
      where: { id: session.id },
      data: {
        reminderSent: true,
      },
    });
  }

  private async sendPaymentReminder(payment: PaymentWithUsers): Promise<void> {
    const { client, coach } = payment;
    const dueDate = new Date(payment.dueDate).toLocaleDateString();

    // Send reminder to client
    await emailService.sendEmail({
      to: client.email,
      subject: 'Payment Reminder',
      text: `Dear ${client.name || 'there'},\n\nThis is a reminder that you have an overdue payment of $${payment.amount} that was due on ${dueDate}.\n\nPlease process the payment as soon as possible.\n\nBest regards,\nSatya Coaching Team`,
      html: `
        <h2>Payment Reminder</h2>
        <p>Dear ${client.name || 'there'},</p>
        <p>This is a reminder that you have an overdue payment of $${payment.amount} that was due on ${dueDate}.</p>
        <p>Please process the payment as soon as possible.</p>
        <p>Best regards,<br>Satya Coaching Team</p>
      `,
    });

    // Send notification to coach
    await emailService.sendEmail({
      to: coach.email,
      subject: 'Client Payment Reminder',
      text: `Dear ${coach.name || 'there'},\n\nThis is to inform you that ${client.name || 'your client'} has an overdue payment of $${payment.amount} that was due on ${dueDate}.\n\nBest regards,\nSatya Coaching Team`,
      html: `
        <h2>Client Payment Reminder</h2>
        <p>Dear ${coach.name || 'there'},</p>
        <p>This is to inform you that ${client.name || 'your client'} has an overdue payment of $${payment.amount} that was due on ${dueDate}.</p>
        <p>Best regards,<br>Satya Coaching Team</p>
      `,
    });

    // Mark reminder as sent
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        reminderSent: true,
      },
    });
  }
}
