# Lumea Coaching App

A modern, bilingual (Hebrew-first) coaching platform built for 1-on-1 Satya Method coaching sessions. The platform enables coaches to manage sessions, track client progress through reflections, maintain coaching notes, share resources, and includes a comprehensive admin panel for platform management.

## Features

- **Bilingual Support**: Hebrew-first interface with English support
- **Session Management**: Schedule, track, and manage coaching sessions
- **Client Reflections**: Track client progress and insights
- **Coaching Notes**: Private notes for coaches about their clients
- **Resource Library**: Share and manage coaching resources
- **Admin Dashboard**: Comprehensive platform management tools
- **Payment Tracking**: Monitor session payments and send reminders
- **File Storage**: Secure storage for session recordings and resources
- **Mobile Responsive**: Fully responsive design for all devices
- **Coach Dashboard**: Manage clients, sessions, and invitations

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
- Mongoose for MongoDB ODM
- MongoDB for database
- JWT & Passport for authentication
- AWS S3 for file storage (optional)

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB instance
- (Optional) AWS S3 account for file storage

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
DATABASE_URL="mongodb://localhost:27017/lumea"
JWT_SECRET="your-secret-key"
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
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # Business logic (including storage.ts)
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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

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

This project is configured for deployment on Vercel.

### Vercel Setup

1.  **Create a Vercel Account**: If you don't have one, sign up at [vercel.com](https://vercel.com).
2.  **Import Project**: 
    *   Connect your GitHub account to Vercel.
    *   Import the repository for this project.
3.  **Configure Project Settings**:
    *   **Build & Development Settings**:
        *   Framework Preset: `Vite` (Vercel might detect this automatically).
        *   Build Command: `npm run build` (or `pnpm build` if you are using pnpm, ensure `vercel.json` matches).
        *   Output Directory: `client/dist` (ensure this matches your `vite.config.ts` and `vercel.json`).
        *   Install Command: `npm install && npm run install:all --if-present` (or equivalent for your package manager to install root and workspace dependencies).
    *   **Root Directory**: Leave as default (repository root) if `vercel.json` is in the root. 
    *   **Serverless Functions**: Ensure Vercel is configured to handle your backend API routes correctly. The `vercel.json` provided in this project includes a basic setup for an Express-like server in the `/server/api` directory. You might need to adjust this based on your actual server structure. Typically, you would place your serverless functions (e.g., Express app entry point) in an `api` directory in your project root or `server/api` if your `vercel.json` routes point there.

4.  **Environment Variables**: 
    *   Add all required environment variables listed in `.env.example` files (for both `client` and `server`) to your Vercel project settings.
    *   **Sensitive Variables**: Ensure `JWT_SECRET`, `DATABASE_URL`, `SMTP_PASS`, `ENCRYPTION_KEY`, `ENCRYPTION_IV`, `SUPABASE_SERVICE_KEY`, etc., are set securely in Vercel.
    *   `NODE_ENV` should be set to `production` for Vercel deployments (this is often a default setting on Vercel).
    *   `CLIENT_URL` should be the production URL of your frontend (e.g., `https://your-app-name.vercel.app`).
    *   `VITE_API_URL` (for client) should point to your Vercel backend URL (e.g., `https://your-app-name.vercel.app/api` if your API is served from `/api`).

5.  **Deploy**: Trigger a deployment. Vercel will build and deploy your application.

### Local Vercel CLI (Optional)

For local testing of Vercel deployment:

1.  Install Vercel CLI: `npm install -g vercel`
2.  Login: `vercel login`
3.  Link project: `vercel link` (from the project root)
4.  Run development server: `vercel dev` (This will use your `vercel.json` configuration locally)

### Important Notes for Vercel Deployment

*   **Serverless Backend**: If your `server` directory contains a traditional Node.js/Express server, you'll need to adapt it to run as Vercel Serverless Functions. Typically, this involves having an entry point file (e.g., `server/api/index.ts`) that exports the Express app or individual route handlers.
*   **Monorepo Support**: Vercel supports monorepos. Ensure your build commands and output directories are correctly configured for your project structure. The `install:all` script is important for installing dependencies in workspaces.
*   **Database**: Ensure your MongoDB (or Supabase) instance is accessible from Vercel's servers. For Supabase, use the production Supabase URL and keys.
