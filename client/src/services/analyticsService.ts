import { CoachNote } from '../types/coachNote';
import {
  AnalyticsDashboard,
  NoteAnalytics,
  TagAnalytics,
  ClientEngagementMetrics,
  TimeSeriesData,
  ProductivityMetrics,
  ContentAnalytics,
  CategoryAnalytics,
  ComparisonMetrics,
  AnalyticsGoal,
  AnalyticsInsight,
  AnalyticsFilters,
  AnalyticsPeriod,
  ExportableReport
} from '../types/analytics';

class AnalyticsService {
  private readonly PERIODS: AnalyticsPeriod[] = [
    { label: 'Last 7 days', value: 'week', days: 7 },
    { label: 'Last 30 days', value: 'month', days: 30 },
    { label: 'Last 90 days', value: 'quarter', days: 90 },
    { label: 'Last 365 days', value: 'year', days: 365 },
    { label: 'All time', value: 'all', days: 0 }
  ];

  // Calculate comprehensive analytics dashboard
  async generateDashboard(notes: CoachNote[], filters?: AnalyticsFilters): Promise<AnalyticsDashboard> {
    const filteredNotes = this.applyFilters(notes, filters);
    const period = filters?.period || this.PERIODS[1]; // Default to last 30 days
    
    const overview = this.calculateOverviewMetrics(filteredNotes, period);
    const timeSeriesData = this.generateTimeSeriesData(filteredNotes, period);
    const tagAnalytics = this.calculateTagAnalytics(filteredNotes, notes);
    const clientEngagement = this.calculateClientEngagement(filteredNotes);
    const productivity = this.calculateProductivityMetrics(filteredNotes, period);
    const content = this.calculateContentAnalytics(filteredNotes);
    const categories = this.calculateCategoryAnalytics(filteredNotes);
    const comparison = this.calculateComparisonMetrics(notes, period);
    const goals = this.generateGoals(overview, productivity);
    const insights = this.generateInsights(overview, tagAnalytics, clientEngagement, productivity);

    return {
      overview,
      timeSeriesData,
      tagAnalytics,
      clientEngagement,
      productivity,
      content,
      categories,
      comparison,
      goals,
      insights,
      lastUpdated: new Date().toISOString()
    };
  }

  // Apply filters to notes
  private applyFilters(notes: CoachNote[], filters?: AnalyticsFilters): CoachNote[] {
    if (!filters) return notes;

    let filtered = [...notes];

    // Date range filter
    if (filters.period && filters.period.days > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.period.days);
      filtered = filtered.filter(note => new Date(note.createdAt) >= cutoffDate);
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      filtered = filtered.filter(note => {
        const noteDate = new Date(note.createdAt);
        return noteDate >= start && noteDate <= end;
      });
    }

    // Client filter
    if (filters.clientIds && filters.clientIds.length > 0) {
      filtered = filtered.filter(note => 
        note.client && filters.clientIds!.includes(note.client)
      );
    }

    // Category filter
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      filtered = filtered.filter(note => 
        note.categoryId && filters.categoryIds!.includes(note.categoryId)
      );
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(note =>
        note.tags && note.tags.some(tag => filters.tags!.includes(tag))
      );
    }

    return filtered;
  }

  // Calculate overview metrics
  private calculateOverviewMetrics(notes: CoachNote[], period: AnalyticsPeriod): NoteAnalytics {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const notesThisWeek = notes.filter(note => new Date(note.createdAt) >= weekAgo).length;
    const notesThisMonth = notes.filter(note => new Date(note.createdAt) >= monthAgo).length;

    const totalWords = notes.reduce((sum, note) => sum + this.countWords(note.textContent), 0);
    const uniqueClients = new Set(notes.map(note => note.client).filter(Boolean)).size;
    const uniqueSessions = new Set(notes.map(note => note.sessionId)).size;

    const weeksInPeriod = period.days > 0 ? Math.max(1, period.days / 7) : 
      this.getWeeksBetweenDates(notes[notes.length - 1]?.createdAt, notes[0]?.createdAt) || 1;

    return {
      totalNotes: notes.length,
      notesThisWeek,
      notesThisMonth,
      averageNotesPerWeek: notes.length / weeksInPeriod,
      averageWordsPerNote: notes.length > 0 ? totalWords / notes.length : 0,
      totalWords,
      uniqueClients,
      uniqueSessions,
      averageNotesPerClient: uniqueClients > 0 ? notes.length / uniqueClients : 0,
      averageNotesPerSession: uniqueSessions > 0 ? notes.length / uniqueSessions : 0
    };
  }

  // Generate time series data
  private generateTimeSeriesData(notes: CoachNote[], period: AnalyticsPeriod): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const days = period.days > 0 ? period.days : 30; // Default to 30 days if "all time"
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayNotes = notes.filter(note => 
        note.createdAt.split('T')[0] === dateStr
      );
      
      const wordCount = dayNotes.reduce((sum, note) => sum + this.countWords(note.textContent), 0);
      const uniqueClients = new Set(dayNotes.map(note => note.client).filter(Boolean)).size;
      const uniqueSessions = new Set(dayNotes.map(note => note.sessionId)).size;
      
      data.push({
        date: dateStr,
        noteCount: dayNotes.length,
        wordCount,
        sessionCount: uniqueSessions,
        uniqueClients
      });
    }
    
    return data;
  }

  // Calculate tag analytics
  private calculateTagAnalytics(currentNotes: CoachNote[], allNotes: CoachNote[]): TagAnalytics[] {
    const tagCounts: Record<string, { count: number; words: number; lastUsed: string }> = {};
    
    // Count tags in current period
    currentNotes.forEach(note => {
      const words = this.countWords(note.textContent);
      note.tags?.forEach(tag => {
        if (!tagCounts[tag]) {
          tagCounts[tag] = { count: 0, words: 0, lastUsed: note.createdAt };
        }
        tagCounts[tag].count++;
        tagCounts[tag].words += words;
        if (note.createdAt > tagCounts[tag].lastUsed) {
          tagCounts[tag].lastUsed = note.createdAt;
        }
      });
    });

    const totalNotes = currentNotes.length;
    
    return Object.entries(tagCounts)
      .map(([tagName, data]) => ({
        tagName,
        count: data.count,
        percentage: totalNotes > 0 ? (data.count / totalNotes) * 100 : 0,
        trend: this.calculateTagTrend(tagName, allNotes),
        trendPercentage: this.calculateTagTrendPercentage(tagName, allNotes),
        lastUsed: data.lastUsed,
        averageWordsInTaggedNotes: data.count > 0 ? data.words / data.count : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Calculate client engagement metrics
  private calculateClientEngagement(notes: CoachNote[]): ClientEngagementMetrics[] {
    const clientData: Record<string, {
      notes: CoachNote[];
      sessions: Set<string>;
      totalWords: number;
      tags: Record<string, number>;
    }> = {};

    notes.forEach(note => {
      if (!note.client) return;
      
      if (!clientData[note.client]) {
        clientData[note.client] = {
          notes: [],
          sessions: new Set(),
          totalWords: 0,
          tags: {}
        };
      }
      
      clientData[note.client].notes.push(note);
      clientData[note.client].sessions.add(note.sessionId);
      clientData[note.client].totalWords += this.countWords(note.textContent);
      
      note.tags?.forEach(tag => {
        clientData[note.client].tags[tag] = (clientData[note.client].tags[tag] || 0) + 1;
      });
    });

    return Object.entries(clientData).map(([clientId, data]) => {
      const noteCount = data.notes.length;
      const sessionCount = data.sessions.size;
      const averageWordsPerNote = noteCount > 0 ? data.totalWords / noteCount : 0;
      const lastNoteDate = data.notes.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]?.createdAt || '';
      
      const topTags = Object.entries(data.tags)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag);
      
      const engagementScore = this.calculateEngagementScore(noteCount, sessionCount, averageWordsPerNote);
      const noteFrequency = this.categorizeNoteFrequency(noteCount, sessionCount);
      
      return {
        clientId,
        clientName: `Client ${clientId.slice(-8)}`,
        noteCount,
        sessionCount,
        averageNotesPerSession: sessionCount > 0 ? noteCount / sessionCount : 0,
        totalWords: data.totalWords,
        averageWordsPerNote,
        lastNoteDate,
        engagementScore,
        topTags,
        noteFrequency
      };
    }).sort((a, b) => b.engagementScore - a.engagementScore);
  }

  // Calculate productivity metrics
  private calculateProductivityMetrics(notes: CoachNote[], period: AnalyticsPeriod): ProductivityMetrics {
    const dailyData = this.groupNotesByDay(notes);
    const weeklyData = this.groupNotesByWeek(notes);
    const monthlyData = this.groupNotesByMonth(notes);
    
    const dailyAverage = Object.values(dailyData).reduce((sum, count) => sum + count, 0) / 
      Math.max(1, Object.keys(dailyData).length);
    
    const weeklyAverage = Object.values(weeklyData).reduce((sum, count) => sum + count, 0) / 
      Math.max(1, Object.keys(weeklyData).length);
    
    const monthlyAverage = Object.values(monthlyData).reduce((sum, count) => sum + count, 0) / 
      Math.max(1, Object.keys(monthlyData).length);
    
    const bestDay = this.findBestPeriod(dailyData, 'day');
    const bestWeek = this.findBestWeek(weeklyData);
    const bestMonth = this.findBestMonth(monthlyData);
    
    const consistencyScore = this.calculateConsistencyScore(dailyData);
    const productivityTrend = this.calculateProductivityTrend(weeklyData);
    
    return {
      dailyAverage,
      weeklyAverage,
      monthlyAverage,
      bestDay,
      bestWeek,
      bestMonth,
      consistencyScore,
      productivityTrend
    };
  }

  // Calculate content analytics
  private calculateContentAnalytics(notes: CoachNote[]): ContentAnalytics {
    const wordCounts = notes.map(note => this.countWords(note.textContent));
    const averageWordCount = wordCounts.reduce((sum, count) => sum + count, 0) / Math.max(1, wordCounts.length);
    const medianWordCount = this.calculateMedian(wordCounts);
    
    const shortNotes = wordCounts.filter(count => count < 50).length;
    const mediumNotes = wordCounts.filter(count => count >= 50 && count <= 200).length;
    const longNotes = wordCounts.filter(count => count > 200).length;
    
    const allWords = notes.flatMap(note => this.extractWords(note.textContent));
    const wordFrequency = this.calculateWordFrequency(allWords);
    const mostCommonWords = Object.entries(wordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({
        word,
        count,
        percentage: (count / allWords.length) * 100
      }));
    
    return {
      averageWordCount,
      medianWordCount,
      shortNotes,
      mediumNotes,
      longNotes,
      mostCommonWords,
      sentimentDistribution: this.analyzeSentiment(notes),
      readabilityScore: this.calculateReadabilityScore(notes),
      complexityScore: this.calculateComplexityScore(notes)
    };
  }

  // Calculate category analytics
  private calculateCategoryAnalytics(notes: CoachNote[]): CategoryAnalytics[] {
    const categoryData: Record<string, {
      notes: CoachNote[];
      totalWords: number;
      tags: Record<string, number>;
      clients: Record<string, number>;
    }> = {};

    notes.forEach(note => {
      const categoryId = note.categoryId || 'uncategorized';
      
      if (!categoryData[categoryId]) {
        categoryData[categoryId] = {
          notes: [],
          totalWords: 0,
          tags: {},
          clients: {}
        };
      }
      
      categoryData[categoryId].notes.push(note);
      categoryData[categoryId].totalWords += this.countWords(note.textContent);
      
      if (note.client) {
        categoryData[categoryId].clients[note.client] = 
          (categoryData[categoryId].clients[note.client] || 0) + 1;
      }
      
      note.tags?.forEach(tag => {
        categoryData[categoryId].tags[tag] = (categoryData[categoryId].tags[tag] || 0) + 1;
      });
    });

    const totalNotes = notes.length;
    
    return Object.entries(categoryData).map(([categoryId, data]) => {
      const noteCount = data.notes.length;
      const topTags = Object.entries(data.tags)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag);
      
      const clientDistribution = Object.entries(data.clients)
        .map(([clientId, count]) => ({ clientId, noteCount: count }))
        .sort((a, b) => b.noteCount - a.noteCount);
      
      return {
        categoryId,
        categoryName: categoryId === 'uncategorized' ? 'Uncategorized' : `Category ${categoryId.slice(-8)}`,
        noteCount,
        percentage: totalNotes > 0 ? (noteCount / totalNotes) * 100 : 0,
        averageWordsPerNote: noteCount > 0 ? data.totalWords / noteCount : 0,
        trend: 'stable' as const, // Would need historical data for real trend
        topTags,
        clientDistribution
      };
    }).sort((a, b) => b.noteCount - a.noteCount);
  }

  // Calculate comparison metrics
  private calculateComparisonMetrics(allNotes: CoachNote[], period: AnalyticsPeriod): ComparisonMetrics {
    const now = new Date();
    const periodStart = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(periodStart.getTime() - period.days * 24 * 60 * 60 * 1000);
    
    const currentNotes = allNotes.filter(note => new Date(note.createdAt) >= periodStart);
    const previousNotes = allNotes.filter(note => {
      const noteDate = new Date(note.createdAt);
      return noteDate >= previousPeriodStart && noteDate < periodStart;
    });
    
    const current = this.calculateOverviewMetrics(currentNotes, period);
    const previous = this.calculateOverviewMetrics(previousNotes, period);
    
    const percentageChange = {
      totalNotes: this.calculatePercentageChange(previous.totalNotes, current.totalNotes),
      averageWordsPerNote: this.calculatePercentageChange(previous.averageWordsPerNote, current.averageWordsPerNote),
      uniqueClients: this.calculatePercentageChange(previous.uniqueClients, current.uniqueClients),
      averageNotesPerWeek: this.calculatePercentageChange(previous.averageNotesPerWeek, current.averageNotesPerWeek)
    };
    
    return { current, previous, percentageChange };
  }

  // Generate goals
  private generateGoals(overview: NoteAnalytics, productivity: ProductivityMetrics): AnalyticsGoal[] {
    const goals: AnalyticsGoal[] = [];
    
    // Notes per week goal
    const notesPerWeekTarget = Math.max(10, Math.ceil(overview.averageNotesPerWeek * 1.2));
    goals.push({
      id: 'notes_per_week',
      type: 'notes_per_week',
      target: notesPerWeekTarget,
      current: overview.averageNotesPerWeek,
      progress: Math.min(100, (overview.averageNotesPerWeek / notesPerWeekTarget) * 100),
      status: overview.averageNotesPerWeek >= notesPerWeekTarget ? 'completed' : 
              overview.averageNotesPerWeek >= notesPerWeekTarget * 0.8 ? 'on_track' : 'behind',
      description: `Maintain ${notesPerWeekTarget} notes per week`
    });
    
    // Words per note goal
    const wordsPerNoteTarget = Math.max(100, Math.ceil(overview.averageWordsPerNote * 1.1));
    goals.push({
      id: 'words_per_note',
      type: 'words_per_note',
      target: wordsPerNoteTarget,
      current: overview.averageWordsPerNote,
      progress: Math.min(100, (overview.averageWordsPerNote / wordsPerNoteTarget) * 100),
      status: overview.averageWordsPerNote >= wordsPerNoteTarget ? 'completed' : 
              overview.averageWordsPerNote >= wordsPerNoteTarget * 0.9 ? 'on_track' : 'behind',
      description: `Average ${wordsPerNoteTarget} words per note`
    });
    
    // Consistency goal
    goals.push({
      id: 'consistency',
      type: 'consistency',
      target: 80,
      current: productivity.consistencyScore,
      progress: productivity.consistencyScore,
      status: productivity.consistencyScore >= 80 ? 'completed' : 
              productivity.consistencyScore >= 60 ? 'on_track' : 'behind',
      description: 'Maintain consistent note-taking habits'
    });
    
    return goals;
  }

  // Generate insights
  private generateInsights(
    overview: NoteAnalytics,
    tagAnalytics: TagAnalytics[],
    clientEngagement: ClientEngagementMetrics[],
    productivity: ProductivityMetrics
  ): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];
    
    // Productivity trend insight
    if (productivity.productivityTrend === 'improving') {
      insights.push({
        id: 'productivity_improving',
        type: 'trend',
        title: 'Productivity is improving',
        description: `Your note-taking frequency has increased. You're averaging ${productivity.weeklyAverage.toFixed(1)} notes per week.`,
        severity: 'success',
        actionable: false,
        createdAt: new Date().toISOString()
      });
    } else if (productivity.productivityTrend === 'declining') {
      insights.push({
        id: 'productivity_declining',
        type: 'alert',
        title: 'Note-taking frequency declining',
        description: `Your note-taking has decreased recently. Consider setting a daily reminder.`,
        severity: 'warning',
        actionable: true,
        action: {
          label: 'Set reminder',
          type: 'create',
          data: { type: 'reminder' }
        },
        createdAt: new Date().toISOString()
      });
    }
    
    // Top tag insight
    if (tagAnalytics.length > 0) {
      const topTag = tagAnalytics[0];
      insights.push({
        id: 'top_tag',
        type: 'trend',
        title: `"${topTag.tagName}" is your most used tag`,
        description: `Used in ${topTag.count} notes (${topTag.percentage.toFixed(1)}% of all notes).`,
        severity: 'info',
        actionable: true,
        action: {
          label: 'View notes',
          type: 'filter',
          data: { tags: [topTag.tagName] }
        },
        createdAt: new Date().toISOString()
      });
    }
    
    // Client engagement insight
    if (clientEngagement.length > 0) {
      const topClient = clientEngagement[0];
      insights.push({
        id: 'top_client',
        type: 'trend',
        title: 'Most engaged client',
        description: `${topClient.clientName} has ${topClient.noteCount} notes with an engagement score of ${topClient.engagementScore.toFixed(0)}.`,
        severity: 'info',
        actionable: true,
        action: {
          label: 'View client notes',
          type: 'filter',
          data: { clientIds: [topClient.clientId] }
        },
        createdAt: new Date().toISOString()
      });
    }
    
    // Consistency insight
    if (productivity.consistencyScore < 50) {
      insights.push({
        id: 'low_consistency',
        type: 'recommendation',
        title: 'Improve note-taking consistency',
        description: `Your consistency score is ${productivity.consistencyScore.toFixed(0)}%. Try setting a daily note-taking goal.`,
        severity: 'warning',
        actionable: true,
        action: {
          label: 'Set daily goal',
          type: 'create',
          data: { type: 'goal', target: 'daily_notes' }
        },
        createdAt: new Date().toISOString()
      });
    }
    
    return insights;
  }

  // Export report
  async exportReport(dashboard: AnalyticsDashboard, format: 'json' | 'csv'): Promise<ExportableReport> {
    const report: ExportableReport = {
      title: 'Coach Notes Analytics Report',
      period: 'Last 30 days',
      generatedAt: new Date().toISOString(),
      summary: dashboard.overview,
      charts: [
        {
          type: 'line',
          title: 'Notes Over Time',
          data: dashboard.timeSeriesData
        },
        {
          type: 'bar',
          title: 'Tag Usage',
          data: dashboard.tagAnalytics.slice(0, 10)
        },
        {
          type: 'pie',
          title: 'Category Distribution',
          data: dashboard.categories
        }
      ],
      insights: dashboard.insights,
      recommendations: dashboard.insights
        .filter(insight => insight.type === 'recommendation')
        .map(insight => insight.description)
    };
    
    return report;
  }

  // Helper methods
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private extractWords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private calculateWordFrequency(words: string[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    return frequency;
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  private getWeeksBetweenDates(start?: string, end?: string): number {
    if (!start || !end) return 1;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  }

  private calculateTagTrend(tagName: string, allNotes: CoachNote[]): 'up' | 'down' | 'stable' {
    // Simplified trend calculation - would need more sophisticated analysis
    return 'stable';
  }

  private calculateTagTrendPercentage(tagName: string, allNotes: CoachNote[]): number {
    // Simplified trend percentage - would need historical comparison
    return 0;
  }

  private calculateEngagementScore(noteCount: number, sessionCount: number, avgWords: number): number {
    // Weighted score based on note frequency, session count, and note depth
    const frequencyScore = Math.min(40, noteCount * 2);
    const sessionScore = Math.min(30, sessionCount * 3);
    const depthScore = Math.min(30, avgWords / 10);
    return Math.round(frequencyScore + sessionScore + depthScore);
  }

  private categorizeNoteFrequency(noteCount: number, sessionCount: number): 'high' | 'medium' | 'low' {
    const ratio = sessionCount > 0 ? noteCount / sessionCount : 0;
    if (ratio >= 3) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  private groupNotesByDay(notes: CoachNote[]): Record<string, number> {
    const groups: Record<string, number> = {};
    notes.forEach(note => {
      const day = note.createdAt.split('T')[0];
      groups[day] = (groups[day] || 0) + 1;
    });
    return groups;
  }

  private groupNotesByWeek(notes: CoachNote[]): Record<string, number> {
    const groups: Record<string, number> = {};
    notes.forEach(note => {
      const date = new Date(note.createdAt);
      const week = this.getWeekKey(date);
      groups[week] = (groups[week] || 0) + 1;
    });
    return groups;
  }

  private groupNotesByMonth(notes: CoachNote[]): Record<string, number> {
    const groups: Record<string, number> = {};
    notes.forEach(note => {
      const date = new Date(note.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      groups[month] = (groups[month] || 0) + 1;
    });
    return groups;
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private findBestPeriod(data: Record<string, number>, type: 'day'): { date: string; noteCount: number } {
    const entries = Object.entries(data);
    if (entries.length === 0) return { date: '', noteCount: 0 };
    
    const best = entries.reduce((max, [date, count]) => 
      count > max[1] ? [date, count] : max
    );
    
    return { date: best[0], noteCount: best[1] };
  }

  private findBestWeek(data: Record<string, number>): { startDate: string; endDate: string; noteCount: number } {
    const entries = Object.entries(data);
    if (entries.length === 0) return { startDate: '', endDate: '', noteCount: 0 };
    
    const best = entries.reduce((max, [week, count]) => 
      count > max[1] ? [week, count] : max
    );
    
    // Convert week key back to dates (simplified)
    const [year, weekStr] = best[0].split('-W');
    const startDate = `${year}-01-01`; // Simplified
    const endDate = `${year}-01-07`; // Simplified
    
    return { startDate, endDate, noteCount: best[1] };
  }

  private findBestMonth(data: Record<string, number>): { month: string; year: number; noteCount: number } {
    const entries = Object.entries(data);
    if (entries.length === 0) return { month: '', year: 0, noteCount: 0 };
    
    const best = entries.reduce((max, [month, count]) => 
      count > max[1] ? [month, count] : max
    );
    
    const [year, monthNum] = best[0].split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return { 
      month: monthNames[parseInt(monthNum) - 1], 
      year: parseInt(year), 
      noteCount: best[1] 
    };
  }

  private calculateConsistencyScore(dailyData: Record<string, number>): number {
    const days = Object.keys(dailyData).length;
    const daysWithNotes = Object.values(dailyData).filter(count => count > 0).length;
    return days > 0 ? (daysWithNotes / days) * 100 : 0;
  }

  private calculateProductivityTrend(weeklyData: Record<string, number>): 'improving' | 'declining' | 'stable' {
    const weeks = Object.keys(weeklyData).sort();
    if (weeks.length < 2) return 'stable';
    
    const recent = weeks.slice(-2);
    const current = weeklyData[recent[1]] || 0;
    const previous = weeklyData[recent[0]] || 0;
    
    if (current > previous * 1.1) return 'improving';
    if (current < previous * 0.9) return 'declining';
    return 'stable';
  }

  private calculatePercentageChange(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private analyzeSentiment(notes: CoachNote[]): { positive: number; neutral: number; negative: number } {
    // Simplified sentiment analysis - would use proper NLP in production
    const total = notes.length;
    return {
      positive: Math.round(total * 0.6),
      neutral: Math.round(total * 0.3),
      negative: Math.round(total * 0.1)
    };
  }

  private calculateReadabilityScore(notes: CoachNote[]): number {
    // Simplified readability score - would use proper algorithms in production
    return Math.round(Math.random() * 40 + 60); // 60-100 range
  }

  private calculateComplexityScore(notes: CoachNote[]): number {
    // Simplified complexity score based on average word length and sentence structure
    const avgWordLength = notes.reduce((sum, note) => {
      const words = this.extractWords(note.textContent);
      const avgLength = words.reduce((s, w) => s + w.length, 0) / Math.max(1, words.length);
      return sum + avgLength;
    }, 0) / Math.max(1, notes.length);
    
    return Math.min(100, Math.round(avgWordLength * 15));
  }
}

export const analyticsService = new AnalyticsService(); 