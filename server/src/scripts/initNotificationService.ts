#!/usr/bin/env node

import dotenv from 'dotenv';
import { serviceInitializer } from '../services/serviceInitializer';
import { supabaseNotificationService } from '../services/supabaseNotificationService';

// Load environment variables
dotenv.config();

/**
 * Initialize the notification service
 */
async function initializeNotificationService() {
  console.log('🚀 Initializing Lumea Notification Service...');

  try {
    // Initialize all services
    await serviceInitializer.initialize();
    
    console.log('✅ Notification service is now running!');
    console.log('📧 Session reminders will be processed every 15 minutes');
    console.log('⏰ Cron job is active and monitoring for scheduled notifications');
    
    // Keep the process running
    console.log('\n🔄 Service is running. Press Ctrl+C to stop.');
    
    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      console.log('\n🛑 SIGTERM received, shutting down gracefully...');
      await serviceInitializer.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n🛑 SIGINT received, shutting down gracefully...');
      await serviceInitializer.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to initialize notification service:', error);
    process.exit(1);
  }
}

/**
 * Test the notification service with a sample session reminder
 */
async function testNotificationService() {
  console.log('🧪 Testing notification service...');

  try {
    // Initialize the service first
    await serviceInitializer.initialize();

    // Create a test session reminder (24 hours from now)
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const testResult = await supabaseNotificationService.scheduleSessionReminders({
      session_id: 'test-session-id',
      client_id: 'test-client-id', 
      coach_id: 'test-coach-id',
      session_date: futureDate.toISOString(),
    });

    if (testResult) {
      console.log('✅ Test notification scheduled successfully!');
      console.log(`📅 Session date: ${futureDate.toLocaleString()}`);
      console.log(`⏰ Reminder will be sent at: ${new Date(futureDate.getTime() - 24 * 60 * 60 * 1000).toLocaleString()}`);
    } else {
      console.log('❌ Failed to schedule test notification');
    }

    await serviceInitializer.shutdown();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--test')) {
  testNotificationService();
} else {
  initializeNotificationService();
} 