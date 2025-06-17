# System Patterns & Architecture

## Overview

The application follows a Monorepo architecture managed with npm workspaces, containing distinct `client` (frontend) and `server` (backend) applications, along with a `shared` directory for common types. **The system now implements enterprise-grade security patterns with comprehensive vulnerability remediation AND performance-first architecture with automated monitoring.**

## Performance-First Architecture (NEW - January 2025)

### 🚀 **Automated Performance Monitoring**
- **CI/CD Integration**: GitHub Actions workflow (`.github/workflows/performance.yml`) enforces performance budgets
- **Bundle Analysis**: Automated bundle size checking with `bundlesize2` and `size-limit` tools
- **Lighthouse CI**: Automated performance, accessibility, and SEO auditing on every PR
- **Performance Budgets**: Strict thresholds for bundle sizes and Core Web Vitals
  - App Components: < 90 kB gzipped
  - Vendor React: < 120 kB gzipped
  - Vendor Charts: < 50 kB gzipped
  - CSS Total: < 25 kB gzipped

### 📦 **Bundle Optimization Patterns**
- **Component Splitting**: Large monolithic components refactored with React.lazy()
  - **Example**: 1,672-line `NotesList.tsx` split into `NotesListOptimized.tsx` and `NotesListCore.tsx`
  - **Lazy Loading**: Heavy components (NoteEditor, NoteViewer, AnalyticsDashboard) loaded on-demand
- **Compression Strategy**: Brotli + Gzip achieving 60-70% size reduction
- **Modern Targeting**: ES2020 for smaller bundles with better tree-shaking
- **Vendor Chunking**: Strategic separation of React, charts, and other vendor libraries

### 📊 **Performance Monitoring Infrastructure**
- **Bundle Analyzer**: `rollup-plugin-visualizer` generates detailed composition reports
- **Real-time Metrics**: Build-time performance statistics and compression ratios
- **Documentation**: Comprehensive performance budgets guide (`docs/performance-budgets.md`)
- **Emergency Procedures**: Incident response for performance regressions

## Security Architecture (Enterprise-Grade)

### 🔒 **Encryption & Data Protection**
- **Encryption Service**: Custom `EncryptionService` using AES-256-CBC with random IV generation
- **Data-at-Rest**: All sensitive data (coach notes) encrypted with unique IVs per operation
- **Key Management**: 32-byte hex encryption keys with format validation
- **Migration Support**: Secure migration scripts for transitioning existing encrypted data

### 🛡️ **Authentication & Authorization**
- **Strong Password Policy**: 12+ character minimum with complexity requirements
  - Uppercase, lowercase, number, and special character mandatory
  - Applied to registration, password reset, and updates
- **Secret Management**: Zero default fallbacks, mandatory environment configuration
- **JWT Security**: Separate access/refresh tokens with secure random secrets
- **Session Security**: Hardened session configuration with secure cookies

### 🌐 **Network Security**
- **CORS Hardening**: Strict origin validation
  - Production: Only specific CLIENT_URL allowed
  - Development: Controlled localhost access only
  - No permissive origin allowance
- **Request Validation**: Comprehensive input validation and sanitization
- **Rate Limiting**: Multi-tier protection against abuse

### 🔍 **Environment & Configuration Security**
- **Startup Validation**: Comprehensive environment variable checks
- **Production Safeguards**: Specific validation for production deployments
- **Secret Validation**: Detection and rejection of default/weak secrets
- **Fail-Fast Approach**: Application terminates if security requirements not met

### 📋 **Security Documentation & Migration**
- **Setup Guides**: Complete security configuration instructions
- **Migration Scripts**: Safe transition tools for existing data
- **Audit Reports**: Detailed vulnerability analysis and remediation
- **Emergency Procedures**: Critical fix guides for immediate response

## Payment Management Architecture (Complete - January 2025)

### 💳 **Full-Stack Payment System**
- **Backend Controllers**: Dedicated `paymentController.ts` with full CRUD operations
- **API Routes**: Comprehensive `paymentRoutes.ts` with RESTful endpoints
- **Frontend Service**: `paymentService.ts` providing clean API integration layer
- **Dashboard Components**: `PaymentDashboard.tsx` with filtering, sorting, and batch operations
- **Database Integration**: Proper Supabase relationships between payments, sessions, and users

### 🎯 **Payment Features**
- **Status Management**: Comprehensive payment status tracking (paid, pending, overdue, cancelled)
- **Batch Operations**: Efficient bulk status updates for multiple payments
- **Analytics Dashboard**: Coach-specific payment summaries and insights
- **Client Management**: Payment filtering and search by client
- **History Tracking**: Complete payment history with session linking
- **Mobile Optimization**: Responsive design with performance optimizations

## Frontend (`client`)

*   **Framework:** React (Vite) with performance-first architecture
*   **Architecture:** Component-based with optimized lazy loading patterns
*   **Performance:** Automated bundle analysis, component splitting, compression
*   **Data Fetching:** Primarily uses `@tanstack/react-query` for server state management, caching, and synchronization
*   **Routing:** Client-side routing handled by `react-router-dom`
*   **Styling:** Tailwind CSS utility-first approach with RTL support
*   **State Management:** React Query for server state, React Context for global UI state
*   **Internationalization:** `i18next` for bilingual (Hebrew RTL / English LTR) support
*   **Build:** Vite with advanced optimization (compression, modern targeting, vendor chunking)
*   **Security:** CORS-protected API communication, secure authentication flows
*   **Quality Assurance:** Automated performance budgets, regression testing

## Backend (`server`)

*   **Framework:** Express.js on Node.js with Supabase integration
*   **Architecture:** RESTful API with service layer pattern (e.g., PaymentService)
*   **Authentication:** Supabase JWT authentication with row-level security
*   **Database:** Supabase PostgreSQL with 16-table schema and comprehensive RLS policies
*   **API Structure:** Feature-organized routes (auth, sessions, payments, admin, users)
*   **Middleware:** Authentication, role checks, security hardening, error handling
*   **Payment Processing:** Complete payment management system with dashboard integration
*   **Deployment:** Vercel serverless functions with environment validation
*   **Security:** Enterprise-grade encryption, environment validation, secure secret management

## Shared (`shared`)

*   Contains TypeScript types and utility functions shared between client and server
*   Ensures type consistency across the full stack
*   Updated for Supabase schema integration

## Data Flow

1.  Client makes API requests to the backend (via `client/src/lib/api.ts` using `apiFetch`)
2.  Backend Express routes handle requests with security middleware
3.  Controllers process requests using service layer (e.g., PaymentService)
4.  Services interact with Supabase database using RLS policies
5.  Backend sends secure JSON responses back to client
6.  Client uses `@tanstack/react-query` for caching and UI updates
7.  Performance monitoring tracks bundle sizes and Core Web Vitals

## Key Technical Decisions & Patterns

*   **Performance-First Development:** Automated monitoring prevents regressions
*   **Component Optimization:** Large components split with React.lazy() for better loading
*   **Security by Default:** Zero fallbacks, mandatory secure configuration
*   **Service Layer Architecture:** Clean separation between API routes and business logic
*   **Supabase Integration:** Complete migration to unified backend with RLS security
*   **Payment Management:** Enterprise-grade payment system with full dashboard
*   **Quality Automation:** CI/CD pipelines enforce performance and security standards
*   **Bilingual Architecture:** Complete RTL/LTR support with i18next
*   **Mobile-First:** Responsive design with performance optimization for low-end devices

## Performance Implementation Patterns

### **Component Splitting Pattern**
```typescript
// Large component refactored with lazy loading
const NoteEditor = React.lazy(() => import('./NoteEditor'));
const AnalyticsDashboard = React.lazy(() => import('./AnalyticsDashboard'));

// Main component with Suspense boundaries
const OptimizedComponent = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <LazyComponent />
  </Suspense>
);
```

### **Bundle Analysis Pattern**
```typescript
// Vite configuration with performance monitoring
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['recharts'],
          'vendor-other': ['@radix-ui/*']
        }
      }
    }
  },
  plugins: [
    bundleAnalyzer({ openAnalyzer: false }),
    compression2({ include: /\.(js|css|html|svg)$/ })
  ]
});
```

### **Performance Budget Pattern**
```typescript
// Package.json bundle size configuration
"bundlesize": [
  {
    "path": "./dist/assets/app-*.js",
    "maxSize": "90 kB",
    "compression": "gzip"
  },
  {
    "path": "./dist/assets/vendor-react-*.js", 
    "maxSize": "120 kB",
    "compression": "gzip"
  }
]
```

## Payment System Implementation Patterns

### **Service Layer Pattern**
```typescript
// Clean API service with error handling
class PaymentService {
  async getPayments(coachId: string, filters?: PaymentFilters) {
    return this.supabaseClient
      .from('payments')
      .select('*, sessions(*), users(*)')
      .eq('coach_id', coachId)
      .filter(filters);
  }
  
  async updatePaymentStatus(paymentId: string, status: PaymentStatus) {
    // Implementation with validation and audit logging
  }
}
```

### **Dashboard Component Pattern**
```typescript
// Feature-rich dashboard with filtering and batch operations
const PaymentDashboard = () => {
  const [filters, setFilters] = useState<PaymentFilters>({});
  const { data: payments, isLoading } = usePayments(filters);
  
  return (
    <div className="space-y-6">
      <PaymentFilters onFiltersChange={setFilters} />
      <PaymentSummary payments={payments} />
      <PaymentTable payments={payments} />
    </div>
  );
};
```

## Security Implementation Patterns

### **Encryption Pattern**
```typescript
// Secure encryption with random IV
const { encrypted, iv } = EncryptionService.encrypt(sensitiveData);
// Store both encrypted data and IV
model.encryptedField = encrypted;
model.encryptionIV = iv;
```

### **Environment Validation Pattern**
```typescript
// Fail-fast validation at startup
if (!process.env.REQUIRED_SECRET) {
  console.error('FATAL ERROR: Required secret missing');
  process.exit(1);
}
```

### **CORS Security Pattern**
```typescript
// Strict origin validation
origin: (origin, callback) => {
  if (process.env.NODE_ENV === 'production') {
    return origin === process.env.CLIENT_URL ? 
      callback(null, true) : callback(new Error('Not allowed by CORS'));
  }
  // Development: controlled access only
}
```

### **Password Validation Pattern**
```typescript
// Strong password requirements
password: z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
         'Must contain uppercase, lowercase, number, and special character')
```

## Testing & Quality Patterns

### **Regression Testing Pattern**
```typescript
// Comprehensive auth context mocking
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test-user-id' } },
    user: { id: 'test-user-id', role: 'coach' },
    loading: false,
    // ... complete auth state
  }),
}));
```

### **Performance Testing Pattern**
```yaml
# GitHub Actions performance enforcement
- name: Check bundle size
  run: cd client && npm run bundlesize
  
- name: Run Lighthouse CI
  run: npm run lighthouse
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Areas for Improvement / Review

*   **Performance Monitoring:** Continue expanding performance metrics and monitoring
*   **Component Optimization:** Apply lazy loading patterns to remaining large components
*   **Bundle Analysis:** Regular review of bundle composition for optimization opportunities
*   **Testing Coverage:** Expand regression testing for performance and security patterns
*   **Documentation:** Keep performance guides updated with new optimization techniques
*   **Security Monitoring:** Implement runtime security event logging for production
*   **Payment Features:** Consider additional payment analytics and reporting capabilities

## Architecture Compliance & Standards

*   **Performance:** Automated budgets ensure consistent fast loading times
*   **Security:** Enterprise-grade encryption and authentication meets industry standards
*   **Payment Processing:** Complete payment management with audit trails and role-based access
*   **Code Quality:** Automated testing and CI/CD enforcement prevent regressions
*   **Documentation:** Comprehensive guides ensure proper implementation and maintenance
*   **Scalability:** Component splitting and service layer patterns support growth
