# System Patterns

## Architecture

Full-stack Progressive Web App (PWA) with a React TypeScript frontend, leveraging **Supabase for backend services (Auth, PostgreSQL DB, Storage, Realtime APIs)**. Node.js/Express backend for API endpoints and server-side logic. **The project is structured as an npm monorepo using workspaces (`client/`, `server/`).**

## Database Schema & Security

The database is designed with a secure, role-based access control system using **Supabase Row-Level Security (RLS)**.

```
┌─────────┐      ┌───────────┐       ┌────────────┐      ┌─────────────┐
│  roles  │◄────►│   users   │◄─────►│  sessions  │◄─────►│ reflections │
└─────────┘      └───────────┘       └────────────┘      └─────────────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │ coach_notes │
                                    └─────────────┘
```

Key tables and relationships:

- **roles**: Defines user types (`admin`, `coach`, `client`)
- **users**: User profiles linked to auth.users via auth_id
- **sessions**: Coaching sessions linking coaches and clients
- **reflections**: Client reflections on sessions
- **coach_notes**: Private coach notes for sessions

## Row-Level Security (RLS) Patterns

1. **Role-Based Access Control**:

   ```sql
   CREATE POLICY users_admin_all ON users
       FOR ALL
       TO authenticated
       USING (get_user_role() = 'admin');
   ```

2. **User-Based Ownership**:

   ```sql
   CREATE POLICY users_read_own ON users
       FOR SELECT
       TO authenticated
       USING (auth_id = auth.uid());
   ```

3. **Helper Functions for RLS**:

   ```sql
   CREATE OR REPLACE FUNCTION get_user_role()
   RETURNS TEXT AS $$
       -- Implementation that gets user role based on auth.uid()
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

4. **Relationship-Based Access Control**:
   ```sql
   CREATE POLICY reflections_coach_all ON reflections
       FOR ALL
       TO authenticated
       USING (
           get_user_role() = 'coach' AND
           session_id IN (
               SELECT id FROM sessions
               WHERE coach_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
           )
       );
   ```

## Component Implementation Pattern

1. Use TypeScript for all React components (.tsx extension)
2. Use proper type definitions for component props and state
3. Export components as default exports for compatibility with Fast Refresh
4. Use React.FC type sparingly (prefer explicit props interfaces)
5. Follow consistent pattern for hooks:
   ```typescript
   export function useCustomHook(): ReturnType {
     // Implementation
   }
   ```
6. Avoid exporting hooks as const assignments that are later renamed

## Authentication Flow

1. **Regular User Authentication:**
   - User enters credentials on the Auth page
   - Application performs connectivity checks before authentication attempts
   - Authentication request is sent to Supabase Auth API
   - On success, user session is stored and profile is fetched from the database
   - Role-based redirection occurs (coach vs client dashboard)
   - Role-Based Access Control (RBAC) is enforced via Supabase RLS policies

2. **Client Invitation and Registration:**
   - Coach invites client via POST /api/invite-client (email required)
   - System creates secure 48-byte hex token with 30-minute TTL
   - Invitation email sent to client with unique link containing token
   - Client follows link and submits registration details
   - System validates token and email match
   - On success, client account is created, linked to coach
   - Used token is invalidated to prevent reuse

3. **Password Reset Flow:**
   - User requests password reset via POST /api/password-reset (email required)
   - System creates secure 48-byte hex token with 30-minute TTL
   - Reset email sent to user with unique link containing token
   - User follows link and submits new password
   - System validates token before allowing password update
   - On success, password is updated and token is invalidated

4. **Admin Approval Flow:**
   - Coach registers an account (status: pending, isApproved: false)
   - Admin views pending coaches via admin dashboard
   - Admin approves coach via PATCH /api/coach/:id/approve
   - Coach status updated to active, isApproved set to true

## Token Security Patterns

1. **Secure Token Generation:**
   ```typescript
   export const generateToken = async (): Promise<string> => {
     // Generate 48 bytes (96 hex characters) of random data
     const buffer = await promisify(crypto.randomBytes)(48);
     return buffer.toString('hex');
   };
   ```

2. **Token Storage with TTL:**
   ```typescript
   const InviteTokenSchema = new Schema<IInviteToken>({
     token: { type: String, required: true, unique: true },
     coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
     email: { type: String, required: true },
     expires: { type: Date, required: true },
   });
   
   // Create TTL index for automatic cleanup
   InviteTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });
   ```

3. **Token Validation:**
   ```typescript
   export const validateInviteToken = async (token: string): Promise<IInviteToken | null> => {
     const inviteToken = await InviteToken.findOne({ token });
     
     if (!inviteToken) {
       return null;
     }
     
     // Check if token is expired
     if (inviteToken.expires < new Date()) {
       await InviteToken.deleteOne({ _id: inviteToken._id });
       return null;
     }
     
     return inviteToken;
   };
   ```

4. **Token Invalidation:**
   ```typescript
   export const invalidateInviteToken = async (token: string): Promise<boolean> => {
     const result = await InviteToken.deleteOne({ token });
     return result.deletedCount > 0;
   };
   ```

5. **Rate Limiting:**
   ```typescript
   // Check if coach has reached the maximum number of pending invites
   const pendingInvitesCount = await InviteToken.countDocuments({
     coachId: coachId,
   });
   
   if (pendingInvitesCount >= MAX_PENDING_INVITES) {
     return res.status(429).json({
       message: `Maximum pending invites (${MAX_PENDING_INVITES}) reached. Please wait for clients to respond or delete existing invites.`,
     });
   }
   ```

## Role-Based Authorization Pattern

1. **Authentication Middleware:**
   ```typescript
   export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
     if (req.isAuthenticated()) {
       return next();
     }
     res.status(401).json({ message: 'Unauthorized' });
   };
   ```

2. **Role-Based Access Control:**
   ```typescript
   export const isCoach = (req: Request, res: Response, next: NextFunction): void => {
     if (req.isAuthenticated() && req.user?.role === 'coach') {
       return next();
     }
     res.status(403).json({ message: 'Access denied' });
   };
   
   export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
     if (req.isAuthenticated() && req.user?.role === 'admin') {
       return next();
     }
     res.status(403).json({ message: 'Access denied' });
   };
   ```

3. **Middleware Chaining for Protected Routes:**
   ```typescript
   // Coach-only route
   router.post('/invite-client', isAuthenticated, isCoach, inviteController.inviteClient);
   
   // Admin-only route
   router.patch('/coach/:id/approve', isAuthenticated, isAdmin, adminController.approveCoach);
   ```

## Error Handling Pattern

1. Connectivity check before critical API operations
2. DNS resolution testing for network diagnostics
3. User-friendly error messages with troubleshooting steps
4. Retry mechanisms for transient issues
5. Centralized error handling in the authentication context
6. Clear loading states during async operations
7. TypeScript typing for error objects for better error handling

## TypeScript Type Safety Patterns

1. **Avoid `any` Type:** Replace with more specific types:

   ```typescript
   // ❌ Avoid
   function processData(data: any): any { ... }

   // ✅ Preferred
   function processData(data: Record<string, unknown>): DataResult { ... }
   ```

2. **Safe Type Casting:** Use two-step casting with `unknown` as intermediate:

   ```typescript
   // ❌ Avoid
   const result = data as ResultType;

   // ✅ Preferred
   const result = data as unknown as ResultType;
   ```

3. **Type Guarding:** Use type guards to narrow unknown types:

   ```typescript
   if (error instanceof Error) {
     console.error(error.message);
   } else {
     console.error('Unknown error occurred');
   }
   ```

4. **Utility Functions for Type Conversion:**

   ```typescript
   // Convert string IDs to numbers safely
   function getNumericUserId(req: Request): number {
     const id = req.user?.id;
     return typeof id === 'string' ? parseInt(id, 10) : id;
   }
   ```

5. **Optional Chaining:** Use `?.` instead of non-null assertions:

   ```typescript
   // ❌ Avoid
   const role = req.user!.role;

   // ✅ Preferred
   const role = req.user?.role;
   ```

6. **Dynamic Object Types:** Use `Record<string, unknown>` for objects with dynamic keys:

   ```typescript
   const query: Record<string, unknown> = {};
   if (req.user?.role === 'coach') {
     query.coachId = req.user.id;
   }
   ```

7. **Proper Function Return Types:** Explicitly type function returns:

   ```typescript
   async function createUser(data: UserInput): Promise<Partial<IUser>> { ... }
   ```

8. **Type Declaration Files:** Use .d.ts files to extend existing types:

   ```typescript
   // In express.d.ts
   import 'express';

   declare global {
     namespace Express {
       interface User {
         id: string | number;
         role: 'coach' | 'client' | 'admin';
         // Additional properties
       }
     }
   }

   export {};
   ```

9. **Interface Augmentation:** Use declaration merging to extend third-party types:

   ```typescript
   // Extend the Session interface
   declare global {
     interface Session extends Express.Session {
       coachReflectionReminderSent?: boolean;
       // Additional properties
     }
   }
   ```

10. **Pragmatic TypeScript Configuration:** Selectively relax type checking for specific scenarios:

    ```json
    // tsconfig.json
    {
      "compilerOptions": {
        "noPropertyAccessFromIndexSignature": false,
        "strictNullChecks": false
        // Additional options
      }
    }
    ```

11. **Targeted @ts-nocheck Pragmas:** Use selectively for complex files:
    ```typescript
    // @ts-nocheck
    // Complex file with challenging type issues
    ```

## UI Component Pattern

1. Consistent use of shadcn/ui component library
2. Custom Tailwind color scheme (lumea-\*)
3. Responsive design with mobile-first approach
4. Common error display patterns
5. Internationalization support in all components
6. Dark/light theme support
7. Debugging components with clear visibility styles when needed

## State Management

1. React Context API for authentication state
2. Local component state for UI interactions
3. Form state management with React Hook Form
4. Centralized Supabase client instance
5. Session persistence using Supabase auth persistence
6. Strongly typed state with TypeScript interfaces

## Data Flow

1. Supabase Auth for user authentication and session management
2. Database tables with proper relations (users, profiles, sessions)
3. Row Level Security (RLS) for data access control
4. RESTful API patterns for data operations
5. Strict type definitions with TypeScript
6. Type-safe API responses and request payloads

## Development Workflow

1. **Dependency Management:** Use npm workspaces. Enforce single versions of critical shared dependencies (like TS, React types) using root `package.json` `overrides` and exact version pinning in individual `package.json` files.
2. **TypeScript Configuration:** Use separate `tsconfig.json` files for root, client, and server. Isolate client config using `extends "./tsconfig.base.json"` pattern to prevent root interference.
3. CI/CD pipeline with GitHub Actions for automated testing and deployment.
4. TypeScript type checking for maintaining code quality (`npm --workspace client run typecheck`).
5. ESLint for code style enforcement.
6. Package scripts for common development tasks.
7. Environment-specific configurations (.env files).

## Critical Implementation Paths

1. Robust authentication flow with proper error handling
2. Secure data access patterns with RLS policies
3. Comprehensive internationalization (i18n) support
4. Responsive UI components with proper accessibility
5. Environment configuration management
6. TypeScript type definitions for key interfaces and API responses

Key technical decisions: Utilizing PWA features for app-like experience and offline capabilities. Choosing React with TypeScript for type safety and better developer experience. Using functional components/hooks for the frontend. Employing Tailwind CSS for utility-first styling. Using i18next for robust internationalization (Hebrew/RTL first). **Relying on Supabase Auth and Row Level Security (RLS) for secure data access.** RESTful principles applied via Supabase auto-generated APIs.

Design patterns in use: MVC/MVVM patterns relevant to React frontend structure. Service Worker caching strategies (Cache First, Network First). State management patterns (Context API or libraries like Zustand/Redux Toolkit) needed for React frontend. TypeScript interface patterns for type safety. **Monorepo workspace pattern.** **Isolated TypeScript configuration pattern (`extends`).** **Role-based access control (RBAC) via RLS policies.**

Component relationships: Clear data relationships managed in Supabase tables: Coach manages Clients (via `coach_id` FK); Sessions link Coach and Client; Reflections link to Sessions/Clients; Resources managed by Coaches. Admin role oversees Coaches. Supabase Auth (`auth.users`) links to user profile data.

Critical implementation paths: Defining robust Supabase RLS policies for all tables. Implementing comprehensive Hebrew/RTL support across the entire UI. Setting up Supabase Storage and policies for secure file uploads. Encrypting sensitive data at rest (potentially using Supabase features or application-level encryption if needed). Implementing functional offline capabilities via Service Worker (primarily for UI shell and read-only data). Ensuring TypeScript type safety throughout the codebase.

## Coach Dashboard Pattern

### API Structure
1. **Coach's Clients Endpoint:**
   ```typescript
   // GET /api/my-clients - Role-protected endpoint
   router.get('/my-clients', isAuthenticated, isCoach, clientController.getMyClients);
   ```

2. **Client-Specific Authorization:**
   ```typescript
   // Only return clients associated with the authenticated coach
   const clients = await User.find({
     coach: req.user._id,
     role: 'client'
   })
   .sort({ createdAt: -1 })
   .skip(skip)
   .limit(limit);
   ```

3. **Session Management:**
   ```typescript
   // GET /api/sessions - With optional client filtering
   router.get('/sessions', isAuthenticated, isCoach, sessionController.getSessions);

   // POST /api/sessions - Create new session
   router.post('/sessions', isAuthenticated, isCoach, sessionController.createSession);
   ```

### Data Fetching Pattern

1. **TanStack Query Hooks:**
   ```typescript
   // Custom hook with pagination, filtering and polling
   export const useClientsData = (page = 1, limit = 10, search = '') => {
     const queryClient = useQueryClient();
     
     // Query for fetching data with automatic polling
     const { data, isLoading, error } = useQuery({
       queryKey: ['clients', page, limit, search],
       queryFn: () => fetchClients(page, limit, search),
       refetchInterval: 30000, // Poll every 30 seconds
     });
     
     // Mutation for creating/updating data
     const mutation = useMutation({
       mutationFn: createData,
       onSuccess: () => {
         // Invalidate and refetch
         queryClient.invalidateQueries({ queryKey: ['clients'] });
       },
     });
     
     return {
       clients: data?.clients || [],
       pagination: data?.pagination,
       isLoading,
       error,
       createData: mutation.mutate,
       isCreating: mutation.isPending,
     };
   };
   ```

2. **Optimistic Updates Pattern:**
   ```typescript
   const createMutation = useMutation({
     mutationFn: createSession,
     onMutate: async (newSession) => {
       // Cancel outgoing refetches
       await queryClient.cancelQueries({ queryKey: ['sessions'] });
       
       // Snapshot the previous value
       const previousSessions = queryClient.getQueryData(['sessions']);
       
       // Optimistically update the cache
       queryClient.setQueryData(['sessions'], (old) => ({
         ...old,
         sessions: [
           { _id: `temp-${Date.now()}`, ...newSession },
           ...old.sessions
         ],
       }));
       
       return { previousSessions };
     },
     onError: (err, newSession, context) => {
       // If there's an error, roll back
       queryClient.setQueryData(['sessions'], context.previousSessions);
     },
     onSettled: () => {
       // Always refetch to synchronize
       queryClient.invalidateQueries({ queryKey: ['sessions'] });
     },
   });
   ```

### UI Component Patterns

1. **Empty State Pattern:**
   ```tsx
   if (items.length === 0) {
     return (
       <div className="flex flex-col items-center justify-center p-8 text-center">
         <div className="illustration-container">
           {/* Illustration SVG */}
         </div>
         <h3 className="text-xl font-semibold mb-2">{t('noItemsYet')}</h3>
         <p className="text-gray-600 mb-6">{t('noItemsMessage')}</p>
         <button
           onClick={onActionClick}
           className="bg-primary text-white px-6 py-3 rounded-lg"
         >
           {t('actionButton')}
         </button>
       </div>
     );
   }
   ```

2. **Modal Dialog Pattern:**
   ```tsx
   <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
     {/* Backdrop */}
     <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
     
     {/* Dialog positioning */}
     <div className="fixed inset-0 flex items-center justify-center p-4">
       <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6">
         <Dialog.Title className="text-lg font-semibold">
           {t('dialogTitle')}
         </Dialog.Title>
         
         {/* Dialog content */}
         <form onSubmit={handleSubmit}>
           {/* Form fields */}
           
           {/* Action buttons */}
           <div className="flex justify-end space-x-3">
             <button type="button" onClick={handleClose}>
               {t('cancel')}
             </button>
             <button type="submit" disabled={isLoading}>
               {isLoading ? <LoadingSpinner /> : t('submit')}
             </button>
           </div>
         </form>
       </Dialog.Panel>
     </div>
   </Dialog>
   ```

3. **RTL Support Pattern:**
   ```tsx
   // In component
   const { t, i18n } = useTranslation();
   const isRTL = i18n.language === 'he';
   const locale = isRTL ? he : undefined;
   
   // In JSX
   <div dir={isRTL ? 'rtl' : 'ltr'}>
     <span className={`text-align: ${isRTL ? 'right' : 'left'}`}>
       {t('label')}
     </span>
   </div>
   
   // In date formatting
   format(date, 'PPP', { locale });
   ```

4. **Date Grouping Pattern:**
   ```typescript
   // Group items by date categories
   const groupByDate = (items) => {
     const today = new Date();
     const grouped = {
       today: [],
       yesterday: [],
       thisWeek: [],
       thisMonth: [],
       older: [],
     };

     items.forEach((item) => {
       const itemDate = new Date(item.date);
       
       if (isToday(itemDate)) {
         grouped.today.push(item);
       } else if (isYesterday(itemDate)) {
         grouped.yesterday.push(item);
       } else if (isSameWeek(itemDate, today)) {
         grouped.thisWeek.push(item);
       } else if (isSameMonth(itemDate, today)) {
         grouped.thisMonth.push(item);
       } else {
         grouped.older.push(item);
       }
     });

     return grouped;
   };
   ```

### Testing Patterns

1. **Component Test Pattern:**
   ```typescript
   describe('ComponentName', () => {
     // Mock translations
     vi.mock('react-i18next', () => ({
       useTranslation: () => ({
         t: (key) => translationsMap[key] || key,
         i18n: { language: 'en' },
       }),
     }));
     
     it('renders empty state when no data', () => {
       render(<Component items={[]} />);
       expect(screen.getByText('No items yet')).toBeInTheDocument();
     });
     
     it('renders items when data exists', () => {
       const mockItems = [/* mock data */];
       render(<Component items={mockItems} />);
       expect(screen.getByText(mockItems[0].name)).toBeInTheDocument();
     });
   });
   ```

2. **E2E Test Pattern:**
   ```typescript
   test('Happy path flow', async ({ page }) => {
     // Set mobile viewport
     await page.setViewportSize({ width: 375, height: 812 });
     
     // Login
     await page.goto('/login');
     await page.fill('input[type="email"]', 'coach@example.com');
     await page.fill('input[type="password"]', 'password123');
     await page.click('button[type="submit"]');
     
     // Navigate to feature
     await page.click('text=Clients');
     
     // Perform action
     await page.click('button:has-text("Invite")');
     await page.fill('input[type="email"]', 'new@example.com');
     await page.click('button:has-text("Send")');
     
     // Verify result
     await expect(page.locator('text=new@example.com')).toBeVisible();
   });
   ```

## Reflections Feature Patterns

1. **Client-Side Encryption Pattern**:
   ```typescript
   // Initialize encryption library
   await Encryption.init();
   
   // Generate a unique encryption key
   const encryptionKey = Encryption.generateKey();
   
   // Encrypt data before transmission
   const encryptedBlob = await Encryption.encryptFile(audioBlob, encryptionKey);
   
   // Store encryption key in IndexedDB
   await saveEncryptionKey(reflectionId, encryptionKey);
   ```

2. **Offline Queue Pattern**:
   ```typescript
   // Check connectivity status before API call
   if (isOnline) {
     // Send data directly to the server
     const response = await fetch('/api/reflections', { ... });
   } else {
     // Queue for later synchronization
     await addToOfflineQueue({
       url: '/api/reflections',
       method: 'POST',
       body: requestData,
       timestamp: Date.now(),
       reflectionId: tempReflectionId
     });
     
     // Add optimistic update
     queryClient.setQueryData(['reflections'], (old = []) => [newReflection, ...old]);
   }
   ```

3. **Background Sync Pattern**:
   ```typescript
   // Monitor network status
   useEffect(() => {
     if (isOnline) {
       // Process offline queue when connectivity returns
       const queue = await getOfflineQueue();
       
       for (const item of queue) {
         try {
           const response = await fetch(item.url, { ... });
           if (response.ok) {
             await removeFromOfflineQueue(item.id);
             queryClient.invalidateQueries(['reflections']);
           }
         } catch (error) {
           // Keep in queue for retry
         }
       }
     }
   }, [isOnline]);
   ```

4. **S3 Presigned URL Pattern**:
   ```typescript
   // Generate presigned URL for secure upload
   const command = new PutObjectCommand({
     Bucket: BUCKET_NAME,
     Key: objectKey,
     ContentType: mimeType,
   });
   
   const presignedUrl = await getSignedUrl(s3Client, command, {
     expiresIn: EXPIRATION_TIME,
   });
   
   // Client uploads directly to S3
   const uploadResponse = await fetch(presignedUrl, {
     method: 'PUT',
     headers: { 'Content-Type': mimeType },
     body: encryptedBlob,
   });
   ```

5. **Multi-Step UI Pattern**:
   ```typescript
   const [step, setStep] = useState<'text' | 'audio' | 'review'>('text');
   
   // Render different UI based on current step
   {step === 'text' && (
     <TextInputComponent onNext={() => setStep('audio')} />
   )}
   
   {step === 'audio' && (
     <AudioRecorderComponent
       onBack={() => setStep('text')}
       onNext={() => setStep('review')}
     />
   )}
   
   {step === 'review' && (
     <ReviewComponent
       onBack={() => setStep('audio')}
       onSubmit={handleSubmit}
     />
   )}
   ```

6. **Timeline Visualization Pattern**:
   ```typescript
   // Group reflections by date
   const reflectionsByDate = useMemo(() => {
     if (!data) return {};
     
     return data.reduce<Record<string, Reflection[]>>((acc, reflection) => {
       const date = format(parseISO(reflection.createdAt), 'yyyy-MM-dd');
       if (!acc[date]) acc[date] = [];
       acc[date].push(reflection);
       return acc;
     }, {});
   }, [data]);
   
   // Render timeline by date groups
   {Object.entries(reflectionsByDate)
     .sort((a, b) => (a[0] > b[0] ? -1 : 1))
     .map(([date, reflections]) => (
       <DateGroup key={date} date={date} reflections={reflections} />
     ))}
   ```

7. **Mobile Platform Integration Pattern**:
   ```typescript
   // Check platform
   const isNative = Capacitor.isNativePlatform();
   
   // Request permissions based on platform
   const requestMicrophonePermissions = async (): Promise<boolean> => {
     if (!isNative) return true; // Browser handles permissions
     
     const { microphone } = await Permissions.query({
       name: Capacitor.getPlatform() === 'ios' 
         ? 'microphone' 
         : 'android.permission.RECORD_AUDIO',
     });
     
     return microphone.state === 'granted';
   };
   
   // Save files using platform-specific methods
   const saveFile = async (blob: Blob, fileName: string): Promise<string> => {
     if (!isNative) return URL.createObjectURL(blob);
     
     // Convert to base64 and save to filesystem
     const base64Data = await blobToBase64(blob);
     const result = await Filesystem.writeFile({
       path: fileName,
       data: base64Data,
       directory: Directory.Cache,
     });
     
     return result.uri;
   };
   ```
