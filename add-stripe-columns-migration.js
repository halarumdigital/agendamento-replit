import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function addStripeColumns() {
  try {
    console.log('🔄 Adding Stripe columns to companies table...');
    
    // Add stripe_customer_id column
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)
    `);
    
    // Add stripe_subscription_id column
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)
    `);
    
    console.log('✅ Stripe columns added successfully');
  } catch (error) {
    console.error('❌ Error adding Stripe columns:', error);
  }
}

addStripeColumns();