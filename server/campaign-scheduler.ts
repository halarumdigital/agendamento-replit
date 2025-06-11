import { storage } from "./storage";
import { db, pool } from "./db";
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
    const [campaigns] = await pool.execute(
      'SELECT * FROM message_campaigns WHERE status = ? AND scheduled_date <= ? ORDER BY scheduled_date ASC',
      ['pending', now]
    );

    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      return;
    }

    console.log(`📋 Found ${campaigns.length} campaigns ready to send`);

    for (const campaign of campaigns as any[]) {
      try {
        // Log campaign data for debugging
        console.log(`🔍 Campaign data:`, {
          id: campaign.id,
          name: campaign.name,
          company_id: campaign.company_id,
          target_type: campaign.target_type
        });
        
        if (!campaign.id || !campaign.company_id) {
          console.error(`❌ Invalid campaign data:`, campaign);
          continue;
        }
        
        await processCampaign(campaign);
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        
        // Mark campaign as failed
        if (campaign.id) {
          await pool.execute(
            'UPDATE message_campaigns SET status = ? WHERE id = ?',
            ['failed', campaign.id]
          );
        }
      }
    }
  } catch (error) {
    console.error("Error fetching pending campaigns:", error);
  }
}

async function processCampaign(campaign: any) {
  console.log(`📤 Processing campaign: ${campaign.name} (ID: ${campaign.id})`);

  // Mark campaign as sending
  await pool.execute(
    'UPDATE message_campaigns SET status = ? WHERE id = ?',
    ['sending', campaign.id]
  );

  let clients: any[] = [];
  let totalTargets = 0;
  let sentCount = 0;

  try {
    // Get target clients
    if (campaign.target_type === 'all') {
      const [clientResults] = await pool.execute(
        'SELECT * FROM clients WHERE company_id = ? AND phone IS NOT NULL AND phone != ""',
        [campaign.company_id]
      );
      clients = Array.isArray(clientResults) ? clientResults : [];
    } else if (campaign.target_type === 'specific' && campaign.selected_clients) {
      const selectedIds = JSON.parse(campaign.selected_clients);
      if (selectedIds && selectedIds.length > 0) {
        const placeholders = selectedIds.map(() => '?').join(',');
        const [clientResults] = await pool.execute(
          `SELECT * FROM clients WHERE company_id = ? AND id IN (${placeholders}) AND phone IS NOT NULL AND phone != ""`,
          [campaign.company_id, ...selectedIds]
        );
        clients = Array.isArray(clientResults) ? clientResults : [];
      }
    }

    totalTargets = clients.length;

    if (totalTargets === 0) {
      console.log(`⚠️ No valid clients found for campaign ${campaign.id}`);
      await pool.execute(
        'UPDATE message_campaigns SET status = ?, total_targets = ?, sent_count = ? WHERE id = ?',
        ['completed', 0, 0, campaign.id]
      );
      return;
    }

    console.log(`📱 Sending to ${totalTargets} clients for campaign: ${campaign.name}`);

    // Get WhatsApp instance for the company
    const [instanceResults] = await pool.execute(
      'SELECT * FROM whatsapp_instances WHERE company_id = ? AND status = ? ORDER BY id ASC LIMIT 1',
      [campaign.company_id, 'connected']
    );

    const whatsappInstances = Array.isArray(instanceResults) ? instanceResults : [];
    const whatsappInstance = whatsappInstances[0];

    if (!whatsappInstance) {
      console.error(`❌ No connected WhatsApp instance found for company ${campaign.company_id}`);
      await pool.execute(
        'UPDATE message_campaigns SET status = ? WHERE id = ?',
        ['failed', campaign.id]
      );
      return;
    }

    // Get global Evolution API settings
    const settings = await storage.getGlobalSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiGlobalKey) {
      console.error("❌ Evolution API not configured");
      await pool.execute(
        'UPDATE message_campaigns SET status = ? WHERE id = ?',
        ['failed', campaign.id]
      );
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
    await pool.execute(
      'UPDATE message_campaigns SET status = ?, total_targets = ?, sent_count = ? WHERE id = ?',
      [finalStatus, totalTargets, sentCount, campaign.id]
    );

    console.log(`✅ Campaign ${campaign.name} completed: ${sentCount}/${totalTargets} messages sent`);

  } catch (error) {
    console.error(`❌ Error processing campaign ${campaign.id}:`, error);
    
    // Update with partial results if any messages were sent
    await pool.execute(
      'UPDATE message_campaigns SET status = ?, total_targets = ?, sent_count = ? WHERE id = ?',
      ['failed', totalTargets, sentCount, campaign.id]
    );
  }
}