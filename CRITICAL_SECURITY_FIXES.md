# CRITICAL Security Fixes - Immediate Action Required

## 🚨 STOP: These vulnerabilities pose immediate risk to your application and user data. Fix these NOW.

---

## 1. **CRITICAL: Fix Static IV Encryption (IMMEDIATE)**

**Current Vulnerability:** `server/src/models/CoachNote.ts` uses static IV for AES encryption
```typescript
// VULNERABLE CODE - DO NOT USE
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || crypto.randomBytes(16).toString('hex');
```

**Fix Implementation:**

### Step 1: Create new encryption service
Create `server/src/services/encryptionService.ts`:

```typescript
import crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly IV_LENGTH = 16;
  
  private static getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    return Buffer.from(key, 'hex');
  }
  
  static encrypt(text: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(this.IV_LENGTH); // Generate random IV each time
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.getEncryptionKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }
  
  static decrypt(encryptedData: string, ivHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.getEncryptionKey(), iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### Step 2: Update CoachNote model
Update `server/src/models/CoachNote.ts`:

```typescript
import { EncryptionService } from '../services/encryptionService.js';

// Remove these vulnerable lines:
// const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
// const ENCRYPTION_IV = process.env.ENCRYPTION_IV || crypto.randomBytes(16).toString('hex');

// Add IV field to schema
const coachNoteSchema = new Schema<ICoachNote>({
  // ... existing fields
  textContent: {
    type: String,
    required: true,
  },
  encryptionIV: {  // NEW FIELD
    type: String,
    required: function() { return this.isEncrypted; }
  },
  // ... rest of schema
});

// Update encryption methods
coachNoteSchema.methods.encryptText = function (text: string): string {
  if (!this.isEncrypted) return text;
  
  const { encrypted, iv } = EncryptionService.encrypt(text);
  this.encryptionIV = iv;  // Store IV with the document
  return encrypted;
};

coachNoteSchema.methods.decryptText = function (): string {
  if (!this.isEncrypted) return this.textContent;
  
  if (!this.encryptionIV) {
    throw new Error('Missing encryption IV for encrypted note');
  }
  
  return EncryptionService.decrypt(this.textContent, this.encryptionIV);
};
```

### Step 3: Data migration script
Create `server/scripts/migrateEncryption.ts`:

```typescript
import { CoachNote } from '../src/models/CoachNote.js';
import { EncryptionService } from '../src/services/encryptionService.js';

async function migrateEncryptedNotes() {
  const notes = await CoachNote.find({ isEncrypted: true, encryptionIV: { $exists: false } });
  
  for (const note of notes) {
    try {
      // Decrypt with old method (if possible)
      const decrypted = note.decryptText();
      
      // Re-encrypt with new method
      const { encrypted, iv } = EncryptionService.encrypt(decrypted);
      
      note.textContent = encrypted;
      note.encryptionIV = iv;
      await note.save();
      
      console.log(`Migrated note ${note._id}`);
    } catch (error) {
      console.error(`Failed to migrate note ${note._id}:`, error);
    }
  }
}
```

---

## 2. **CRITICAL: Remove Hardcoded Secrets (IMMEDIATE)**

### Fix JWT Secrets
Update `server/src/auth/config.ts`:

```typescript
// REMOVE DEFAULT SECRETS
export const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET,  // Remove default
  refreshSecret: process.env.JWT_REFRESH_SECRET,  // Remove default
  accessExpiresIn: '15m',
  refreshExpiresIn: '30d',
};

// Add validation
if (!jwtConfig.accessSecret || !jwtConfig.refreshSecret) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set');
}
```

### Fix Test Credentials
Update `supabase/tests/rls.spec.ts`:

```typescript
// REMOVE DEFAULT PASSWORDS
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const COACH_PASSWORD = process.env.COACH_PASSWORD;
const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD;

if (!ADMIN_PASSWORD || !COACH_PASSWORD || !CLIENT_PASSWORD) {
  throw new Error('Test passwords must be set in environment variables');
}
```

---

## 3. **CRITICAL: Fix CORS Configuration (IMMEDIATE)**

Update `server/src/index.ts`:

```typescript
app.use(
  cors({
    origin: (origin, callback) => {
      // REMOVE THIS VULNERABLE LINE:
      // if (!origin) return callback(null, true);
      
      // Only allow specific origins
      const allowedOrigins = [
        process.env.CLIENT_URL,
        'http://localhost:5173',  // Development only
        'http://localhost:8080',  // Development only
      ].filter(Boolean);
      
      if (process.env.NODE_ENV === 'production') {
        // In production, only allow CLIENT_URL
        if (origin === process.env.CLIENT_URL) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      }
      
      // In development, check allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
```

---

## 4. **CRITICAL: Strengthen Password Requirements (IMMEDIATE)**

Update `server/src/routes/auth.ts`:

```typescript
const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character'),
  role: z.enum(['client', 'coach', 'admin']),
});
```

---

## 5. **CRITICAL: Environment Variable Validation (IMMEDIATE)**

Update `server/src/index.ts`:

```typescript
const validateEnvVariables = () => {
  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'CLIENT_URL',
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  // Validate JWT secrets are not defaults
  if (process.env.JWT_ACCESS_SECRET === 'your_default_access_secret' ||
      process.env.JWT_REFRESH_SECRET === 'your_default_refresh_secret') {
    console.error('FATAL ERROR: Default JWT secrets detected. Change them immediately.');
    process.exit(1);
  }
};
```

---

## 6. **Environment Variables Setup**

Create/update your `.env` file:

```bash
# Generate these with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_ACCESS_SECRET=your_secure_random_secret_here
JWT_REFRESH_SECRET=your_other_secure_random_secret_here
SESSION_SECRET=your_session_secret_here
ENCRYPTION_KEY=your_32_byte_hex_encryption_key_here

# Database
DATABASE_URL=your_database_url

# App config
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
PORT=3000
```

---

## 7. **Immediate Deployment Steps**

1. **Stop your production server immediately**
2. **Apply these fixes in order**
3. **Generate new secure secrets**
4. **Update environment variables**
5. **Run encryption migration script**
6. **Test thoroughly in staging**
7. **Deploy to production**
8. **Monitor for issues**

---

## 🔒 Security Checklist

- [ ] Static IV encryption fixed
- [ ] Hardcoded secrets removed
- [ ] CORS properly configured
- [ ] Strong password requirements implemented
- [ ] Environment variables validated
- [ ] New secrets generated and deployed
- [ ] Encryption migration completed
- [ ] Production deployment tested

---

**⚠️ WARNING: Do not delay these fixes. Each day these vulnerabilities remain unfixed increases the risk of a security breach.**

**Need help?** Contact your security team or a security consultant immediately if you cannot implement these fixes within 24-48 hours. 