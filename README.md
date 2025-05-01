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
