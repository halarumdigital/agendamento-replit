import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";

let schedulerInterval: NodeJS.Timeout | null = null;

export function startCampaignScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log("🚀 Starting campaign scheduler...");
  
  // Check every minute for campaigns to send
  schedulerInterval = setInterval(async () => {
    try {
      await processPendingCampaigns();
    } catch (error) {
      console.error("Error processing pending campaigns:", error);
    }
  }, 60000); // Check every 60 seconds

  // Also run immediately on startup
  setTimeout(() => {
    processPendingCampaigns().catch(console.error);
  }, 5000); // Wait 5 seconds after startup
}

export function stopCampaignScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("🛑 Campaign scheduler stopped");
  }
}

async function processPendingCampaigns() {
  try {
    // Get all pending campaigns that should be sent now
    const now = new Date();
    const campaigns = await db.execute(sql`
      SELECT * FROM message_campaigns 
      WHERE status = 'pending' 
      AND scheduled_date <= ${now}
      ORDER BY scheduled_date ASC
    `);

    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      return;
    }

    console.log(`📋 Found ${campaigns.length} campaigns ready to send`);

    for (const campaign of campaigns) {
      try {
        await processCampaign(campaign);
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        
        // Mark campaign as failed
        await db.execute(sql`
          UPDATE message_campaigns 
          SET status = 'failed' 
          WHERE id = ${campaign.id}
        `);
      }
    }
  } catch (error) {
    console.error("Error fetching pending campaigns:", error);
  }
}

async function processCampaign(campaign: any) {
  console.log(`📤 Processing campaign: ${campaign.name} (ID: ${campaign.id})`);

  // Mark campaign as sending
  await db.execute(sql`
    UPDATE message_campaigns 
    SET status = 'sending' 
    WHERE id = ${campaign.id}
  `);

  let clients = [];
  let totalTargets = 0;
  let sentCount = 0;

  try {
    // Get target clients
    if (campaign.target_type === 'all') {
      const result = await db.execute(sql`
        SELECT * FROM clients 
        WHERE company_id = ${campaign.company_id} 
        AND phone IS NOT NULL AND phone != ''
      `);
      clients = Array.isArray(result) ? result : [result].filter(Boolean);
    } else if (campaign.target_type === 'specific' && campaign.selected_clients) {
      const selectedIds = JSON.parse(campaign.selected_clients);
      if (selectedIds && selectedIds.length > 0) {
        const placeholders = selectedIds.map(() => '?').join(',');
        const result = await db.execute(sql`
          SELECT * FROM clients 
          WHERE company_id = ${campaign.company_id} 
          AND id IN (${selectedIds.join(',')})
          AND phone IS NOT NULL AND phone != ''
        `);
        clients = Array.isArray(result) ? result : [result].filter(Boolean);
      }
    }

    totalTargets = clients.length;

    if (totalTargets === 0) {
      console.log(`⚠️ No valid clients found for campaign ${campaign.id}`);
      await db.execute(sql`
        UPDATE message_campaigns 
        SET status = 'completed', total_targets = 0, sent_count = 0
        WHERE id = ${campaign.id}
      `);
      return;
    }

    console.log(`📱 Sending to ${totalTargets} clients for campaign: ${campaign.name}`);

    // Get WhatsApp instance for the company
    const whatsappInstances = await db.execute(sql`
      SELECT * FROM whatsapp_instances 
      WHERE company_id = ${campaign.company_id} 
      AND status = 'connected'
      ORDER BY id ASC 
      LIMIT 1
    `);

    const whatsappInstance = Array.isArray(whatsappInstances) ? whatsappInstances[0] : whatsappInstances;

    if (!whatsappInstance) {
      console.error(`❌ No connected WhatsApp instance found for company ${campaign.company_id}`);
      await db.execute(sql`
        UPDATE message_campaigns 
        SET status = 'failed' 
        WHERE id = ${campaign.id}
      `);
      return;
    }

    // Get global Evolution API settings
    const settings = await storage.getGlobalSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiGlobalKey) {
      console.error("❌ Evolution API not configured");
      await db.execute(sql`
        UPDATE message_campaigns 
        SET status = 'failed' 
        WHERE id = ${campaign.id}
      `);
      return;
    }

    // Send messages to each client
    for (const client of clients) {
      try {
        // Format phone number (remove non-digits and ensure it starts with 55)
        let formattedPhone = client.phone.replace(/\D/g, '');
        if (!formattedPhone.startsWith('55') && formattedPhone.length >= 10) {
          formattedPhone = '55' + formattedPhone;
        }

        // Send WhatsApp message
        const response = await fetch(`${settings.evolutionApiUrl}/message/sendText/${whatsappInstance.instance_name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': settings.evolutionApiGlobalKey
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: campaign.message
          })
        });

        if (response.ok) {
          sentCount++;
          console.log(`✅ Message sent to ${client.name} (${formattedPhone})`);
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to send message to ${client.name}: ${errorText}`);
        }

        // Add small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error sending message to ${client.name}:`, error);
      }
    }

    // Update campaign status
    const finalStatus = sentCount > 0 ? 'completed' : 'failed';
    await db.execute(sql`
      UPDATE message_campaigns 
      SET status = ${finalStatus}, 
          total_targets = ${totalTargets}, 
          sent_count = ${sentCount}
      WHERE id = ${campaign.id}
    `);

    console.log(`✅ Campaign ${campaign.name} completed: ${sentCount}/${totalTargets} messages sent`);

  } catch (error) {
    console.error(`❌ Error processing campaign ${campaign.id}:`, error);
    
    // Update with partial results if any messages were sent
    await db.execute(sql`
      UPDATE message_campaigns 
      SET status = 'failed', 
          total_targets = ${totalTargets}, 
          sent_count = ${sentCount}
      WHERE id = ${campaign.id}
    `);
  }
}