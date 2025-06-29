# Lumea Coaching App

A modern, bilingual (Hebrew-first) coaching platform built for 1-on-1 Satya Method coaching sessions. The platform enables coaches to manage sessions, track client progress through reflections, maintain coaching notes, share resources, and includes a comprehensive admin panel for platform management.

## Features

- **Bilingual Support**: Hebrew-first interface with English support
- **Marketing Landing Page**: Professional landing page for coach conversion (`/landing`)
- **Session Management**: Schedule, track, and manage coaching sessions
- **Client Reflections**: Track client progress and insights
- **Coaching Notes**: Private notes for coaches about their clients
- **Resource Library**: Share and manage coaching resources
- **Admin Dashboard**: Comprehensive platform management tools
- **Payment Tracking**: Monitor session payments and send reminders
- **File Storage**: Secure storage for session recordings and resources
- **Mobile Responsive**: Fully responsive design for all devices
- **Coach Dashboard**: Manage clients, sessions, and invitations
- **Pricing Plans**: Three-tier subscription model (Starter ₪59/mo, Professional ₪189/mo, Enterprise ₪220/mo)

## Tech Stack

### Frontend

- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- i18next for internationalization
- @tanstack/react-query for data fetching
- date-fns for date manipulation
- zod for runtime type validation

### Backend

- Node.js with Express
- Supabase for database and authentication
- Prisma as ORM for database access
- JWT & Passport for authentication
- AWS S3 for file storage (optional)

## Prerequisites

- Node.js (v20 or higher) - **Updated requirement**
- npm (latest version recommended)
- Supabase account (or local Supabase setup)
- (Optional) AWS S3 account for file storage

## Quick Start Commands

```bash
# Install all dependencies
npm install

# Start development servers (client + server)
npm run dev

# Run tests
npm run test

# Run linting
npm run lint

# Generate Lighthouse report
npm run lighthouse

# Check bundle size
npm run analyze:bundle

# Run security audit
npm audit

# Run type checking
npm run typecheck
```

## Getting Started

1. Clone the repository:

```bash
git clone [repository-url]
cd lumea-coaching
```

2. Install server dependencies:

```bash
cd server
npm install
```

3. Install client dependencies:

```bash
cd ../client
npm install
```

4. Set up environment variables (see Environment Variables section)

5. Start the development servers:

Backend:

```bash
cd server
npm run dev
# Server runs on http://localhost:3000
```

Frontend:

```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

## Marketing Landing Page

The platform includes a comprehensive marketing landing page at `/landing` designed to convert Satya Method coaches to paid subscriptions.

### Features

- **Hero Section**: Compelling headline and dual CTAs (Start Today, Watch Demo)
- **Features Grid**: 6 key features including secure notes, audio reflections, payment automation
- **How It Works**: 3-step onboarding process visualization
- **Pricing Table**: Three-tier subscription plans with feature comparison
- **Testimonials**: Real coach testimonials with star ratings
- **Security Badges**: Trust-building elements (E2E encryption, GDPR compliance)
- **Language Toggle**: Hebrew/English language switching
- **RTL Support**: Automatic layout direction based on language
- **Responsive Design**: Mobile-first design with WCAG AA compliance

### Pricing Plans

- **Starter** (₪59/month): Up to 10 clients, basic features
- **Professional** (₪189/month): Up to 50 clients, advanced automation (Most Popular)
- **Enterprise** (₪220/month): Unlimited clients, full feature set

### Testing

Run the landing page tests:

```bash
cd client
npm run test -- --testPathPattern=HomeLanding.test.tsx
```

## Database

The project uses Supabase PostgreSQL with Row-Level Security (RLS) for data access control.

### Setting Up the Database

1. Install the Supabase CLI and start the local Supabase instance:

```bash
npm install -g supabase
supabase start
```

2. Run migrations to set up the database schema and RLS policies:

```bash
npm run db:migrate
```

3. Seed the database with initial data:

```bash
npm run db:seed
```

This will create:

- Admin, coach, and client user roles
- One user of each role type
- A sample coaching session with a reflection and coach notes

### Environment Variables for Seeding

Create a `.env` file in the project root with the following variables (example values):

```
# Supabase Connection
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Seed Users (use secure passwords in your local environment)
ADMIN_EMAIL=admin@lumea.com
ADMIN_PASSWORD=securepassword1
COACH_EMAIL=coach@lumea.com
COACH_PASSWORD=securepassword2
CLIENT_EMAIL=client@lumea.com
CLIENT_PASSWORD=securepassword3
```

### Testing RLS Policies

The project includes tests to verify that RLS policies are working correctly:

```bash
npm run test:rls
```

This runs a test suite that checks access permissions for different user roles:

- Admin users can access and modify all data
- Coaches can manage their own sessions and notes
- Clients can only access their own sessions and reflections
- Anonymous users have no access

## Environment Variables

### Server (.env)

Required variables:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
JWT_ACCESS_SECRET="your-secret-access-token"
JWT_REFRESH_SECRET="your-secret-refresh-token"
SESSION_SECRET="your-session-secret"
PORT=3000
NODE_ENV=development
CLIENT_URL="http://localhost:5173"

# Email Service Configuration
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@example.com"
SMTP_PASS="your-email-password"
SMTP_FROM="your-email@example.com"

# OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
FACEBOOK_CLIENT_ID="your-facebook-client-id"
FACEBOOK_CLIENT_SECRET="your-facebook-client-secret"

# Encryption Configuration (for sensitive data)
# Generate using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="64-character-hex-string-for-32-byte-key"
# Generate using: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
ENCRYPTION_IV="32-character-hex-string-for-16-byte-iv"
```

Optional variables (for AWS S3):

```
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket-name"
```

### Client (.env)

Required variables:

```
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FACEBOOK_CLIENT_ID=your_facebook_client_id
```

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React contexts
│   │   ├── lib/           # Utility functions
│   │   ├── i18n/          # Internationalization
│   │   └── types/         # TypeScript definitions
│   └── public/
│       └── locales/       # Translation files
├── server/                 # Backend Node.js application
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── prisma/        # Prisma schema and client
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # Business logic
│   │   └── types/         # TypeScript definitions
│   └── uploads/           # Local file storage (if not using S3)
└── shared/                # Shared types and utilities
```

## Available Scripts

### Server

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linter
- `npm run test` - Run tests

### Client

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run linter
- `npm run test` - Run tests

## Security

This project implements comprehensive security scanning and CI processes to ensure code quality and vulnerability management.

### Security Features

- **Automated vulnerability scanning** in CI/CD pipelines
- **Code quality analysis** with CodeQL 
- **Dependency security monitoring** with npm audit
- **License compliance checking**
- **Optional advanced scanning** with Snyk

### Recent Security Improvements

✅ **December 2024 - Comprehensive Security Vulnerability Remediation**
- Successfully eliminated 17 security vulnerabilities (10 high, 5 moderate, 2 low severity)
- Replaced vulnerable `@size-limit/preset-app` package with modern `webpack-bundle-analyzer`
- Achieved 100% vulnerability elimination with zero breaking changes
- Enhanced bundle analysis capabilities with interactive HTML reports
- Established comprehensive security documentation and dependency management guidelines
- All functionality preserved while upgrading to actively maintained dependencies

### Documentation

For comprehensive development and operational documentation:

#### **🚀 Development**
- **[Development Workflow Guide](docs/development-workflow.md)** - Complete development process, testing, and contribution guidelines
- **[CI/CD Guide](docs/ci-cd-guide.md)** - Comprehensive CI/CD pipeline documentation and architecture

#### **🔒 Security**  
- **[CI Security Documentation](docs/ci-security.md)** - Detailed security scanning processes and implementation

#### **⚡ Performance**
- **[Performance Budgets](docs/performance-budgets.md)** - Performance monitoring and optimization guidelines

### Quick Security Commands

```bash
# Run security audit
npm audit --audit-level=moderate --production

# Check for outdated packages
npm outdated

# Check licenses
npx license-checker --production --summary
```

### Security Workflows

Our CI pipeline includes:
- **Security Audit**: npm audit on all workspaces
- **CodeQL Analysis**: Static analysis for JavaScript/TypeScript
- **Dependency Review**: Automated dependency vulnerability checks (PR only)
- **License Compliance**: Blocks GPL-3.0 and AGPL-3.0 licenses

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Security Considerations for Contributors

- [ ] No hardcoded secrets or credentials
- [ ] Dependencies reviewed for known vulnerabilities  
- [ ] New dependencies have compatible licenses
- [ ] Security tests pass
- [ ] Code scanning shows no new issues

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact [your-contact-info]

## Coach Dashboard Slice

The Coach Dashboard provides an efficient workspace for coaches to manage their clients and sessions.

### Key Features

- **Client Management**: 
  - View a list of all clients with their basic information
  - See when each client had their last session
  - Send invitations to new clients via email
  - Responsive design with empty state illustrations

- **Session Management**:
  - Create new coaching sessions with notes
  - View sessions grouped by date (Today, Yesterday, This Week, etc.)
  - Automatic client association with each session
  - Optimistic UI updates for immediate feedback

### Technical Implementation

- **API Endpoints**:
  - `GET /api/my-clients` - List clients with pagination and last session date
  - `GET /api/sessions` - Get sessions with optional client filtering
  - `POST /api/sessions` - Create a new session

- **React Components**:
  - ClientsTable - Displays clients with RTL support
  - InviteClientModal - Modal for sending client invitations
  - SessionList - Groups and displays sessions by date
  - SessionModal - Form for creating new sessions

- **Data Management**:
  - TanStack Query hooks for data fetching and caching
  - Optimistic updates for immediate UI feedback
  - Real-time polling (every 30 seconds)

- **Internationalization**:
  - Full RTL Hebrew support
  - Bilingual interfaces with i18next
  - Localized date formatting with date-fns

### Testing

- Vitest component tests for critical UI components
- Playwright E2E tests for the complete coach workflow
- Mobile viewport testing (375×812) for responsive design

## Deployment

This project is configured for deployment on Netlify (frontend) with Railway (backend).

### Netlify Setup (Frontend)

1. **Create a Netlify Account**: Sign up at [netlify.com](https://netlify.com).

2. **Connect Repository**: 
   - Connect your GitHub account to Netlify
   - Import the repository for this project

3. **Build Settings** (auto-detected from `netlify.toml`):
   - **Build command**: `npm run install:all && npm run build --workspace client`
   - **Publish directory**: `client/dist`
   - **Node.js version**: 20

4. **Environment Variables**: 
   Add these to your Netlify site settings:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_RAILWAY_API_URL=https://your-backend.railway.app
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key
   VITE_SENTRY_DSN=https://your-sentry-dsn
   VITE_GA_MEASUREMENT_ID=G-YOUR-GA-ID
   NODE_ENV=production
   ```

5. **Domain Configuration**:
   - Configure your custom domain in Netlify dashboard
   - Update the API proxy URL in `netlify.toml` to point to your Railway backend

### Railway Setup (Backend)

Deploy your backend server to Railway for API endpoints and database operations.

1. **Connect Repository**: Import your repository to Railway
2. **Configure Build**: Point to the `server` directory
3. **Set Environment Variables**: Add all backend environment variables
4. **Deploy**: Railway will automatically deploy your Express server

### Local Development with Netlify CLI (Optional)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link your project
netlify link

# Run local development with Netlify functions
netlify dev
```

### Important Notes for Netlify Deployment

- **Frontend Only**: Netlify hosts the React frontend; backend runs on Railway
- **API Proxy**: The `netlify.toml` includes proxy rules to forward `/api/*` to Railway
- **Monorepo Structure**: Build commands handle workspace dependencies correctly
- **Environment Variables**: All `VITE_*` variables must be set in Netlify dashboard
- **Redirects**: SPA routing and legacy URL redirects are configured
- **Security Headers**: CSP and security headers are automatically applied
