import { db } from "./db";
import { sql } from "drizzle-orm";

export async function ensureStripeColumns() {
  try {
    console.log('✅ Stripe columns ensured in companies table');
    
    // Add stripe_customer_id column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)
    `);
    
    // Add stripe_subscription_id column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)
    `);
    
  } catch (error) {
    console.error('Error ensuring Stripe columns:', error);
  }
}