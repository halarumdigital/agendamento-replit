import { pool } from "./db";

export async function ensureReviewTables() {
  try {
    // Create professional_reviews table with PostgreSQL syntax
    await pool.query(`
      CREATE TABLE IF NOT EXISTS professional_reviews (
        id SERIAL PRIMARY KEY,
        professional_id INTEGER NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_phone VARCHAR(20) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        service_name VARCHAR(255),
        appointment_date DATE,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_public BOOLEAN DEFAULT true,
        company_id INTEGER NOT NULL,
        appointment_id INTEGER
      )
    `);

    // Create indexes for professional_reviews
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prof_reviews_professional_id ON professional_reviews (professional_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prof_reviews_company_id ON professional_reviews (company_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prof_reviews_appointment_id ON professional_reviews (appointment_id)`);

    console.log('✅ professional_reviews table created/verified');

    // Create review_invitations table with PostgreSQL syntax
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_invitations (
        id SERIAL PRIMARY KEY,
        appointment_id INTEGER NOT NULL,
        professional_id INTEGER NOT NULL,
        client_phone VARCHAR(20) NOT NULL,
        invitation_token VARCHAR(255) NOT NULL UNIQUE,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        review_submitted_at TIMESTAMP NULL,
        status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'completed')),
        whatsapp_instance_id INTEGER,
        company_id INTEGER NOT NULL
      )
    `);

    // Create indexes for review_invitations
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_review_invitations_appointment_id ON review_invitations (appointment_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_review_invitations_professional_id ON review_invitations (professional_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_review_invitations_token ON review_invitations (invitation_token)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_review_invitations_company_id ON review_invitations (company_id)`);

    console.log('✅ review_invitations table created/verified');
    console.log('✅ Review tables setup completed');

  } catch (error) {
    console.error('❌ Error creating review tables:', error);
    throw error;
  }
}