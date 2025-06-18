interface RequiredEnvVars {
  [key: string]: {
    required: boolean;
    description: string;
    example?: string;
  };
}

const REQUIRED_ENV_VARS: RequiredEnvVars = {
  // Database
  DATABASE_URL: {
    required: true,
    description: 'PostgreSQL database connection string',
    example: 'postgresql://user:password@localhost:5432/dbname'
  },
  
  // Supabase
  SUPABASE_URL: {
    required: true,
    description: 'Supabase project URL',
    example: 'https://your-project.supabase.co'
  },
  SUPABASE_ANON_KEY: {
    required: true,
    description: 'Supabase anonymous key'
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    required: true,
    description: 'Supabase service role key (for server-side operations)'
  },
  
  // Authentication
  JWT_SECRET: {
    required: true,
    description: 'JWT signing secret (min 32 characters)',
    example: 'your-super-secret-jwt-key-min-32-chars'
  },
  
  // OAuth
  GOOGLE_CLIENT_ID: {
    required: true,
    description: 'Google OAuth client ID'
  },
  GOOGLE_CLIENT_SECRET: {
    required: true,
    description: 'Google OAuth client secret'
  },
  
  // Server
  PORT: {
    required: false,
    description: 'Server port (defaults to 5000)',
    example: '5000'
  },
  NODE_ENV: {
    required: false,
    description: 'Node environment (development/production)',
    example: 'production'
  },
  
  // Session
  SESSION_SECRET: {
    required: true,
    description: 'Session signing secret'
  },
  
  // CORS
  CLIENT_URL: {
    required: true,
    description: 'Frontend application URL',
    example: 'https://your-app.com'
  },
  
  // Email (if enabled)
  SMTP_HOST: {
    required: false,
    description: 'SMTP server host for email sending'
  },
  SMTP_PORT: {
    required: false,
    description: 'SMTP server port'
  },
  SMTP_USER: {
    required: false,
    description: 'SMTP username'
  },
  SMTP_PASS: {
    required: false,
    description: 'SMTP password'
  },
  
  // File Storage
  SUPABASE_STORAGE_BUCKET: {
    required: false,
    description: 'Supabase storage bucket name'
  },
  
  // Sentry (if enabled)
  SENTRY_DSN: {
    required: false,
    description: 'Sentry DSN for error tracking'
  }
};

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  errors: string[];
}

export function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    missing: [],
    warnings: [],
    errors: []
  };
  
  // Check required environment variables
  Object.entries(REQUIRED_ENV_VARS).forEach(([key, config]) => {
    const value = process.env[key];
    
    if (config.required && !value) {
      result.missing.push(key);
      result.valid = false;
    }
    
    // Specific validations
    if (value) {
      switch (key) {
        case 'JWT_SECRET':
          if (value.length < 32) {
            result.errors.push(`${key} must be at least 32 characters long for security`);
            result.valid = false;
          }
          break;
          
        case 'DATABASE_URL':
          if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
            result.warnings.push(`${key} should be a PostgreSQL connection string`);
          }
          break;
          
        case 'SUPABASE_URL':
          if (!value.startsWith('https://') || !value.includes('supabase.co')) {
            result.warnings.push(`${key} should be a valid Supabase URL`);
          }
          break;
          
        case 'CLIENT_URL':
          if (!value.startsWith('http://') && !value.startsWith('https://')) {
            result.warnings.push(`${key} should include http:// or https://`);
          }
          break;
          
        case 'NODE_ENV':
          if (!['development', 'production', 'test'].includes(value)) {
            result.warnings.push(`${key} should be 'development', 'production', or 'test'`);
          }
          break;
      }
    }
  });
  
  return result;
}

export function logValidationResults(result: ValidationResult): void {
  if (result.valid) {
    console.log('✅ Environment validation passed');
    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
  } else {
    console.error('❌ Environment validation failed');
    
    if (result.missing.length > 0) {
      console.error('Missing required environment variables:');
      result.missing.forEach(key => {
        const config = REQUIRED_ENV_VARS[key];
        console.error(`   - ${key}: ${config.description}`);
        if (config.example) {
          console.error(`     Example: ${config.example}`);
        }
      });
    }
    
    if (result.errors.length > 0) {
      console.error('Environment validation errors:');
      result.errors.forEach(error => console.error(`   - ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.error('Warnings:');
      result.warnings.forEach(warning => console.error(`   - ${warning}`));
    }
  }
}

export function validateEnvironmentOrExit(): void {
  const result = validateEnvironment();
  logValidationResults(result);
  
  if (!result.valid) {
    console.error('\n💡 Create a .env file in the server directory with the required variables');
    console.error('   Check the .env.example file for a template');
    process.exit(1);
  }
} 