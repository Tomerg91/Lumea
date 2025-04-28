/*
// Commenting out entire file as it seems outdated/broken 
// based on current Prisma schema and potential ORM mismatch.

import { prisma } from '../lib/prisma';

class SessionCounterService {
  public async updateSessionCounters(sessionId: string): Promise<void> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          user: true // Prisma Session model has 'client' and 'coach', not 'user'
        }
      });

      if (!session) {
        console.error(`Session not found: ${sessionId}`);
        return;
      }

      // Assuming Session model has userId, which it doesn't seem to have directly
      const totalSessions = await prisma.session.count({
        where: {
          userId: session.userId, // userId does not exist on session
          status: 'completed'
        }
      });

      const totalDuration = await prisma.session.aggregate({
        where: {
          userId: session.userId, // userId does not exist on session
          status: 'completed'
        },
        _sum: { 
          duration: true // duration does not exist on session, _sum might be incorrect too
        }
      });

      console.log(`Updated session counters for user ${session.userId}:`, { // userId does not exist
        totalSessions,
        totalDuration: totalDuration._sum.duration || 0 // _sum.duration likely incorrect
      });

      // This section seems related to a different schema/ORM (Drizzle?)
      // await db.update(sessionCounters).set({ ... }).where(...)

    } catch (error) {
      console.error('Error updating session counters:', error);
    }
  }

  // This section also seems related to a different schema/ORM (Drizzle?)
  public async getSessionCounters(coachId: number, clientId: number): Promise<typeof sessionCounters.$inferSelect | null> {
    try {
      const counter = await db
        .select()
        .from(sessionCounters)
        .where(
          and(
            eq(sessionCounters.coachId, coachId),
            eq(sessionCounters.clientId, clientId)
          )
        )
        .limit(1);

      return counter[0] || null;
    } catch (error) {
      console.error('Error getting session counters:', error);
      return null;
    }
  }
}

export default new SessionCounterService();

*/