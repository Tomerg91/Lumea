import { supabase } from '../lib/supabase.js';

export interface AnalyticsDateRange {
  startDate?: Date;
  endDate?: Date;
}

export interface SessionMetrics {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  completionRate: number;
  sessionsByStatus: Record<string, number>;
  averageSessionsPerWeek: number;
  sessionTrends: Array<{
    date: string;
    sessions: number;
    completed: number;
  }>;
}

export interface ClientEngagementMetrics {
  totalClients: number;
  activeClients: number;
  clientRetentionRate: number;
  averageSessionsPerClient: number;
  reflectionSubmissionRate: number;
  clientEngagementTrends: Array<{
    date: string;
    activeClients: number;
    reflectionsSubmitted: number;
  }>;
}

export interface CoachPerformanceMetrics {
  totalCoaches: number;
  activeCoaches: number;
  coaches: Array<{
    coachId: string;
    coachName: string;
    totalSessions: number;
    completedSessions: number;
    totalClients: number;
    averageSessionDuration: number;
    clientSatisfactionScore: number;
    notesTaken: number;
  }>;
}

export interface ReflectionAnalytics {
  totalReflections: number;
  submissionRate: number;
  averageCompletionTime: number;
  reflectionsByCategory: Record<string, number>;
  categoryEngagement: Array<{
    category: string;
    averageScore: number;
    responseCount: number;
  }>;
}

export interface CoachNotesAnalytics {
  totalNotes: number;
  notesThisPeriod: number;
  averageNotesPerSession: number;
  averageWordsPerNote: number;
  mostActiveCoach: {
    coachId: string;
    coachName: string;
    noteCount: number;
  } | null;
  notesByAccessLevel: Record<string, number>;
  topTags: Array<{
    tag: string;
    count: number;
    percentage: number;
  }>;
  noteCreationTrends: Array<{
    date: string;
    noteCount: number;
    wordCount: number;
  }>;
  productivityMetrics: {
    dailyAverage: number;
    weeklyAverage: number;
    peakDay: string;
    peakCount: number;
  };
}

export interface AnalyticsDashboard {
  overview: {
    totalSessions: number;
    totalClients: number;
    totalCoaches: number;
    totalReflections: number;
    lastUpdated: Date;
  };
  sessionMetrics: SessionMetrics;
  clientEngagement: ClientEngagementMetrics;
  coachPerformance: CoachPerformanceMetrics;
  reflectionAnalytics: ReflectionAnalytics;
  dateRange: AnalyticsDateRange;
}

class AnalyticsService {
  /**
   * Generate comprehensive analytics dashboard
   */
  async generateDashboard(dateRange: AnalyticsDateRange = {}): Promise<AnalyticsDashboard> {
    const { startDate, endDate } = this.prepareDateRange(dateRange);

    const [
      sessionMetrics,
      clientEngagement,
      coachPerformance,
      reflectionAnalytics,
      overview
    ] = await Promise.all([
      this.getSessionMetrics({ startDate, endDate }),
      this.getClientEngagementMetrics({ startDate, endDate }),
      this.getCoachPerformanceMetrics({ startDate, endDate }),
      this.getReflectionAnalytics({ startDate, endDate }),
      this.getOverviewMetrics({ startDate, endDate })
    ]);

    return {
      overview,
      sessionMetrics,
      clientEngagement,
      coachPerformance,
      reflectionAnalytics,
      dateRange: { startDate, endDate },
    };
  }

  /**
   * Get session metrics and trends
   */
  async getSessionMetrics(dateRange: AnalyticsDateRange): Promise<SessionMetrics> {
    // TODO: Implement using Supabase queries
    console.warn('getSessionMetrics is a placeholder. Implement with Supabase.');
    return {
      totalSessions: 0,
      completedSessions: 0,
      cancelledSessions: 0,
      completionRate: 0,
      sessionsByStatus: {},
      averageSessionsPerWeek: 0,
      sessionTrends: [],
    };
  }

  /**
   * Get client engagement metrics
   */
  async getClientEngagementMetrics(dateRange: AnalyticsDateRange): Promise<ClientEngagementMetrics> {
    // TODO: Implement using Supabase queries
    console.warn('getClientEngagementMetrics is a placeholder. Implement with Supabase.');
    return {
      totalClients: 0,
      activeClients: 0,
      clientRetentionRate: 0,
      averageSessionsPerClient: 0,
      reflectionSubmissionRate: 0,
      clientEngagementTrends: [],
    };
  }

  /**
   * Get coach performance metrics
   */
  async getCoachPerformanceMetrics(dateRange: AnalyticsDateRange): Promise<CoachPerformanceMetrics> {
    // TODO: Implement using Supabase queries
    console.warn('getCoachPerformanceMetrics is a placeholder. Implement with Supabase.');
    return {
      totalCoaches: 0,
      activeCoaches: 0,
      coaches: [],
    };
  }

  /**
   * Get reflection analytics
   */
  async getReflectionAnalytics(dateRange: AnalyticsDateRange): Promise<ReflectionAnalytics> {
    // TODO: Implement using Supabase queries
    console.warn('getReflectionAnalytics is a placeholder. Implement with Supabase.');
    return {
      totalReflections: 0,
      submissionRate: 0,
      averageCompletionTime: 0,
      reflectionsByCategory: {},
      categoryEngagement: [],
    };
  }

  /**
   * Get coach notes analytics
   */
  async getCoachNotesAnalytics(dateRange: AnalyticsDateRange, coachId?: string): Promise<CoachNotesAnalytics> {
    const { startDate, endDate } = this.prepareDateRange(dateRange);
    const matchStage = this.buildDateMatchStage('createdAt', startDate, endDate);
    
    // Add coach filter if specified
    if (coachId) {
      matchStage.coachId = new mongoose.Types.ObjectId(coachId);
    }

    // Get comprehensive note analytics
    const notesData = await CoachNote.aggregate([
      { $match: matchStage },
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          accessLevelBreakdown: [
            {
              $group: {
                _id: '$privacySettings.accessLevel',
                count: { $sum: 1 }
              }
            }
          ],
          tagAnalysis: [
            { $unwind: '$tags' },
            {
              $group: {
                _id: '$tags',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          coachActivity: [
            {
              $lookup: {
                from: 'users',
                localField: 'coachId',
                foreignField: '_id',
                as: 'coach'
              }
            },
            {
              $group: {
                _id: '$coachId',
                coachName: { $first: { $arrayElemAt: ['$coach.name', 0] } },
                noteCount: { $sum: 1 },
                totalWords: { $sum: { $size: { $split: ['$textContent', ' '] } } }
              }
            },
            { $sort: { noteCount: -1 } },
            { $limit: 1 }
          ],
          dailyTrends: [
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                },
                noteCount: { $sum: 1 },
                wordCount: { $sum: { $size: { $split: ['$textContent', ' '] } } }
              }
            },
            { $sort: { '_id': 1 } }
          ],
          wordStats: [
            {
              $project: {
                wordCount: { $size: { $split: ['$textContent', ' '] } }
              }
            },
            {
              $group: {
                _id: null,
                averageWords: { $avg: '$wordCount' },
                totalWords: { $sum: '$wordCount' }
              }
            }
          ]
        }
      }
    ]);

    const result = notesData[0];
    const totalNotes = result.totalCount[0]?.count || 0;
    const averageWordsPerNote = result.wordStats[0]?.averageWords || 0;
    
    // Get session count for notes per session calculation
    const totalSessions = await CoachingSession.countDocuments(
      this.buildDateMatchStage('date', startDate, endDate)
    );
    
    // Process access level breakdown
    const notesByAccessLevel = result.accessLevelBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Process top tags
    const totalTagUses = result.tagAnalysis.reduce((sum, item) => sum + item.count, 0);
    const topTags = result.tagAnalysis.map(item => ({
      tag: item._id,
      count: item.count,
      percentage: totalTagUses > 0 ? Math.round((item.count / totalTagUses) * 100 * 10) / 10 : 0
    }));

    // Process most active coach
    const mostActiveCoach = result.coachActivity[0] ? {
      coachId: result.coachActivity[0]._id.toString(),
      coachName: result.coachActivity[0].coachName || 'Unknown Coach',
      noteCount: result.coachActivity[0].noteCount
    } : null;

    // Process daily trends
    const noteCreationTrends = result.dailyTrends.map(item => ({
      date: item._id,
      noteCount: item.noteCount,
      wordCount: item.wordCount
    }));

    // Calculate productivity metrics
    const dailyCounts = noteCreationTrends.map(trend => trend.noteCount);
    const dailyAverage = dailyCounts.length > 0 ? 
      dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length : 0;
    
    const weeklyAverage = dailyAverage * 7;
    
    const peakDay = noteCreationTrends.reduce((peak, current) => 
      current.noteCount > peak.noteCount ? current : peak, 
      { date: '', noteCount: 0 }
    );

    return {
      totalNotes,
      notesThisPeriod: totalNotes,
      averageNotesPerSession: totalSessions > 0 ? totalNotes / totalSessions : 0,
      averageWordsPerNote: Math.round(averageWordsPerNote * 10) / 10,
      mostActiveCoach,
      notesByAccessLevel,
      topTags,
      noteCreationTrends,
      productivityMetrics: {
        dailyAverage: Math.round(dailyAverage * 10) / 10,
        weeklyAverage: Math.round(weeklyAverage * 10) / 10,
        peakDay: peakDay.date,
        peakCount: peakDay.noteCount
      }
    };
  }

  /**
   * Get overview metrics
   */
  private async getOverviewMetrics(dateRange: AnalyticsDateRange) {
    const { startDate, endDate } = this.prepareDateRange(dateRange);

    const [totalSessions, totalClients, totalCoaches, totalReflections] = await Promise.all([
      CoachingSession.countDocuments(this.buildDateMatchStage('date', startDate, endDate)),
      CoachingSession.distinct('clientId', this.buildDateMatchStage('date', startDate, endDate)).then(ids => ids.length),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'coach').then(r => r.count),
      Reflection.countDocuments(this.buildDateMatchStage('createdAt', startDate, endDate))
    ]);

    return {
      totalSessions,
      totalClients,
      totalCoaches,
      totalReflections,
      lastUpdated: new Date()
    };
  }

  /**
   * Export analytics data in various formats
   */
  async exportAnalyticsData(format: 'json' | 'csv' | 'pdf' | 'excel', dateRange: AnalyticsDateRange = {}) {
    const dashboard = await this.generateDashboard(dateRange);
    const timestamp = this.formatDateForFilename(new Date());
    
    if (format === 'json') {
      return {
        format: 'json',
        data: dashboard,
        filename: `analytics-${timestamp}.json`,
        mimeType: 'application/json'
      };
    }

    if (format === 'csv') {
      return {
        format: 'csv',
        data: this.convertToCSV(dashboard),
        filename: `analytics-${timestamp}.csv`,
        mimeType: 'text/csv'
      };
    }

    if (format === 'excel') {
      return {
        format: 'excel',
        data: await this.generateExcelReport(dashboard),
        filename: `analytics-${timestamp}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }

    if (format === 'pdf') {
      return {
        format: 'pdf',
        data: await this.generatePDFReport(dashboard),
        filename: `analytics-${timestamp}.pdf`,
        mimeType: 'application/pdf'
      };
    }

    throw new Error('Unsupported export format');
  }

  /**
   * Generate Excel report
   */
  private async generateExcelReport(dashboard: AnalyticsDashboard): Promise<Buffer> {
    const workbook = new Workbook();

    // Overview sheet
    const overviewData = [
      ['Metric', 'Value', 'Date Range'],
      ['Report Generated', new Date().toLocaleDateString(), this.formatDateRange(dashboard.dateRange)],
      [''],
      ['OVERVIEW METRICS', '', ''],
      ['Total Sessions', dashboard.overview.totalSessions, this.formatDateRange(dashboard.dateRange)],
      ['Total Clients', dashboard.overview.totalClients, this.formatDateRange(dashboard.dateRange)],
      ['Total Coaches', dashboard.overview.totalCoaches, this.formatDateRange(dashboard.dateRange)],
      ['Total Reflections', dashboard.overview.totalReflections, this.formatDateRange(dashboard.dateRange)],
      [''],
      ['SESSION METRICS', '', ''],
      ['Completed Sessions', dashboard.sessionMetrics.completedSessions, ''],
      ['Cancelled Sessions', dashboard.sessionMetrics.cancelledSessions, ''],
      ['Completion Rate (%)', dashboard.sessionMetrics.completionRate, ''],
      ['Average Sessions per Week', dashboard.sessionMetrics.averageSessionsPerWeek, ''],
      [''],
      ['CLIENT ENGAGEMENT', '', ''],
      ['Active Clients', dashboard.clientEngagement.activeClients, ''],
      ['Client Retention Rate (%)', dashboard.clientEngagement.clientRetentionRate, ''],
      ['Average Sessions per Client', dashboard.clientEngagement.averageSessionsPerClient, ''],
      ['Reflection Submission Rate (%)', dashboard.clientEngagement.reflectionSubmissionRate, ''],
      [''],
      ['REFLECTION ANALYTICS', '', ''],
      ['Submission Rate (%)', dashboard.reflectionAnalytics.submissionRate, ''],
      ['Average Completion Time (min)', dashboard.reflectionAnalytics.averageCompletionTime, '']
    ];

    const overviewSheet = workbook.createWorksheet({ name: 'Overview' });
    overviewSheet.setData(overviewData);
    workbook.addWorksheet(overviewSheet);

    // Session trends sheet
    if (dashboard.sessionMetrics.sessionTrends.length > 0) {
      const trendsData = [
        ['Date', 'Total Sessions', 'Completed Sessions'],
        ...dashboard.sessionMetrics.sessionTrends.map(trend => [
          trend.date,
          trend.sessions,
          trend.completed
        ])
      ];
      const trendsSheet = workbook.createWorksheet({ name: 'Session Trends' });
      trendsSheet.setData(trendsData);
      workbook.addWorksheet(trendsSheet);
    }

    // Coach performance sheet
    if (dashboard.coachPerformance.coaches.length > 0) {
      const coachData = [
        ['Coach Name', 'Total Sessions', 'Completed Sessions', 'Total Clients', 'Avg Session Duration (min)', 'Client Satisfaction', 'Notes Taken'],
        ...dashboard.coachPerformance.coaches.map(coach => [
          coach.coachName,
          coach.totalSessions,
          coach.completedSessions,
          coach.totalClients,
          coach.averageSessionDuration,
          coach.clientSatisfactionScore,
          coach.notesTaken
        ])
      ];
      const coachSheet = workbook.createWorksheet({ name: 'Coach Performance' });
      coachSheet.setData(coachData);
      workbook.addWorksheet(coachSheet);
    }

    // Reflection categories sheet
    const categoryData = [
      ['Category', 'Response Count', 'Average Score'],
      ...dashboard.reflectionAnalytics.categoryEngagement.map(category => [
        category.category,
        category.responseCount,
        category.averageScore
      ])
    ];
    const categorySheet = workbook.createWorksheet({ name: 'Reflection Categories' });
    categorySheet.setData(categoryData);
    workbook.addWorksheet(categorySheet);

    // Convert to buffer
    const buffer = await workbook.writeToBuffer();
    return buffer;
  }

  /**
   * Generate PDF report
   */
  private async generatePDFReport(dashboard: AnalyticsDashboard): Promise<Buffer> {
    const html = this.generateReportHTML(dashboard);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true,
        preferCSSPageSize: true
      });
      
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate HTML template for PDF report
   */
  private generateReportHTML(dashboard: AnalyticsDashboard): string {
    const dateRange = this.formatDateRange(dashboard.dateRange);
    const generatedDate = new Date().toLocaleDateString();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Lumea Analytics Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #6366f1;
        }
        .header h1 {
            color: #6366f1;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #666;
            margin: 10px 0 0 0;
        }
        .section {
            margin-bottom: 30px;
            break-inside: avoid;
        }
        .section h2 {
            color: #4f46e5;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #6366f1;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin: 5px 0;
        }
        .metric-label {
            color: #6b7280;
            font-size: 14px;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .table th, .table td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
        }
        .table th {
            background: #f3f4f6;
            font-weight: bold;
        }
        .table tr:nth-child(even) {
            background: #f9fafb;
        }
        .insights {
            background: #eff6ff;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
            margin-top: 20px;
        }
        .insights h3 {
            color: #1e40af;
            margin-top: 0;
        }
        .page-break {
            page-break-before: always;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Lumea Analytics Report</h1>
        <p>Period: ${dateRange} | Generated: ${generatedDate}</p>
    </div>

    <div class="section">
        <h2>📊 Executive Summary</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${dashboard.overview.totalSessions}</div>
                <div class="metric-label">Total Sessions</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${dashboard.overview.totalClients}</div>
                <div class="metric-label">Total Clients</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${dashboard.overview.totalCoaches}</div>
                <div class="metric-label">Active Coaches</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${dashboard.overview.totalReflections}</div>
                <div class="metric-label">Total Reflections</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>📈 Session Performance</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${dashboard.sessionMetrics.completionRate.toFixed(1)}%</div>
                <div class="metric-label">Completion Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${dashboard.sessionMetrics.averageSessionsPerWeek.toFixed(1)}</div>
                <div class="metric-label">Sessions per Week</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${dashboard.sessionMetrics.completedSessions}</div>
                <div class="metric-label">Completed Sessions</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${dashboard.sessionMetrics.cancelledSessions}</div>
                <div class="metric-label">Cancelled Sessions</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>👥 Client Engagement</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${dashboard.clientEngagement.activeClients}</div>
                <div class="metric-label">Active Clients</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${dashboard.clientEngagement.clientRetentionRate.toFixed(1)}%</div>
                <div class="metric-label">Retention Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${dashboard.clientEngagement.averageSessionsPerClient.toFixed(1)}</div>
                <div class="metric-label">Avg Sessions/Client</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${dashboard.clientEngagement.reflectionSubmissionRate.toFixed(1)}%</div>
                <div class="metric-label">Reflection Rate</div>
            </div>
        </div>
    </div>

    ${dashboard.coachPerformance.coaches.length > 0 ? `
    <div class="section page-break">
        <h2>⭐ Coach Performance</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Coach Name</th>
                    <th>Sessions</th>
                    <th>Clients</th>
                    <th>Satisfaction</th>
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
                ${dashboard.coachPerformance.coaches.map(coach => `
                <tr>
                    <td>${coach.coachName}</td>
                    <td>${coach.completedSessions}/${coach.totalSessions}</td>
                    <td>${coach.totalClients}</td>
                    <td>${coach.clientSatisfactionScore.toFixed(1)}/5.0</td>
                    <td>${coach.notesTaken}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="section">
        <h2>💭 Reflection Analytics</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${dashboard.reflectionAnalytics.submissionRate.toFixed(1)}%</div>
                <div class="metric-label">Submission Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${dashboard.reflectionAnalytics.averageCompletionTime.toFixed(0)}min</div>
                <div class="metric-label">Avg Completion Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Object.keys(dashboard.reflectionAnalytics.reflectionsByCategory).length}</div>
                <div class="metric-label">Categories Explored</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${dashboard.reflectionAnalytics.totalReflections}</div>
                <div class="metric-label">Total Reflections</div>
            </div>
        </div>

        ${dashboard.reflectionAnalytics.categoryEngagement.length > 0 ? `
        <table class="table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Responses</th>
                    <th>Avg Score</th>
                </tr>
            </thead>
            <tbody>
                ${dashboard.reflectionAnalytics.categoryEngagement.slice(0, 10).map(category => `
                <tr>
                    <td>${category.category}</td>
                    <td>${category.responseCount}</td>
                    <td>${category.averageScore.toFixed(1)}/5.0</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
    </div>

    <div class="insights">
        <h3>📋 Key Insights</h3>
        <ul>
            <li><strong>Session Performance:</strong> ${dashboard.sessionMetrics.completionRate > 85 ? 'Excellent completion rate indicates strong engagement' : dashboard.sessionMetrics.completionRate > 70 ? 'Good completion rate with room for improvement' : 'Completion rate needs attention'}</li>
            <li><strong>Client Engagement:</strong> ${dashboard.clientEngagement.reflectionSubmissionRate > 70 ? 'High reflection submission shows active client participation' : 'Consider strategies to increase reflection engagement'}</li>
            <li><strong>Growth Trend:</strong> Averaging ${dashboard.sessionMetrics.averageSessionsPerWeek.toFixed(1)} sessions per week across ${dashboard.clientEngagement.activeClients} active clients</li>
            ${dashboard.coachPerformance.coaches.length > 0 ? `<li><strong>Coach Excellence:</strong> Average satisfaction score of ${(dashboard.coachPerformance.coaches.reduce((sum, coach) => sum + coach.clientSatisfactionScore, 0) / dashboard.coachPerformance.coaches.length).toFixed(1)}/5.0 across all coaches</li>` : ''}
        </ul>
    </div>

    <div class="footer">
        <p>This report was generated by Lumea Analytics System on ${generatedDate}</p>
        <p>© ${new Date().getFullYear()} Lumea Progressive Wellness Coaching</p>
    </div>
</body>
</html>
    `;
  }

  // Helper methods
  private prepareDateRange(dateRange: AnalyticsDateRange) {
    const endDate = dateRange.endDate || new Date();
    const startDate = dateRange.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    return { startDate, endDate };
  }

  private buildDateMatchStage(dateField: string, startDate?: Date, endDate?: Date) {
    const conditions: any = {};
    if (startDate || endDate) {
      conditions[dateField] = {};
      if (startDate) conditions[dateField].$gte = startDate;
      if (endDate) conditions[dateField].$lte = endDate;
    }
    return conditions;
  }

  private getWeeksDifference(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
    return diffWeeks;
  }

  private formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private convertToCSV(dashboard: AnalyticsDashboard): string {
    const rows: string[] = [];
    
    // Header
    rows.push('Metric,Value,Date Range');
    
    // Overview metrics
    rows.push(`Total Sessions,${dashboard.overview.totalSessions},${this.formatDateRange(dashboard.dateRange)}`);
    rows.push(`Total Clients,${dashboard.overview.totalClients},${this.formatDateRange(dashboard.dateRange)}`);
    rows.push(`Total Coaches,${dashboard.overview.totalCoaches},${this.formatDateRange(dashboard.dateRange)}`);
    rows.push(`Total Reflections,${dashboard.overview.totalReflections},${this.formatDateRange(dashboard.dateRange)}`);
    
    // Session metrics
    rows.push(`Completion Rate,${dashboard.sessionMetrics.completionRate}%,${this.formatDateRange(dashboard.dateRange)}`);
    rows.push(`Avg Sessions/Week,${dashboard.sessionMetrics.averageSessionsPerWeek},${this.formatDateRange(dashboard.dateRange)}`);
    
    // Client engagement
    rows.push(`Client Retention Rate,${dashboard.clientEngagement.clientRetentionRate}%,${this.formatDateRange(dashboard.dateRange)}`);
    rows.push(`Reflection Submission Rate,${dashboard.clientEngagement.reflectionSubmissionRate}%,${this.formatDateRange(dashboard.dateRange)}`);
    
    return rows.join('\n');
  }

  private formatDateRange(dateRange: AnalyticsDateRange): string {
    const start = dateRange.startDate?.toISOString().split('T')[0] || 'N/A';
    const end = dateRange.endDate?.toISOString().split('T')[0] || 'N/A';
    return `${start} to ${end}`;
  }
}

export const analyticsService = new AnalyticsService(); 