# API Migration Guide: From Legacy Backend to Supabase

This guide helps migrate from legacy backend API calls to direct Supabase integration using our custom hooks.

## Migration Overview

The API layer (`client/src/lib/api.ts`) has been refactored to focus only on operations that require backend processing beyond what Supabase can handle directly.

### What Should Use Backend API
- Email sending (password reset, invitations, notifications)
- Payment processing
- Document generation (PDFs, reports)
- Third-party integrations (calendar sync, external APIs)
- Complex business logic that requires server-side processing

### What Should Use Supabase Hooks
- CRUD operations on database tables
- File storage and retrieval
- Real-time subscriptions
- Authentication (handled by AuthContext)
- Simple queries and data fetching

## Available Supabase Hooks

| Hook | Purpose | Replaces |
|------|---------|----------|
| `useSessions` | Session management | `sessionService.ts` functions |
| `useClients` | Client management | `clientService.ts` functions |
| `useCoachNotes` | Coach notes CRUD | `coachNoteService.ts` functions |
| `useReflections` | Reflection management | `reflectionService.ts` functions |
| `useSupabaseStorage` | File upload/download | File upload API endpoints |
| `useAnalytics` | Analytics data | Analytics API endpoints |
| `useSupabase` | General Supabase utilities | Generic database operations |

## Migration Examples

### Before: Legacy API Call
```typescript
// Old way - using backend API
import { fetchSessions, createSession } from '../services/sessionService';

const sessions = await fetchSessions();
const newSession = await createSession(sessionData);
```

### After: Supabase Hook
```typescript
// New way - using Supabase hook
import { useSessions } from '../hooks/useSessions';

const { 
  data: sessions, 
  isLoading, 
  error, 
  createSession 
} = useSessions();

// Usage in component
const handleCreateSession = async (sessionData) => {
  try {
    await createSession(sessionData);
    // Hook automatically updates the cache
  } catch (error) {
    console.error('Failed to create session:', error);
  }
};
```

## Service Migration Checklist

### 1. sessionService.ts ✅ Available Hook
- **Hook**: `useSessions`
- **Status**: Hook available, service can be deprecated
- **Migration**: Replace all `sessionService` imports with `useSessions` hook

### 2. resourceService.ts ⚠️ Needs Hook
- **Hook**: Need to create `useResources`
- **Status**: No hook available yet
- **Migration**: Create hook first, then migrate

### 3. coachNoteService.ts ✅ Available Hook  
- **Hook**: `useCoachNotes`
- **Status**: Hook available, service can be deprecated
- **Migration**: Replace all `coachNoteService` imports with `useCoachNotes` hook

### 4. reflectionService.ts ✅ Available Hook
- **Hook**: `useReflections`
- **Status**: Hook available, service can be deprecated
- **Migration**: Replace all `reflectionService` imports with `useReflections` hook

### 5. analyticsService.ts ✅ Available Hook
- **Hook**: `useAnalytics`
- **Status**: Hook available, service can be deprecated
- **Migration**: Replace all `analyticsService` imports with `useAnalytics` hook

## Step-by-Step Migration Process

### 1. Identify Usage
```bash
# Find all imports of a service
grep -r "from.*sessionService" client/src/
```

### 2. Update Imports
```typescript
// Before
import { fetchSessions, createSession } from '../services/sessionService';

// After  
import { useSessions } from '../hooks/useSessions';
```

### 3. Update Component Logic
```typescript
// Before - imperative API calls
const [sessions, setSessions] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  loadSessions();
}, []);

// After - declarative hook usage
const { data: sessions, isLoading, error } = useSessions();
```

### 4. Update Create/Update Operations
```typescript
// Before
const handleCreate = async (data) => {
  try {
    const newSession = await createSession(data);
    setSessions(prev => [...prev, newSession]);
  } catch (error) {
    console.error(error);
  }
};

// After
const { createSession } = useSessions();

const handleCreate = async (data) => {
  try {
    await createSession(data);
    // Hook automatically updates the cache
  } catch (error) {
    console.error(error);
  }
};
```

## Common Patterns

### Error Handling
```typescript
const { data, isLoading, error } = useSessions();

if (error) {
  return <div>Error: {error.message}</div>;
}
```

### Loading States
```typescript
const { data, isLoading } = useSessions();

if (isLoading) {
  return <div>Loading...</div>;
}
```

### Optimistic Updates
```typescript
const { createSession, updateSession } = useSessions();

// Hooks handle optimistic updates automatically
await createSession(newSessionData); // UI updates immediately
```

### Real-time Updates
```typescript
// Hooks automatically subscribe to real-time changes
const { data: sessions } = useSessions(); // Automatically updates when data changes
```

## Deprecated Services

The following services are marked for deprecation and should be migrated:

1. `sessionService.ts` → `useSessions`
2. `coachNoteService.ts` → `useCoachNotes`  
3. `reflectionService.ts` → `useReflections`
4. `analyticsService.ts` → `useAnalytics`
5. `resourceService.ts` → `useResources` (hook needs to be created)

## Backend API Usage

Keep using backend API (`apiFetch`) for:

```typescript
import { requestPasswordReset, sendInvitation, processPayment } from '../lib/api';

// Email operations
await requestPasswordReset(email);
await sendInvitation(email, role, inviterName);

// Payment processing  
await processPayment(paymentData);

// Document generation
await generateReport(reportData);
```

## Testing Migration

1. **Unit Tests**: Update tests to mock hooks instead of API calls
2. **Integration Tests**: Ensure Supabase operations work correctly
3. **E2E Tests**: Verify full user workflows still function

## Performance Benefits

- **Reduced Bundle Size**: Remove unused API service code
- **Better Caching**: React Query integration in hooks
- **Real-time Updates**: Automatic subscription to data changes
- **Offline Support**: Built-in optimistic updates
- **Type Safety**: Full TypeScript integration

## Rollback Plan

If issues arise during migration:

1. Temporarily revert to legacy API calls
2. Fix issues in Supabase hooks
3. Re-migrate with fixes

The `apiFetch` function remains available for emergency fallbacks. 