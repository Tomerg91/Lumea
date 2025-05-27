export interface NoteAnalytics {
  totalNotes: number;
  notesThisWeek: number;
  notesThisMonth: number;
  averageNotesPerWeek: number;
  averageWordsPerNote: number;
  totalWords: number;
  uniqueClients: number;
  uniqueSessions: number;
  averageNotesPerClient: number;
  averageNotesPerSession: number;
}

export interface TagAnalytics {
  tagName: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  lastUsed: string;
  averageWordsInTaggedNotes: number;
}

export interface ClientEngagementMetrics {
  clientId: string;
  clientName?: string;
  noteCount: number;
  sessionCount: number;
  averageNotesPerSession: number;
  totalWords: number;
  averageWordsPerNote: number;
  lastNoteDate: string;
  engagementScore: number; // 0-100 based on note frequency and depth
  topTags: string[];
  noteFrequency: 'high' | 'medium' | 'low';
}

export interface TimeSeriesData {
  date: string;
  noteCount: number;
  wordCount: number;
  sessionCount: number;
  uniqueClients: number;
}

export interface ProductivityMetrics {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  bestDay: {
    date: string;
    noteCount: number;
  };
  bestWeek: {
    startDate: string;
    endDate: string;
    noteCount: number;
  };
  bestMonth: {
    month: string;
    year: number;
    noteCount: number;
  };
  consistencyScore: number; // 0-100 based on regular note-taking
  productivityTrend: 'improving' | 'declining' | 'stable';
}

export interface ContentAnalytics {
  averageWordCount: number;
  medianWordCount: number;
  shortNotes: number; // < 50 words
  mediumNotes: number; // 50-200 words
  longNotes: number; // > 200 words
  mostCommonWords: Array<{
    word: string;
    count: number;
    percentage: number;
  }>;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  readabilityScore: number; // 0-100
  complexityScore: number; // 0-100
}

export interface CategoryAnalytics {
  categoryId: string;
  categoryName: string;
  noteCount: number;
  percentage: number;
  averageWordsPerNote: number;
  trend: 'up' | 'down' | 'stable';
  topTags: string[];
  clientDistribution: Array<{
    clientId: string;
    noteCount: number;
  }>;
}

export interface AnalyticsPeriod {
  label: string;
  value: 'week' | 'month' | 'quarter' | 'year' | 'all';
  days: number;
}

export interface ComparisonMetrics {
  current: NoteAnalytics;
  previous: NoteAnalytics;
  percentageChange: {
    totalNotes: number;
    averageWordsPerNote: number;
    uniqueClients: number;
    averageNotesPerWeek: number;
  };
}

export interface AnalyticsGoal {
  id: string;
  type: 'notes_per_week' | 'words_per_note' | 'clients_per_week' | 'consistency';
  target: number;
  current: number;
  progress: number; // 0-100
  status: 'on_track' | 'behind' | 'ahead' | 'completed';
  deadline?: string;
  description: string;
}

export interface AnalyticsInsight {
  id: string;
  type: 'trend' | 'achievement' | 'recommendation' | 'alert';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  actionable: boolean;
  action?: {
    label: string;
    type: 'filter' | 'create' | 'export' | 'view';
    data?: any;
  };
  createdAt: string;
}

export interface AnalyticsDashboard {
  overview: NoteAnalytics;
  timeSeriesData: TimeSeriesData[];
  tagAnalytics: TagAnalytics[];
  clientEngagement: ClientEngagementMetrics[];
  productivity: ProductivityMetrics;
  content: ContentAnalytics;
  categories: CategoryAnalytics[];
  comparison: ComparisonMetrics;
  goals: AnalyticsGoal[];
  insights: AnalyticsInsight[];
  lastUpdated: string;
}

export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  clientIds?: string[];
  categoryIds?: string[];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ExportableReport {
  title: string;
  period: string;
  generatedAt: string;
  summary: NoteAnalytics;
  charts: Array<{
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: any;
  }>;
  insights: AnalyticsInsight[];
  recommendations: string[];
} 