import mongoose from 'mongoose';
import { CoachNote } from '../src/models/CoachNote.js';
import { EncryptionService } from '../src/services/encryptionService.js';
import crypto from 'crypto';

// Old encryption constants (for migration only)
const OLD_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const OLD_ENCRYPTION_IV = process.env.ENCRYPTION_IV || crypto.randomBytes(16).toString('hex');

async function decryptWithOldMethod(encryptedText: string): Promise<string> {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(OLD_ENCRYPTION_KEY, 'hex'),
      Buffer.from(OLD_ENCRYPTION_IV, 'hex')
    );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt with old method: ${error}`);
  }
}

async function migrateEncryptedNotes() {
  console.log('Starting encryption migration...');
  
  try {
    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/satya-coaching');
      console.log('Connected to database');
    }
    
    // Find all encrypted notes that don't have an encryptionIV field
    const notesToMigrate = await CoachNote.find({ 
      isEncrypted: true, 
      encryptionIV: { $exists: false } 
    });
    
    console.log(`Found ${notesToMigrate.length} notes to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const note of notesToMigrate) {
      try {
        console.log(`Migrating note ${note._id}...`);
        
        // Decrypt with old method
        const decryptedText = await decryptWithOldMethod(note.textContent);
        
        // Re-encrypt with new method
        const { encrypted, iv } = EncryptionService.encrypt(decryptedText);
        
        // Update the note
        note.textContent = encrypted;
        note.encryptionIV = iv;
        note.encryptionVersion = '2.0'; // Mark as migrated
        
        // Save without triggering pre-save encryption (since we already encrypted)
        await CoachNote.updateOne(
          { _id: note._id },
          { 
            textContent: encrypted,
            encryptionIV: iv,
            encryptionVersion: '2.0'
          }
        );
        
        successCount++;
        console.log(`✅ Successfully migrated note ${note._id}`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to migrate note ${note._id}:`, error);
        
        // Log the error but continue with other notes
        console.error(`Note ID: ${note._id}, Error: ${error}`);
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total notes processed: ${notesToMigrate.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed migrations: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some notes failed to migrate. Please review the errors above.');
      console.log('Failed notes will continue to use the old encryption method until manually fixed.');
    } else {
      console.log('\n🎉 All notes successfully migrated to secure encryption!');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Validation function to check migration success
async function validateMigration() {
  console.log('\nValidating migration...');
  
  const unmigratedNotes = await CoachNote.find({ 
    isEncrypted: true, 
    encryptionIV: { $exists: false } 
  });
  
  const migratedNotes = await CoachNote.find({ 
    isEncrypted: true, 
    encryptionIV: { $exists: true },
    encryptionVersion: '2.0'
  });
  
  console.log(`Unmigrated notes: ${unmigratedNotes.length}`);
  console.log(`Migrated notes: ${migratedNotes.length}`);
  
  // Test decryption of a few migrated notes
  const testNotes = migratedNotes.slice(0, 3);
  for (const note of testNotes) {
    try {
      const decrypted = note.decryptText();
      console.log(`✅ Note ${note._id} decryption test passed`);
    } catch (error) {
      console.error(`❌ Note ${note._id} decryption test failed:`, error);
    }
  }
}

// Main execution
async function main() {
  try {
    await migrateEncryptedNotes();
    await validateMigration();
    
    console.log('\n🔒 Encryption migration completed successfully!');
    console.log('Your coach notes are now using secure random IV encryption.');
    
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { migrateEncryptedNotes, validateMigration }; 