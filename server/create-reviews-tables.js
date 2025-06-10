import { db } from './db.ts';

async function createReviewsTables() {
  try {
    // Create professional_reviews table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS professional_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        professional_id INT NOT NULL,
        appointment_id INT NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_phone VARCHAR(20),
        rating INT NOT NULL,
        comment TEXT,
        review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_visible BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        INDEX idx_professional_id (professional_id),
        INDEX idx_appointment_id (appointment_id),
        INDEX idx_rating (rating),
        INDEX idx_review_date (review_date)
      )
    `);
    console.log('✅ Professional reviews table created successfully');

    // Create review_invitations table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS review_invitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NOT NULL,
        professional_id INT NOT NULL,
        client_phone VARCHAR(20) NOT NULL,
        invitation_token VARCHAR(255) NOT NULL UNIQUE,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        review_submitted_at TIMESTAMP NULL,
        status VARCHAR(20) DEFAULT 'sent',
        whatsapp_instance_id INT,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
        FOREIGN KEY (whatsapp_instance_id) REFERENCES whatsapp_instances(id),
        INDEX idx_appointment_id (appointment_id),
        INDEX idx_professional_id (professional_id),
        INDEX idx_token (invitation_token),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ Review invitations table created successfully');

  } catch (error) {
    console.error('❌ Error creating reviews tables:', error.message);
  }
}

createReviewsTables();