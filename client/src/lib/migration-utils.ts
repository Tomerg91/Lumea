/**
 * Migration utilities for transitioning from legacy API services to Supabase hooks
 * 
 * This file provides helper functions and migration patterns to ease the transition
 * from legacy backend services to Supabase-powered hooks.
 */

export interface MigrationWarning {
  component: string;
  legacyService: string;
  recommendedHook: string;
  migrationGuide: string;
}

/**
 * Log a migration warning for a component using legacy services
 */
export function logMigrationWarning(warning: MigrationWarning): void {
  console.group(`🔄 Migration Needed: ${warning.component}`);
  console.warn(`Legacy service: ${warning.legacyService}`);
  console.info(`Recommended hook: ${warning.recommendedHook}`);
  console.info(`Migration guide: ${warning.migrationGuide}`);
  console.groupEnd();
}

/**
 * Service to hook migration mappings
 */
export const SERVICE_TO_HOOK_MAPPING = {
  // Session management
  'sessionService.fetchSessions': 'useSessions()',
  'sessionService.createSession': 'useCreateSession()',
  'sessionService.updateSession': 'useUpdateSession()',
  'sessionService.cancelSession': 'useCancelSession()',
  'sessionService.rescheduleSession': 'useRescheduleSession()',
  'sessionService.fetchSessionById': 'useSession(id)',
  
  // Coach notes
  'coachNoteService.getAllNotes': 'useCoachNotes()',
  'coachNoteService.createNote': 'useCreateCoachNote()',
  'coachNoteService.updateNote': 'useUpdateCoachNote()',
  'coachNoteService.deleteNote': 'useDeleteCoachNote()',
  'coachNoteService.searchNotes': 'useSearchCoachNotes()',
  
  // Reflections
  'reflectionService.getClientReflections': 'useReflections()',
  'reflectionService.saveReflection': 'useCreateReflection()',
  'reflectionService.updateReflection': 'useUpdateReflection()',
  'reflectionService.deleteReflection': 'useDeleteReflection()',
  'reflectionService.getReflectionAnalytics': 'useReflectionStats()',
  
  // Resources
  'resourceService.getResources': 'useResources()',
  'resourceService.createResource': 'useCreateResource()',
  'resourceService.updateResource': 'useUpdateResource()',
  'resourceService.deleteResource': 'useDeleteResource()',
  
  // Client management
  'clientService.getClients': 'useClients()',
  'clientService.createClient': 'useCreateClient()',
  'clientService.updateClient': 'useUpdateClient()',
  
  // Analytics (already migrated)
  'analyticsService.getSessionAnalytics': 'useAnalyticsData()',
} as const;

/**
 * Get migration recommendation for a legacy service method
 */
export function getMigrationRecommendation(legacyMethod: string): string | null {
  return SERVICE_TO_HOOK_MAPPING[legacyMethod as keyof typeof SERVICE_TO_HOOK_MAPPING] || null;
}

/**
 * Migration patterns for common scenarios
 */
export const MIGRATION_PATTERNS = {
  // Pattern 1: Simple data fetching
  SIMPLE_FETCH: {
    before: `
// Legacy pattern
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const result = await legacyService.getData();
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);`,
    after: `
// Supabase hook pattern
const { data = [], isLoading, error } = useDataHook();`
  },
  
  // Pattern 2: Create operations
  CREATE_OPERATION: {
    before: `
// Legacy pattern
const handleCreate = async (formData) => {
  try {
    setLoading(true);
    const result = await legacyService.create(formData);
    setData(prev => [...prev, result]);
    setLoading(false);
  } catch (error) {
    setError(error);
    setLoading(false);
  }
};`,
    after: `
// Supabase hook pattern
const createMutation = useCreateHook();

const handleCreate = async (formData) => {
  try {
    await createMutation.mutateAsync(formData);
    // Data automatically updated via React Query cache
  } catch (error) {
    // Error handling via mutation state
  }
};`
  },
  
  // Pattern 3: Update operations
  UPDATE_OPERATION: {
    before: `
// Legacy pattern
const handleUpdate = async (id, updateData) => {
  try {
    setLoading(true);
    const result = await legacyService.update(id, updateData);
    setData(prev => prev.map(item => 
      item.id === id ? result : item
    ));
    setLoading(false);
  } catch (error) {
    setError(error);
    setLoading(false);
  }
};`,
    after: `
// Supabase hook pattern
const updateMutation = useUpdateHook();

const handleUpdate = async (id, updateData) => {
  try {
    await updateMutation.mutateAsync({ id, ...updateData });
    // Data automatically updated via React Query cache
  } catch (error) {
    // Error handling via mutation state
  }
};`
  }
};

/**
 * Check if a component needs migration based on imports
 */
export function checkComponentMigrationStatus(
  componentName: string,
  imports: string[]
): MigrationWarning[] {
  const warnings: MigrationWarning[] = [];
  
  const legacyServices = [
    'sessionService',
    'coachNoteService', 
    'reflectionService',
    'resourceService',
    'clientService'
  ];
  
  imports.forEach(importPath => {
    legacyServices.forEach(service => {
      if (importPath.includes(service)) {
        warnings.push({
          component: componentName,
          legacyService: service,
          recommendedHook: `use${service.replace('Service', '').charAt(0).toUpperCase() + service.replace('Service', '').slice(1)}`,
          migrationGuide: 'See /lib/api-migration-guide.md'
        });
      }
    });
  });
  
  return warnings;
}

/**
 * Performance benefits of migration
 */
export const MIGRATION_BENEFITS = {
  PERFORMANCE: [
    'Automatic caching with React Query',
    'Background refetching and stale data handling',
    'Optimistic updates for better UX',
    'Request deduplication',
    'Automatic retry logic'
  ],
  DEVELOPER_EXPERIENCE: [
    'Better TypeScript support',
    'Declarative data fetching',
    'Built-in loading and error states',
    'Real-time subscriptions',
    'Simplified state management'
  ],
  RELIABILITY: [
    'Connection pooling',
    'Automatic reconnection',
    'Row Level Security (RLS)',
    'Built-in authentication',
    'Reduced server load'
  ]
} as const;

/**
 * Migration checklist for components
 */
export function generateMigrationChecklist(componentName: string, legacyServices: string[]): string[] {
  const checklist = [
    `□ Audit ${componentName} for legacy service usage`,
    `□ Identify data requirements and access patterns`,
    `□ Replace legacy imports with Supabase hooks`,
    `□ Update component state management`,
    `□ Test CRUD operations with new hooks`,
    `□ Verify error handling and loading states`,
    `□ Test real-time updates (if applicable)`,
    `□ Update TypeScript types if needed`,
    `□ Remove legacy service dependencies`,
    `□ Add integration tests`,
    `□ Update component documentation`
  ];
  
  // Add service-specific items
  legacyServices.forEach(service => {
    checklist.push(`□ Migrate all ${service} method calls`);
  });
  
  return checklist;
}

/**
 * Helper to track migration progress
 */
export class MigrationTracker {
  private static instance: MigrationTracker;
  private migratedComponents: Set<string> = new Set();
  private pendingComponents: Set<string> = new Set();
  
  static getInstance(): MigrationTracker {
    if (!MigrationTracker.instance) {
      MigrationTracker.instance = new MigrationTracker();
    }
    return MigrationTracker.instance;
  }
  
  markComponentMigrated(componentName: string): void {
    this.migratedComponents.add(componentName);
    this.pendingComponents.delete(componentName);
    console.info(`✅ ${componentName} successfully migrated to Supabase hooks`);
  }
  
  markComponentPending(componentName: string): void {
    if (!this.migratedComponents.has(componentName)) {
      this.pendingComponents.add(componentName);
    }
  }
  
  getProgress(): { migrated: number; pending: number; total: number; percentage: number } {
    const migrated = this.migratedComponents.size;
    const pending = this.pendingComponents.size;
    const total = migrated + pending;
    const percentage = total > 0 ? Math.round((migrated / total) * 100) : 0;
    
    return { migrated, pending, total, percentage };
  }
  
  getMigrationReport(): string {
    const progress = this.getProgress();
    return `
Migration Progress Report:
- Migrated: ${progress.migrated} components
- Pending: ${progress.pending} components  
- Total: ${progress.total} components
- Completion: ${progress.percentage}%

Migrated Components:
${Array.from(this.migratedComponents).map(c => `  ✅ ${c}`).join('\n')}

Pending Components:
${Array.from(this.pendingComponents).map(c => `  ⏳ ${c}`).join('\n')}
    `;
  }
} 