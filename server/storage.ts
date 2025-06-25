import bcrypt from 'bcrypt';
import {
  admins,
  companies,
  plans,
  globalSettings,
  whatsappInstances,
  conversations,
  messages,
  services,
  professionals,
  appointments,
  status,
  clients,
  birthdayMessages,
  birthdayMessageHistory,
  reminderSettings,
  reminderHistory,
  professionalReviews,
  reviewInvitations,
  tasks,
  taskReminders,
  clientPoints,
  pointsCampaigns,
  pointsHistory,
  loyaltyCampaigns,
  loyaltyRewardsHistory,
  products,
  messageCampaigns,
  coupons,
  type Admin,
  type InsertAdmin,
  type Company,
  type InsertCompany,
  type Plan,
  type InsertPlan,
  type GlobalSettings,
  type InsertGlobalSettings,
  type WhatsappInstance,
  type InsertWhatsappInstance,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Service,
  type InsertService,
  type Professional,
  type InsertProfessional,
  type Appointment,
  type InsertAppointment,
  type Status,
  type InsertStatus,
  type Client,
  type InsertClient,
  type BirthdayMessage,
  type InsertBirthdayMessage,
  type BirthdayMessageHistory,
  type InsertBirthdayMessageHistory,
  type ReminderSettings,
  type InsertReminderSettings,
  type ReminderHistory,
  type InsertReminderHistory,
  type ProfessionalReview,
  type InsertProfessionalReview,
  type ReviewInvitation,
  type InsertReviewInvitation,
  type Task,
  type InsertTask,
  type ClientPoints,
  type InsertClientPoints,
  type PointsCampaign,
  type InsertPointsCampaign,
  type PointsHistory,
  type InsertPointsHistory,
  type LoyaltyCampaign,
  type InsertLoyaltyCampaign,
  type LoyaltyRewardsHistory,
  type InsertLoyaltyRewardsHistory,
  type Product,
  type InsertProduct,
  type MessageCampaign,
  type InsertMessageCampaign,
  type Coupon,
  type InsertCoupon,
  tourSteps,
  companyTourProgress,

  type TourStep,
  type InsertTourStep,
  type CompanyTourProgress,
  type InsertCompanyTourProgress,
} from "@shared/schema";
import { normalizePhone, validateBrazilianPhone, comparePhones } from "../shared/phone-utils";

// Add missing types for task reminders
export type TaskReminder = typeof taskReminders.$inferSelect;
export type InsertTaskReminder = typeof taskReminders.$inferInsert;
import { db, pool } from "./db";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";

// Helper function to create conversation and message tables
// Ensure professional password column exists
export async function ensureProfessionalPasswordColumn() {
  try {
    console.log('🔧 Checking professional password column...');
    
    const result = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'professionals' 
      AND COLUMN_NAME = 'password'
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const columns = Array.isArray(result) ? result[0] : result;
    
    if (!columns || (Array.isArray(columns) && columns.length === 0)) {
      await pool.execute(`
        ALTER TABLE professionals 
        ADD COLUMN password VARCHAR(255) AFTER email
      `);
      console.log('✅ Password column added to professionals table');
    } else {
      console.log('✅ Password column already exists in professionals table');
    }
  } catch (error) {
    console.error('❌ Error ensuring password column:', error);
  }
}

export async function ensureConversationTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        whatsapp_instance_id INTEGER NOT NULL,
        phone_number VARCHAR(50) NOT NULL,
        contact_name VARCHAR(255),
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_company_phone ON conversations(company_id, phone_number)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_instance_phone ON conversations(whatsapp_instance_id, phone_number)
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        message_id VARCHAR(255),
        message_type VARCHAR(50),
        delivered BOOLEAN DEFAULT false,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_conversation ON messages(conversation_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp)
    `);
    
    try {
      await db.execute(sql`
        ALTER TABLE messages ADD CONSTRAINT fk_messages_conversation 
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      `);
    } catch (error: any) {
      // Ignora se a constraint já existe
      if (error.code !== 'ER_DUP_KEYNAME' && error.code !== 'ER_CANT_CREATE_TABLE') {
        throw error;
      }
    }
    
    console.log("✅ Conversation and message tables created/verified");
  } catch (error) {
    console.error("Error creating conversation tables:", error);
  }
}

export interface IStorage {
  // Admin operations
  getAdmins(): Promise<Admin[]>;
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(id: number, admin: Partial<InsertAdmin>): Promise<Admin>;
  deleteAdmin(id: number): Promise<void>;
  
  // Company operations
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByEmail(email: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: number): Promise<void>;
  
  // Plan operations
  getPlans(): Promise<Plan[]>;
  getPlan(id: number): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: number, plan: Partial<InsertPlan>): Promise<Plan>;
  deletePlan(id: number): Promise<void>;
  
  // Global settings operations
  getGlobalSettings(): Promise<GlobalSettings | undefined>;
  updateGlobalSettings(settings: Partial<InsertGlobalSettings>): Promise<GlobalSettings>;
  
  // WhatsApp instances operations
  getWhatsappInstancesByCompany(companyId: number): Promise<WhatsappInstance[]>;
  getWhatsappInstance(id: number): Promise<WhatsappInstance | undefined>;
  getWhatsappInstanceByName(instanceName: string): Promise<WhatsappInstance | undefined>;
  createWhatsappInstance(instance: InsertWhatsappInstance): Promise<WhatsappInstance>;
  updateWhatsappInstance(id: number, instance: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance>;
  deleteWhatsappInstance(id: number): Promise<void>;
  
  // Conversations operations
  getConversation(companyId: number, whatsappInstanceId: number, phoneNumber: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation>;
  getConversationsByCompany(companyId: number): Promise<Conversation[]>;
  
  // Messages operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number, limit?: number): Promise<Message[]>;
  getRecentMessages(conversationId: number, limit: number): Promise<Message[]>;
  
  // Services operations
  getServicesByCompany(companyId: number): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<void>;
  
  // Professionals operations
  getProfessionalsByCompany(companyId: number): Promise<Professional[]>;
  getProfessional(id: number): Promise<Professional | undefined>;
  getProfessionalByEmail(email: string): Promise<Professional | null>;
  createProfessional(professional: InsertProfessional): Promise<Professional>;
  updateProfessional(id: number, professional: Partial<InsertProfessional>): Promise<Professional>;
  deleteProfessional(id: number): Promise<void>;
  
  // Appointments operations
  getAppointmentsByCompany(companyId: number, month?: string): Promise<Appointment[]>;
  getAppointmentsByClient(clientId: number, companyId: number): Promise<any[]>;
  getAppointmentsByProfessional(professionalId: number, companyId: number): Promise<any[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;
  
  // Status operations
  getStatus(): Promise<Status[]>;
  getStatusById(id: number): Promise<Status | undefined>;
  createStatus(status: InsertStatus): Promise<Status>;
  updateStatus(id: number, status: Partial<InsertStatus>): Promise<Status>;
  deleteStatus(id: number): Promise<void>;
  
  // Clients operations
  getClientsByCompany(companyId: number): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;
  
  // Birthday messages operations
  getBirthdayMessagesByCompany(companyId: number): Promise<BirthdayMessage[]>;
  getBirthdayMessage(id: number): Promise<BirthdayMessage | undefined>;
  createBirthdayMessage(message: InsertBirthdayMessage): Promise<BirthdayMessage>;
  updateBirthdayMessage(id: number, message: Partial<InsertBirthdayMessage>): Promise<BirthdayMessage>;
  deleteBirthdayMessage(id: number): Promise<void>;
  
  // Birthday message history operations
  getBirthdayMessageHistory(companyId: number): Promise<BirthdayMessageHistory[]>;
  createBirthdayMessageHistory(history: InsertBirthdayMessageHistory): Promise<BirthdayMessageHistory>;
  
  // Points management operations
  getClientPointsByCompany(companyId: number): Promise<any[]>;
  getClientPointsById(clientId: number, companyId: number): Promise<any>;

  // Coupon operations
  getCoupons(): Promise<Coupon[]>;
  getCoupon(id: number): Promise<Coupon | undefined>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: number, coupon: Partial<InsertCoupon>): Promise<Coupon>;
  deleteCoupon(id: number): Promise<void>;

  // Affiliate operations
  getAffiliate(id: number): Promise<any | undefined>;
  getAffiliateByEmail(email: string): Promise<any | undefined>;
  getAffiliateByCode(code: string): Promise<any | undefined>;
  createAffiliate(affiliate: any): Promise<any>;
  updateAffiliate(id: number, affiliate: any): Promise<any>;
  getAffiliateReferrals(affiliateId: number): Promise<any[]>;
  getAffiliateCommissions(affiliateId: number): Promise<any[]>;
  createAffiliateReferral(referral: any): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Admin operations
  async getAdmins(): Promise<Admin[]> {
    return await db.select().from(admins).orderBy(desc(admins.createdAt));
  }

  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin;
  }

  async createAdmin(adminData: InsertAdmin): Promise<Admin> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(adminData.password, 12);
    const adminWithHashedPassword = {
      ...adminData,
      password: hashedPassword
    };
    
    await db.insert(admins).values(adminWithHashedPassword);
    const [admin] = await db.select().from(admins).where(eq(admins.username, adminData.username));
    return admin;
  }

  async updateAdmin(id: number, adminData: Partial<InsertAdmin>): Promise<Admin> {
    const updateData: any = {
      ...adminData,
      updatedAt: new Date()
    };
    
    // Hash password if provided
    if (adminData.password) {
      updateData.password = await bcrypt.hash(adminData.password, 12);
    }
    
    await db.update(admins).set(updateData).where(eq(admins.id, id));
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async deleteAdmin(id: number): Promise<void> {
    await db.delete(admins).where(eq(admins.id, id));
  }

  // Company operations
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyByEmail(email: string): Promise<Company | undefined> {
    console.log('Searching for company with email:', email);
    try {
      const result = await db.select().from(companies).where(eq(companies.email, email));
      console.log('Database query result:', result);
      const [company] = result;
      console.log('Company found:', company ? 'Yes' : 'No', company);
      return company;
    } catch (error) {
      console.error('Error in getCompanyByEmail:', error);
      return undefined;
    }
  }

  async getCompanyByResetToken(token: string): Promise<Company | undefined> {
    try {
      console.log('Looking for token:', token);
      const [company] = await db.select().from(companies).where(eq(companies.resetToken, token));
      console.log('Found company with token:', company ? 'YES' : 'NO');
      if (company) {
        console.log('Token expiry from DB:', company.resetTokenExpires);
      }
      return company;
    } catch (error) {
      console.error('Error in getCompanyByResetToken:', error);
      return undefined;
    }
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    await db.insert(companies).values(companyData);
    const [company] = await db.select().from(companies).where(eq(companies.email, companyData.email));
    return company;
  }

  async updateCompany(id: number, companyData: Partial<InsertCompany>): Promise<Company> {
    await db.update(companies).set(companyData).where(eq(companies.id, id));
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async deleteCompany(id: number): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  // Plan operations
  async getPlans(): Promise<Plan[]> {
    const planList = await db.select().from(plans).orderBy(desc(plans.createdAt));
    
    // Ensure permissions are properly parsed if they're strings
    return planList.map((plan: any) => {
      if (plan && typeof plan.permissions === 'string') {
        try {
          plan.permissions = JSON.parse(plan.permissions);
        } catch (e) {
          console.error("Error parsing permissions for plan", plan.id, ":", e);
        }
      }
      return plan;
    });
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    
    // Ensure permissions is properly parsed if it's a string
    if (plan && typeof plan.permissions === 'string') {
      try {
        plan.permissions = JSON.parse(plan.permissions);
      } catch (e) {
        console.error("Error parsing permissions for plan", plan.id, ":", e);
      }
    }
    
    return plan;
  }

  async createPlan(planData: InsertPlan): Promise<Plan> {
    await db.insert(plans).values(planData);
    const [plan] = await db.select().from(plans).where(eq(plans.name, planData.name));
    return plan;
  }

  async updatePlan(id: number, planData: Partial<InsertPlan>): Promise<Plan> {
    await db.update(plans).set({
      ...planData,
      updatedAt: new Date()
    }).where(eq(plans.id, id));
    
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    
    // Ensure permissions is properly parsed if it's a string
    if (plan && typeof plan.permissions === 'string') {
      try {
        plan.permissions = JSON.parse(plan.permissions);
      } catch (e) {
        console.error("Error parsing permissions:", e);
      }
    }
    
    return plan;
  }

  async deletePlan(id: number): Promise<void> {
    await db.delete(plans).where(eq(plans.id, id));
  }

  // Global settings operations
  async getGlobalSettings(): Promise<GlobalSettings | undefined> {
    const [settings] = await db.select().from(globalSettings).limit(1);
    
    // Create default settings if none exist
    if (!settings) {
      await db.insert(globalSettings).values({});
      const [newSettings] = await db.select().from(globalSettings).limit(1);
      return newSettings;
    }
    
    return settings;
  }

  async updateGlobalSettings(settingsData: Partial<InsertGlobalSettings>): Promise<GlobalSettings> {
    const existingSettings = await this.getGlobalSettings();
    
    if (existingSettings) {
      await db.update(globalSettings).set(settingsData).where(eq(globalSettings.id, existingSettings.id));
      const [updatedSettings] = await db.select().from(globalSettings).where(eq(globalSettings.id, existingSettings.id));
      return updatedSettings;
    } else {
      await db.insert(globalSettings).values(settingsData);
      const [newSettings] = await db.select().from(globalSettings).limit(1);
      return newSettings;
    }
  }

  // WhatsApp instances operations with table creation fallback
  async getWhatsappInstancesByCompany(companyId: number): Promise<WhatsappInstance[]> {
    try {
      // First try to query normally
      const instances = await db
        .select()
        .from(whatsappInstances)
        .where(eq(whatsappInstances.companyId, companyId))
        .orderBy(desc(whatsappInstances.createdAt));
      return instances;
    } catch (error: any) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        try {
          // Create table if it doesn't exist
          await db.execute(`
            CREATE TABLE IF NOT EXISTS whatsapp_instances (
              id INT AUTO_INCREMENT PRIMARY KEY,
              company_id INT NOT NULL,
              instance_name VARCHAR(255) NOT NULL,
              status VARCHAR(50) DEFAULT 'disconnected',
              qr_code TEXT,
              webhook VARCHAR(500),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_company_id (company_id)
            )
          `);
          
          // Try query again after table creation
          const instances = await db
            .select()
            .from(whatsappInstances)
            .where(eq(whatsappInstances.companyId, companyId))
            .orderBy(desc(whatsappInstances.createdAt));
          return instances;
        } catch (createError: any) {
          console.error("Error creating WhatsApp table:", createError);
          return [];
        }
      }
      console.error("Error getting WhatsApp instances:", error);
      return [];
    }
  }

  async getWhatsappInstance(id: number): Promise<WhatsappInstance | undefined> {
    try {
      const [instance] = await db
        .select()
        .from(whatsappInstances)
        .where(eq(whatsappInstances.id, id));
      return instance;
    } catch (error: any) {
      console.error("Error getting WhatsApp instance:", error);
      return undefined;
    }
  }

  async getWhatsappInstanceByName(instanceName: string, companyId: number): Promise<WhatsappInstance | undefined> {
    try {
      const [instance] = await db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.instanceName, instanceName),
            eq(whatsappInstances.companyId, companyId)
          )
        );
      return instance;
    } catch (error: any) {
      console.error("Error getting WhatsApp instance by name:", error);
      return undefined;
    }
  }

  async createWhatsappInstance(instanceData: InsertWhatsappInstance): Promise<WhatsappInstance> {
    try {
      await db
        .insert(whatsappInstances)
        .values(instanceData);
      
      // Get the newly created instance
      const [newInstance] = await db
        .select()
        .from(whatsappInstances)
        .where(eq(whatsappInstances.companyId, instanceData.companyId))
        .orderBy(desc(whatsappInstances.id))
        .limit(1);
      
      return newInstance;
    } catch (error: any) {
      console.error("Error creating WhatsApp instance:", error);
      throw error;
    }
  }

  async updateWhatsappInstance(id: number, instanceData: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance> {
    try {
      await db
        .update(whatsappInstances)
        .set({
          ...instanceData,
          updatedAt: new Date(),
        })
        .where(eq(whatsappInstances.id, id));
        
      const [instance] = await db
        .select()
        .from(whatsappInstances)
        .where(eq(whatsappInstances.id, id));
      
      return instance;
    } catch (error: any) {
      console.error("Error updating WhatsApp instance:", error);
      throw error;
    }
  }

  async deleteWhatsappInstance(id: number): Promise<void> {
    try {
      // First delete related reminder history records using Drizzle ORM
      await db
        .delete(reminderHistory)
        .where(eq(reminderHistory.whatsappInstanceId, id));
      
      // Then delete the WhatsApp instance
      await db
        .delete(whatsappInstances)
        .where(eq(whatsappInstances.id, id));
    } catch (error: any) {
      console.error("Error deleting WhatsApp instance:", error);
      throw error;
    }
  }

  async getWhatsappInstanceByName(instanceName: string): Promise<WhatsappInstance | undefined> {
    try {
      const [instance] = await db
        .select()
        .from(whatsappInstances)
        .where(eq(whatsappInstances.instanceName, instanceName));
      return instance;
    } catch (error: any) {
      console.error("Error getting WhatsApp instance by name:", error);
      return undefined;
    }
  }

  // Conversations operations
  async getConversation(companyId: number, whatsappInstanceId: number, phoneNumber: string): Promise<Conversation | undefined> {
    try {
      // Ensure tables exist first
      await ensureConversationTables();
      
      const [conversation] = await db.select().from(conversations).where(
        and(
          eq(conversations.companyId, companyId),
          eq(conversations.whatsappInstanceId, whatsappInstanceId),
          eq(conversations.phoneNumber, phoneNumber)
        )
      );
      return conversation;
    } catch (error: any) {
      console.error("Error getting conversation:", error);
      return undefined;
    }
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    try {
      // Ensure tables exist first
      await ensureConversationTables();
      
      await db
        .insert(conversations)
        .values(conversationData);
      
      // Get the created conversation by unique fields
      const [conversation] = await db.select().from(conversations).where(
        and(
          eq(conversations.companyId, conversationData.companyId),
          eq(conversations.whatsappInstanceId, conversationData.whatsappInstanceId),
          eq(conversations.phoneNumber, conversationData.phoneNumber)
        )
      );
      return conversation;
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  }

  async updateConversation(id: number, conversationData: Partial<InsertConversation>): Promise<Conversation> {
    try {
      // Create a safe update object without problematic timestamps
      const updateData = { ...conversationData };
      
      await db
        .update(conversations)
        .set(updateData)
        .where(eq(conversations.id, id));
      
      // Get the updated conversation
      const [conversation] = await db.select().from(conversations)
        .where(eq(conversations.id, id));
      return conversation;
    } catch (error: any) {
      console.error("Error updating conversation:", error);
      throw error;
    }
  }

  async getConversationsByCompany(companyId: number): Promise<Conversation[]> {
    try {
      return await db.select().from(conversations)
        .where(eq(conversations.companyId, companyId))
        .orderBy(desc(conversations.lastMessageAt));
    } catch (error: any) {
      console.error("Error getting conversations by company:", error);
      return [];
    }
  }

  // Messages operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    try {
      // Ensure tables exist first
      await ensureConversationTables();
      
      // Create a safe message object with proper timestamp handling
      const safeMessageData = {
        ...messageData,
        timestamp: messageData.timestamp || new Date(),
        createdAt: new Date()
      };
      
      console.log('💾 Creating message with data:', JSON.stringify(safeMessageData, null, 2));
      
      await db
        .insert(messages)
        .values(safeMessageData);
      
      // Get the created message by timestamp and conversation
      const [message] = await db.select().from(messages)
        .where(
          and(
            eq(messages.conversationId, safeMessageData.conversationId),
            eq(messages.content, safeMessageData.content),
            eq(messages.role, safeMessageData.role)
          )
        )
        .orderBy(desc(messages.timestamp))
        .limit(1);
      return message;
    } catch (error: any) {
      console.error("Error creating message:", error);
      throw error;
    }
  }

  async getMessagesByConversation(conversationId: number, limit?: number): Promise<Message[]> {
    try {
      const query = db.select().from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.timestamp));
      
      if (limit) {
        return await query.limit(limit);
      }
      return await query;
    } catch (error: any) {
      console.error("Error getting messages by conversation:", error);
      return [];
    }
  }

  async getRecentMessages(conversationId: number, limit: number): Promise<Message[]> {
    try {
      return await db.select().from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.timestamp))
        .limit(limit);
    } catch (error: any) {
      console.error("Error getting recent messages:", error);
      return [];
    }
  }

  // Services operations
  async getServicesByCompany(companyId: number): Promise<Service[]> {
    try {
      return await db.select().from(services)
        .where(eq(services.companyId, companyId))
        .orderBy(desc(services.createdAt));
    } catch (error: any) {
      console.error("Error getting services:", error);
      return [];
    }
  }

  async getService(id: number): Promise<Service | undefined> {
    try {
      const [service] = await db.select().from(services)
        .where(eq(services.id, id));
      return service;
    } catch (error: any) {
      console.error("Error getting service:", error);
      return undefined;
    }
  }

  async createService(serviceData: InsertService): Promise<Service> {
    try {
      await db.insert(services).values(serviceData);
      const [service] = await db.select().from(services).where(
        and(
          eq(services.companyId, serviceData.companyId),
          eq(services.name, serviceData.name)
        )
      );
      return service;
    } catch (error: any) {
      console.error("Error creating service:", error);
      throw error;
    }
  }

  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service> {
    try {
      await db.update(services)
        .set({ ...serviceData, updatedAt: new Date() })
        .where(eq(services.id, id));
      
      const [service] = await db.select().from(services)
        .where(eq(services.id, id));
      return service;
    } catch (error: any) {
      console.error("Error updating service:", error);
      throw error;
    }
  }

  async deleteService(id: number): Promise<void> {
    try {
      await db.delete(services).where(eq(services.id, id));
    } catch (error: any) {
      console.error("Error deleting service:", error);
      throw error;
    }
  }

  // Professionals operations
  async getProfessionalsByCompany(companyId: number): Promise<Professional[]> {
    try {
      return await db.select().from(professionals)
        .where(eq(professionals.companyId, companyId))
        .orderBy(desc(professionals.createdAt));
    } catch (error: any) {
      console.error("Error getting professionals:", error);
      return [];
    }
  }

  async getProfessional(id: number): Promise<Professional | undefined> {
    try {
      const [professional] = await db.select().from(professionals)
        .where(eq(professionals.id, id));
      return professional;
    } catch (error: any) {
      console.error("Error getting professional:", error);
      return undefined;
    }
  }

  async createProfessional(professionalData: InsertProfessional): Promise<Professional> {
    try {
      await db.insert(professionals).values(professionalData);
      const [professional] = await db.select().from(professionals).where(
        and(
          eq(professionals.companyId, professionalData.companyId),
          eq(professionals.name, professionalData.name)
        )
      );
      return professional;
    } catch (error: any) {
      console.error("Error creating professional:", error);
      throw error;
    }
  }

  async updateProfessional(id: number, professionalData: Partial<InsertProfessional>): Promise<Professional> {
    try {
      // Hash password if provided
      if (professionalData.password) {
        professionalData.password = await bcrypt.hash(professionalData.password, 10);
      }

      await db.update(professionals)
        .set({ ...professionalData, updatedAt: new Date() })
        .where(eq(professionals.id, id));
      
      const [professional] = await db.select().from(professionals)
        .where(eq(professionals.id, id));
      return professional;
    } catch (error: any) {
      console.error("Error updating professional:", error);
      throw error;
    }
  }

  async deleteProfessional(id: number): Promise<void> {
    try {
      await db.delete(professionals).where(eq(professionals.id, id));
    } catch (error: any) {
      console.error("Error deleting professional:", error);
      throw error;
    }
  }

  async getProfessionalsCount(companyId: number): Promise<number> {
    try {
      const result = await db.select({ count: sql<number>`COUNT(*)` })
        .from(professionals)
        .where(eq(professionals.companyId, companyId));
      return result[0]?.count || 0;
    } catch (error: any) {
      console.error("Error counting professionals:", error);
      return 0;
    }
  }

  // Appointments operations
  async getAppointmentsByCompany(companyId: number, month?: string): Promise<Appointment[]> {
    try {
      console.log('🔍 Getting appointments for company:', companyId, 'month filter:', month);
      
      let query = db.select({
        id: appointments.id,
        serviceId: appointments.serviceId,
        professionalId: appointments.professionalId,
        clientName: appointments.clientName,
        clientEmail: appointments.clientEmail,
        clientPhone: appointments.clientPhone,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        notes: appointments.notes,
        status: appointments.status,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        companyId: appointments.companyId,
        duration: appointments.duration,
        totalPrice: appointments.totalPrice,
        reminderSent: appointments.reminderSent,
        service: {
          name: services.name,
          color: services.color,
        },
        professional: {
          name: professionals.name,
        },
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
      .where(eq(appointments.companyId, companyId));

      // Apply month filter if provided
      if (month) {
        const [year, monthNum] = month.split('-');
        const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0);
        
        console.log('📅 Filtering by month:', month, 'from', startDate, 'to', endDate);
        
        // Replace the where clause with month filter
        query = db.select({
          id: appointments.id,
          serviceId: appointments.serviceId,
          professionalId: appointments.professionalId,
          clientName: appointments.clientName,
          clientEmail: appointments.clientEmail,
          clientPhone: appointments.clientPhone,
          appointmentDate: appointments.appointmentDate,
          appointmentTime: appointments.appointmentTime,
          notes: appointments.notes,
          status: appointments.status,
          createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt,
          companyId: appointments.companyId,
          duration: appointments.duration,
          totalPrice: appointments.totalPrice,
          reminderSent: appointments.reminderSent,
          service: {
            name: services.name,
            color: services.color,
          },
          professional: {
            name: professionals.name,
          },
        })
        .from(appointments)
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
        .where(
          and(
            eq(appointments.companyId, companyId),
            sql`DATE(${appointments.appointmentDate}) >= ${startDate.toISOString().split('T')[0]}`,
            sql`DATE(${appointments.appointmentDate}) <= ${endDate.toISOString().split('T')[0]}`
          )
        );
      }
      
      const result = await query.orderBy(desc(appointments.appointmentDate));
      console.log('📋 Found appointments:', result.length);
      
      return result;
    } catch (error: any) {
      console.error("Error getting appointments:", error);
      return [];
    }
  }

  async getAppointmentsByClient(clientId: number, companyId: number): Promise<any[]> {
    try {
      // First get the client's phone number using Drizzle ORM
      const [client] = await db.select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId)));
      
      if (!client) {
        console.log(`No client found with id ${clientId}`);
        return [];
      }
      
      console.log(`Looking for appointments for client phone: ${client.phone}`);
      
      // Get appointments using Drizzle ORM with proper joins
      const results = await db.select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        price: appointments.totalPrice,
        notes: appointments.notes,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        serviceName: services.name,
        professionalName: professionals.name,
        statusName: status.name,
        statusColor: status.color
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
      .leftJoin(status, eq(appointments.status, status.id))
      .where(and(
        eq(appointments.clientPhone, client.phone || ''),
        eq(appointments.companyId, companyId)
      ))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));
      
      console.log(`Found ${results.length} appointments for client ${clientId}`);
      
      // Format results properly
      return results.map(result => ({
        id: result.id,
        appointmentDate: result.appointmentDate,
        appointmentTime: result.appointmentTime,
        price: parseFloat(result.price?.toString() || '0'),
        notes: result.notes,
        clientName: result.clientName,
        clientPhone: result.clientPhone,
        serviceName: result.serviceName || 'Serviço não encontrado',
        professionalName: result.professionalName || 'Profissional não encontrado',
        statusName: result.statusName || 'Pendente',
        statusColor: result.statusColor || '#A0A0A0'
      }));
    } catch (error: any) {
      console.error("Error getting appointments by client:", error);
      return [];
    }
  }

  async getAppointmentsByProfessional(professionalId: number, companyId: number): Promise<any[]> {
    try {
      console.log(`Looking for appointments for professional: ${professionalId}`);
      
      // Get appointments using Drizzle ORM with proper joins
      const results = await db.select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        price: appointments.totalPrice,
        notes: appointments.notes,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        serviceName: services.name,
        professionalName: professionals.name,
        statusName: status.name,
        statusColor: status.color
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
      .leftJoin(status, eq(appointments.status, status.id))
      .where(and(
        eq(appointments.professionalId, professionalId),
        eq(appointments.companyId, companyId)
      ))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));
      
      console.log(`Found ${results.length} appointments for professional ${professionalId}`);
      
      // Format results properly
      return results.map(result => ({
        id: result.id,
        appointmentDate: result.appointmentDate,
        appointmentTime: result.appointmentTime,
        price: parseFloat(result.price?.toString() || '0'),
        notes: result.notes,
        clientName: result.clientName,
        clientPhone: result.clientPhone,
        serviceName: result.serviceName || 'Serviço não encontrado',
        professionalName: result.professionalName || 'Profissional não encontrado',
        statusName: result.statusName || 'Pendente',
        statusColor: result.statusColor || '#A0A0A0'
      }));
    } catch (error: any) {
      console.error("Error getting appointments by professional:", error);
      return [];
    }
  }

  async getDetailedAppointmentsForReports(companyId: number): Promise<any[]> {
    try {
      console.log('📊 Getting detailed appointments for reports, company:', companyId);
      
      const results = await db.select({
        id: appointments.id,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        clientEmail: appointments.clientEmail,
        date: appointments.appointmentDate,
        time: appointments.appointmentTime,
        status: appointments.status,
        price: appointments.totalPrice,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        serviceName: services.name,
        servicePrice: services.price,
        professionalName: professionals.name
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
      .where(eq(appointments.companyId, companyId))
      .orderBy(appointments.appointmentDate, appointments.appointmentTime);
      
      // Format data properly
      const formattedResults = results.map(appointment => ({
        id: appointment.id,
        clientName: appointment.clientName || 'Cliente não informado',
        clientPhone: appointment.clientPhone || '',
        clientEmail: appointment.clientEmail || '',
        date: appointment.date instanceof Date ? appointment.date.toISOString().split('T')[0] : appointment.date,
        time: appointment.time || '',
        status: appointment.status || 'agendado',
        price: parseFloat(String(appointment.price || 0)),
        notes: appointment.notes || '',
        createdAt: appointment.createdAt,
        serviceName: appointment.serviceName || 'Serviço não informado',
        servicePrice: parseFloat(String(appointment.servicePrice || 0)),
        professionalName: appointment.professionalName || 'Profissional não informado'
      }));
      
      console.log(`📊 Found ${formattedResults.length} detailed appointments for reports`);
      return formattedResults;
    } catch (error: any) {
      console.error("Error getting detailed appointments for reports:", error);
      return [];
    }
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    try {
      const [appointment] = await db.select().from(appointments)
        .where(eq(appointments.id, id));
      return appointment;
    } catch (error: any) {
      console.error("Error getting appointment:", error);
      return undefined;
    }
  }

  async getAppointmentById(id: number, companyId: number): Promise<any | undefined> {
    try {
      const [appointment] = await db.select({
        id: appointments.id,
        serviceId: appointments.serviceId,
        professionalId: appointments.professionalId,
        clientName: appointments.clientName,
        clientEmail: appointments.clientEmail,
        clientPhone: appointments.clientPhone,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        duration: appointments.duration,
        notes: appointments.notes,
        status: appointments.status,
        totalPrice: appointments.totalPrice,
        reminderSent: appointments.reminderSent,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        companyId: appointments.companyId,
        service: {
          name: services.name,
          color: services.color,
        },
        professional: {
          name: professionals.name,
        },
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
      .where(and(
        eq(appointments.id, id),
        eq(appointments.companyId, companyId)
      ));
      
      return appointment;
    } catch (error: any) {
      console.error("Error getting appointment by ID:", error);
      return undefined;
    }
  }

  async createAppointment(appointmentData: InsertAppointment): Promise<Appointment> {
    try {
      console.log('📅 Creating appointment with data:', JSON.stringify(appointmentData, null, 2));
      
      await db.insert(appointments).values(appointmentData);
      const [appointment] = await db.select().from(appointments).where(
        and(
          eq(appointments.companyId, appointmentData.companyId),
          eq(appointments.clientPhone, appointmentData.clientPhone),
          eq(appointments.appointmentDate, appointmentData.appointmentDate),
          eq(appointments.appointmentTime, appointmentData.appointmentTime)
        )
      );

      // Send confirmation reminder after creating appointment
      if (appointment) {
        await this.sendAppointmentReminder(appointment.id, 'confirmation');
      }

      return appointment;
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      throw error;
    }
  }

  async updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment> {
    try {
      console.log('💾 Storage: Updating appointment ID:', id, 'with data:', JSON.stringify(appointmentData, null, 2));
      
      // Retry logic for database connection issues
      let retries = 3;
      let result;
      
      while (retries > 0) {
        try {
          result = await db.update(appointments)
            .set({ ...appointmentData, updatedAt: new Date() })
            .where(eq(appointments.id, id));
          break;
        } catch (dbError: any) {
          console.log(`💾 Storage: Update attempt failed, retries left: ${retries - 1}`, dbError.message);
          retries--;
          
          if (retries === 0) {
            throw dbError;
          }
          
          // Wait 100ms before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log('💾 Storage: Update result:', result);
      
      // Get the updated appointment with related data
      const [updatedAppointment] = await db.select({
        id: appointments.id,
        serviceId: appointments.serviceId,
        professionalId: appointments.professionalId,
        clientName: appointments.clientName,
        clientEmail: appointments.clientEmail,
        clientPhone: appointments.clientPhone,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        duration: appointments.duration,
        notes: appointments.notes,
        status: appointments.status,
        totalPrice: appointments.totalPrice,
        reminderSent: appointments.reminderSent,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        companyId: appointments.companyId,
        service: {
          name: services.name,
          color: services.color,
        },
        professional: {
          name: professionals.name,
        },
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
      .where(eq(appointments.id, id));
      
      console.log('💾 Storage: Updated appointment retrieved:', updatedAppointment);
      return updatedAppointment as any;
    } catch (error: any) {
      console.error("Error updating appointment:", error);
      throw error;
    }
  }

  async deleteAppointment(id: number): Promise<void> {
    try {
      await db.delete(appointments).where(eq(appointments.id, id));
    } catch (error: any) {
      console.error("Error deleting appointment:", error);
      throw error;
    }
  }

  // Status operations
  async getStatus(): Promise<Status[]> {
    try {
      return await db.select().from(status)
        .orderBy(desc(status.createdAt));
    } catch (error: any) {
      console.error("Error getting status:", error);
      return [];
    }
  }

  async getStatusById(id: number): Promise<Status | undefined> {
    try {
      const [statusItem] = await db.select().from(status)
        .where(eq(status.id, id));
      return statusItem;
    } catch (error: any) {
      console.error("Error getting status:", error);
      return undefined;
    }
  }

  async createStatus(statusData: InsertStatus): Promise<Status> {
    try {
      await db.insert(status).values(statusData);
      const [statusItem] = await db.select().from(status).where(
        and(
          eq(status.name, statusData.name),
          eq(status.color, statusData.color)
        )
      );
      return statusItem;
    } catch (error: any) {
      console.error("Error creating status:", error);
      throw error;
    }
  }

  async updateStatus(id: number, statusData: Partial<InsertStatus>): Promise<Status> {
    try {
      await db.update(status)
        .set({ ...statusData, updatedAt: new Date() })
        .where(eq(status.id, id));
      
      const [statusItem] = await db.select().from(status)
        .where(eq(status.id, id));
      return statusItem;
    } catch (error: any) {
      console.error("Error updating status:", error);
      throw error;
    }
  }

  async deleteStatus(id: number): Promise<void> {
    try {
      await db.delete(status).where(eq(status.id, id));
    } catch (error: any) {
      console.error("Error deleting status:", error);
      throw error;
    }
  }

  // Reminder System Operations
  async getReminderSettings(companyId: number): Promise<ReminderSettings[]> {
    try {
      return await db.select().from(reminderSettings)
        .where(eq(reminderSettings.companyId, companyId));
    } catch (error: any) {
      console.error("Error getting reminder settings:", error);
      return [];
    }
  }

  async updateReminderSettings(id: number, settingsData: Partial<InsertReminderSettings>): Promise<ReminderSettings> {
    try {
      await db.update(reminderSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(reminderSettings.id, id));
      
      const [settings] = await db.select().from(reminderSettings)
        .where(eq(reminderSettings.id, id));
      return settings;
    } catch (error: any) {
      console.error("Error updating reminder settings:", error);
      throw error;
    }
  }

  async getReminderHistory(companyId: number): Promise<ReminderHistory[]> {
    try {
      return await db.select().from(reminderHistory)
        .where(eq(reminderHistory.companyId, companyId))
        .orderBy(desc(reminderHistory.sentAt));
    } catch (error: any) {
      console.error("Error getting reminder history:", error);
      return [];
    }
  }

  async sendAppointmentReminder(appointmentId: number, reminderType: string): Promise<void> {
    try {
      // Get appointment details with related data
      const [appointment] = await db.select({
        id: appointments.id,
        companyId: appointments.companyId,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        serviceName: services.name,
        professionalName: professionals.name,
      }).from(appointments)
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
        .where(eq(appointments.id, appointmentId));

      if (!appointment) {
        console.error("Appointment not found for reminder:", appointmentId);
        return;
      }

      // Get company name
      const [company] = await db.select().from(companies)
        .where(eq(companies.id, appointment.companyId));

      if (!company) {
        console.error("Company not found for reminder:", appointment.companyId);
        return;
      }

      // Get reminder template
      const [reminderSetting] = await db.select().from(reminderSettings)
        .where(and(
          eq(reminderSettings.companyId, appointment.companyId),
          eq(reminderSettings.reminderType, reminderType),
          eq(reminderSettings.isActive, true)
        ));

      if (!reminderSetting) {
        console.log(`No active reminder template found for type: ${reminderType}`);
        return;
      }

      // Format the message
      let message = reminderSetting.messageTemplate;
      message = message.replace('{companyName}', company.fantasyName);
      message = message.replace('{serviceName}', appointment.serviceName || 'Serviço');
      message = message.replace('{professionalName}', appointment.professionalName || 'Profissional');
      
      // Format date and time
      const appointmentDate = new Date(appointment.appointmentDate);
      const formattedDate = appointmentDate.toLocaleDateString('pt-BR');
      message = message.replace('{appointmentDate}', formattedDate);
      message = message.replace('{appointmentTime}', appointment.appointmentTime);

      // Get WhatsApp instance for the company
      const [whatsappInstance] = await db.select().from(whatsappInstances)
        .where(eq(whatsappInstances.companyId, appointment.companyId));

      if (!whatsappInstance) {
        console.error("No WhatsApp instance found for company:", appointment.companyId);
        return;
      }

      // Format phone number for WhatsApp API (Brazilian format with DDI 55)
      const cleanPhone = appointment.clientPhone.replace(/\D/g, '');
      let formattedPhone = cleanPhone;
      
      if (!formattedPhone.startsWith('55')) {
        formattedPhone = '55' + formattedPhone;
      }

      // Send WhatsApp message
      try {
        const evolutionApiUrl = whatsappInstance.apiUrl || process.env.EVOLUTION_API_URL;
        const apiKey = whatsappInstance.apiKey || process.env.EVOLUTION_API_KEY;

        if (!evolutionApiUrl || !apiKey) {
          console.error("Missing Evolution API configuration");
          return;
        }

        // Evolution API URL should NOT include /api/ prefix for message endpoints
        const correctedApiUrl = evolutionApiUrl?.replace(/\/api\/?$/, '').replace(/\/$/, '');
        const response = await fetch(`${correctedApiUrl}/message/sendText/${whatsappInstance.instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: message
          })
        });

        const result = await response.json();
        
        // Save reminder to history
        await db.insert(reminderHistory).values({
          companyId: appointment.companyId,
          appointmentId: appointmentId,
          reminderType: reminderType,
          clientPhone: appointment.clientPhone,
          message: message,
          status: response.ok ? 'sent' : 'failed',
          whatsappInstanceId: whatsappInstance.id
        });

        if (response.ok) {
          console.log(`✅ Reminder sent successfully for appointment ${appointmentId} (${reminderType})`);
        } else {
          console.error(`❌ Failed to send reminder:`, result);
        }

      } catch (error) {
        console.error("Error sending WhatsApp reminder:", error);
        
        // Save failed reminder to history
        await db.insert(reminderHistory).values({
          companyId: appointment.companyId,
          appointmentId: appointmentId,
          reminderType: reminderType,
          clientPhone: appointment.clientPhone,
          message: message,
          status: 'failed',
          whatsappInstanceId: whatsappInstance.id
        });
      }

    } catch (error: any) {
      console.error("Error in sendAppointmentReminder:", error);
    }
  }

  async testReminderFunction(companyId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Get a recent appointment for testing
      const [testAppointment] = await db.select().from(appointments)
        .where(eq(appointments.companyId, companyId))
        .orderBy(desc(appointments.createdAt))
        .limit(1);

      if (!testAppointment) {
        return { success: false, message: "Nenhum agendamento encontrado para teste" };
      }

      // Send test confirmation reminder
      await this.sendAppointmentReminder(testAppointment.id, 'confirmation');
      
      return { success: true, message: "Lembrete de teste enviado com sucesso!" };
    } catch (error: any) {
      console.error("Error testing reminder function:", error);
      return { success: false, message: "Erro ao enviar lembrete de teste: " + error.message };
    }
  }

  // Clients operations
  async getClientsByCompany(companyId: number): Promise<Client[]> {
    try {
      return await db.select().from(clients)
        .where(eq(clients.companyId, companyId))
        .orderBy(desc(clients.createdAt));
    } catch (error: any) {
      console.error("Error getting clients:", error);
      return [];
    }
  }

  async getClient(id: number): Promise<Client | undefined> {
    try {
      const [client] = await db.select().from(clients)
        .where(eq(clients.id, id));
      return client;
    } catch (error: any) {
      console.error("Error getting client:", error);
      return undefined;
    }
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    try {
      // Validate phone number format
      if (clientData.phone && !validateBrazilianPhone(clientData.phone)) {
        throw new Error('Formato de telefone inválido. Use o formato brasileiro (XX) XXXXX-XXXX');
      }

      // Check for existing client with same phone in the company
      if (clientData.phone) {
        const normalizedPhone = normalizePhone(clientData.phone);
        const existingClients = await this.getClientsByCompany(clientData.companyId);
        
        const duplicateClient = existingClients.find(client => 
          client.phone && normalizePhone(client.phone) === normalizedPhone
        );

        if (duplicateClient) {
          // Return the existing client instead of throwing an error
          console.log(`📞 Client with phone ${clientData.phone} already exists: ${duplicateClient.name}`);
          return duplicateClient;
        }
      }

      await db.insert(clients).values(clientData);
      const [client] = await db.select().from(clients).where(
        and(
          eq(clients.companyId, clientData.companyId),
          eq(clients.name, clientData.name)
        )
      ).orderBy(desc(clients.createdAt));
      return client;
    } catch (error: any) {
      console.error("Error creating client:", error);
      throw error;
    }
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client> {
    try {
      // Validate phone number format if phone is being updated
      if (clientData.phone && !validateBrazilianPhone(clientData.phone)) {
        throw new Error('Formato de telefone inválido. Use o formato brasileiro (XX) XXXXX-XXXX');
      }

      // Check for existing client with same phone if phone is being updated
      if (clientData.phone) {
        const normalizedPhone = normalizePhone(clientData.phone);
        
        // Get current client to know the company
        const [currentClient] = await db.select().from(clients).where(eq(clients.id, id));
        if (!currentClient) {
          throw new Error('Cliente não encontrado');
        }

        const existingClients = await this.getClientsByCompany(currentClient.companyId);
        
        const duplicateClient = existingClients.find(client => 
          client.id !== id && // Exclude current client
          client.phone && normalizePhone(client.phone) === normalizedPhone
        );

        if (duplicateClient) {
          throw new Error(`Já existe outro cliente cadastrado com este telefone: ${duplicateClient.name}`);
        }
      }

      await db.update(clients)
        .set({ ...clientData, updatedAt: new Date() })
        .where(eq(clients.id, id));
      
      const [client] = await db.select().from(clients)
        .where(eq(clients.id, id));
      return client;
    } catch (error: any) {
      console.error("Error updating client:", error);
      throw error;
    }
  }

  async deleteClient(id: number): Promise<void> {
    try {
      await db.delete(clients).where(eq(clients.id, id));
    } catch (error: any) {
      console.error("Error deleting client:", error);
      throw error;
    }
  }

  // Birthday messages operations
  async getBirthdayMessagesByCompany(companyId: number): Promise<BirthdayMessage[]> {
    try {
      return await db.select().from(birthdayMessages)
        .where(eq(birthdayMessages.companyId, companyId))
        .orderBy(desc(birthdayMessages.createdAt));
    } catch (error: any) {
      console.error("Error getting birthday messages:", error);
      return [];
    }
  }

  async getBirthdayMessage(id: number): Promise<BirthdayMessage | undefined> {
    try {
      const [message] = await db.select().from(birthdayMessages)
        .where(eq(birthdayMessages.id, id));
      return message;
    } catch (error: any) {
      console.error("Error getting birthday message:", error);
      return undefined;
    }
  }

  async createBirthdayMessage(messageData: InsertBirthdayMessage): Promise<BirthdayMessage> {
    try {
      await db.insert(birthdayMessages).values(messageData);
      // Get the most recently created message for this company
      const [message] = await db.select().from(birthdayMessages)
        .where(eq(birthdayMessages.companyId, messageData.companyId))
        .orderBy(desc(birthdayMessages.id))
        .limit(1);
      return message;
    } catch (error: any) {
      console.error("Error creating birthday message:", error);
      throw error;
    }
  }

  async updateBirthdayMessage(id: number, messageData: Partial<InsertBirthdayMessage>): Promise<BirthdayMessage> {
    try {
      await db.update(birthdayMessages)
        .set({ ...messageData, updatedAt: new Date() })
        .where(eq(birthdayMessages.id, id));
      
      const [message] = await db.select().from(birthdayMessages)
        .where(eq(birthdayMessages.id, id));
      return message;
    } catch (error: any) {
      console.error("Error updating birthday message:", error);
      throw error;
    }
  }

  async deleteBirthdayMessage(id: number): Promise<void> {
    try {
      await db.delete(birthdayMessages).where(eq(birthdayMessages.id, id));
    } catch (error: any) {
      console.error("Error deleting birthday message:", error);
      throw error;
    }
  }

  // Birthday message history operations
  async getBirthdayMessageHistory(companyId: number): Promise<BirthdayMessageHistory[]> {
    try {
      return await db.select().from(birthdayMessageHistory)
        .where(eq(birthdayMessageHistory.companyId, companyId))
        .orderBy(desc(birthdayMessageHistory.sentAt));
    } catch (error: any) {
      console.error("Error getting birthday message history:", error);
      return [];
    }
  }

  async createBirthdayMessageHistory(historyData: InsertBirthdayMessageHistory): Promise<BirthdayMessageHistory> {
    try {
      await db.insert(birthdayMessageHistory).values(historyData);
      // Get the most recently created history for this company
      const [history] = await db.select().from(birthdayMessageHistory)
        .where(eq(birthdayMessageHistory.companyId, historyData.companyId))
        .orderBy(desc(birthdayMessageHistory.id))
        .limit(1);
      return history;
    } catch (error: any) {
      console.error("Error creating birthday message history:", error);
      throw error;
    }
  }

  // Professional Reviews operations
  async getProfessionalReviews(professionalId: number): Promise<ProfessionalReview[]> {
    try {
      return await db.select().from(professionalReviews)
        .where(and(
          eq(professionalReviews.professionalId, professionalId),
          eq(professionalReviews.isVisible, true)
        ))
        .orderBy(desc(professionalReviews.createdAt));
    } catch (error: any) {
      console.error("Error getting professional reviews:", error);
      return [];
    }
  }

  async getProfessionalReviewsByCompany(companyId: number): Promise<ProfessionalReview[]> {
    try {
      // Use raw SQL to handle column name differences
      const result = await db.execute(sql`
        SELECT 
          pr.id,
          pr.professional_id as professionalId,
          pr.appointment_id as appointmentId,
          pr.client_name as clientName,
          pr.client_phone as clientPhone,
          pr.rating,
          pr.comment,
          pr.submitted_at as reviewDate,
          pr.is_public as isVisible,
          pr.submitted_at as createdAt,
          p.name as professionalName
        FROM professional_reviews pr
        LEFT JOIN professionals p ON pr.professional_id = p.id
        WHERE p.company_id = ${companyId} AND pr.is_public = true
        ORDER BY pr.submitted_at DESC
      `);
      return result as any[];
    } catch (error: any) {
      console.error("Error getting professional reviews by company:", error);
      return [];
    }
  }

  async createProfessionalReview(reviewData: InsertProfessionalReview): Promise<ProfessionalReview> {
    try {
      await db.insert(professionalReviews).values(reviewData);
      const [review] = await db.select().from(professionalReviews)
        .where(and(
          eq(professionalReviews.professionalId, reviewData.professionalId),
          eq(professionalReviews.appointmentId, reviewData.appointmentId)
        ))
        .orderBy(desc(professionalReviews.id))
        .limit(1);
      return review;
    } catch (error: any) {
      console.error("Error creating professional review:", error);
      throw error;
    }
  }

  async updateProfessionalReview(id: number, reviewData: Partial<InsertProfessionalReview>): Promise<ProfessionalReview> {
    try {
      await db.update(professionalReviews)
        .set(reviewData)
        .where(eq(professionalReviews.id, id));
      
      const [review] = await db.select().from(professionalReviews)
        .where(eq(professionalReviews.id, id));
      return review;
    } catch (error: any) {
      console.error("Error updating professional review:", error);
      throw error;
    }
  }

  async deleteProfessionalReview(id: number): Promise<void> {
    try {
      await db.delete(professionalReviews).where(eq(professionalReviews.id, id));
    } catch (error: any) {
      console.error("Error deleting professional review:", error);
      throw error;
    }
  }

  // Review Invitations operations
  async getReviewInvitations(companyId: number): Promise<ReviewInvitation[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          ri.id,
          ri.appointment_id as appointmentId,
          ri.professional_id as professionalId,
          ri.company_id as companyId,
          ri.client_phone as clientPhone,
          ri.invitation_token as invitationToken,
          ri.sent_at as sentAt,
          ri.review_submitted_at as reviewSubmittedAt,
          ri.status,
          ri.whatsapp_instance_id as whatsappInstanceId,
          p.name as professionalName,
          a.client_name as clientName,
          a.appointment_date as appointmentDate,
          a.appointment_time as appointmentTime
        FROM review_invitations ri
        LEFT JOIN professionals p ON ri.professional_id = p.id
        LEFT JOIN appointments a ON ri.appointment_id = a.id
        WHERE ri.company_id = ${companyId}
        ORDER BY ri.sent_at DESC
      `);
      
      // Transform the result to match the expected structure
      return (result as any[]).map((row: any) => ({
        id: row.id,
        appointmentId: row.appointmentId,
        professionalId: row.professionalId,
        clientPhone: row.clientPhone,
        clientName: row.clientName,
        appointmentDate: row.appointmentDate,
        appointmentTime: row.appointmentTime,
        invitationToken: row.invitationToken,
        reviewSubmittedAt: row.reviewSubmittedAt,
        status: row.status,
        createdAt: row.sentAt,
        professional: { name: row.professionalName },
        appointment: { 
          clientName: row.clientName,
          appointmentDate: row.appointmentDate,
          appointmentTime: row.appointmentTime
        }
      }));
    } catch (error: any) {
      console.error("Error getting review invitations:", error);
      return [];
    }
  }

  async getReviewInvitationByToken(token: string): Promise<ReviewInvitation | undefined> {
    try {
      const [invitation] = await db.select().from(reviewInvitations)
        .where(eq(reviewInvitations.invitationToken, token));
      return invitation;
    } catch (error: any) {
      console.error("Error getting review invitation by token:", error);
      return undefined;
    }
  }

  async createReviewInvitation(invitationData: InsertReviewInvitation): Promise<ReviewInvitation> {
    try {
      await db.insert(reviewInvitations).values(invitationData);
      const [invitation] = await db.select().from(reviewInvitations)
        .where(eq(reviewInvitations.invitationToken, invitationData.invitationToken))
        .limit(1);
      return invitation;
    } catch (error: any) {
      console.error("Error creating review invitation:", error);
      throw error;
    }
  }

  async updateReviewInvitation(id: number, invitationData: Partial<InsertReviewInvitation>): Promise<ReviewInvitation> {
    try {
      await db.update(reviewInvitations)
        .set(invitationData)
        .where(eq(reviewInvitations.id, id));
      
      const [invitation] = await db.select().from(reviewInvitations)
        .where(eq(reviewInvitations.id, id));
      return invitation;
    } catch (error: any) {
      console.error("Error updating review invitation:", error);
      throw error;
    }
  }

  async sendReviewInvitation(appointmentId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Get appointment details with professional and service
      const [appointment] = await db.select({
        id: appointments.id,
        companyId: appointments.companyId,
        professionalId: appointments.professionalId,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        serviceName: services.name,
        professionalName: professionals.name,
      }).from(appointments)
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
        .where(eq(appointments.id, appointmentId));

      if (!appointment) {
        return { success: false, message: "Agendamento não encontrado" };
      }

      // Check if review invitation already exists
      const [existingInvitation] = await db.select().from(reviewInvitations)
        .where(eq(reviewInvitations.appointmentId, appointmentId));

      if (existingInvitation) {
        return { success: false, message: "Convite de avaliação já foi enviado para este agendamento" };
      }

      // Generate unique token
      const token = `review_${appointmentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get company details
      const [company] = await db.select().from(companies)
        .where(eq(companies.id, appointment.companyId));

      if (!company) {
        return { success: false, message: "Empresa não encontrada" };
      }

      // Get WhatsApp instance
      const [whatsappInstance] = await db.select().from(whatsappInstances)
        .where(eq(whatsappInstances.companyId, appointment.companyId))
        .limit(1);

      if (!whatsappInstance) {
        return { success: false, message: "Instância do WhatsApp não configurada" };
      }

      // Create review invitation
      await this.createReviewInvitation({
        appointmentId: appointmentId,
        professionalId: appointment.professionalId,
        clientPhone: appointment.clientPhone,
        invitationToken: token,
        status: 'sent',
        whatsappInstanceId: whatsappInstance.id,
        companyId: appointment.companyId
      });

      // Generate review URL - use the configured system URL or default
      const settings = await this.getGlobalSettings();
      let reviewUrl = `http://localhost:5000/review/${token}`;
      
      if (settings?.systemUrl) {
        reviewUrl = `${settings.systemUrl}/review/${token}`;
      }

      // Format message
      const message = `Olá ${appointment.clientName}! 👋

Esperamos que tenha ficado satisfeito(a) com o atendimento de ${appointment.professionalName} na ${company.fantasyName}.

Sua opinião é muito importante para nós! Por favor, avalie nosso serviço clicando no link abaixo:

🔗 ${reviewUrl}

Obrigado pela preferência! 🙏`;

      // Format phone number - ensure we have a valid phone number
      if (!appointment.clientPhone) {
        return { success: false, message: "Número de telefone do cliente não informado" };
      }
      
      const cleanPhone = appointment.clientPhone.replace(/\D/g, '');
      let formattedPhone = cleanPhone;
      
      // Only add 55 if we have a valid phone number and it doesn't start with 55
      if (cleanPhone && cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
        formattedPhone = '55' + cleanPhone;
      }
      
      // Validate phone number format
      if (!formattedPhone || formattedPhone.length < 12) {
        return { success: false, message: "Número de telefone inválido ou não informado" };
      }

      // Get Evolution API settings from existing global settings
      const evolutionApiUrl = settings?.evolutionApiUrl || whatsappInstance.apiUrl;
      const apiKey = settings?.evolutionApiGlobalKey || whatsappInstance.apiKey;

      if (!evolutionApiUrl || !apiKey) {
        return { success: false, message: "Configuração da API do WhatsApp não encontrada nas configurações globais" };
      }

      console.log('=== SENDING REVIEW INVITATION DEBUG ===');
      console.log('Evolution API URL:', evolutionApiUrl ? '[CONFIGURED]' : 'not configured');
      console.log('Instance Name:', whatsappInstance.instanceName);
      console.log('Formatted Phone:', formattedPhone);
      console.log('API Key configured:', !!apiKey);
      console.log('Global settings evolutionApiUrl:', settings?.evolutionApiUrl ? '[CONFIGURED]' : 'not configured');
      console.log('Global settings apiKey:', !!settings?.evolutionApiGlobalKey);
      console.log('WhatsApp instance apiUrl:', whatsappInstance.apiUrl ? '[CONFIGURED]' : 'not configured');
      console.log('WhatsApp instance apiKey:', !!whatsappInstance.apiKey);

      // Evolution API URL should NOT include /api/ prefix for message endpoints
      const baseUrl = evolutionApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      const whatsappApiUrl = `${baseUrl}/message/sendText/${whatsappInstance.instanceName}`;
      
      console.log('=== EVOLUTION API URL DETAILS ===');
      console.log('Original URL:', evolutionApiUrl ? '[HIDDEN]' : 'not configured');
      console.log('Base URL:', '[HIDDEN]');
      console.log('Full WhatsApp URL:', '[HIDDEN]');

      console.log('📡 Sending WhatsApp message...');
      console.log('URL:', '[HIDDEN]');
      console.log('Headers:', {
        'Content-Type': 'application/json',
        'apikey': apiKey ? 'configured' : 'missing'
      });
      console.log('Payload:', {
        number: formattedPhone,
        text: message.substring(0, 100) + '...'
      });

      const response = await fetch(whatsappApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey || ''
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message
        })
      });

      console.log('Response status:', response.status);
      
      let responseData;
      const responseText = await response.text();
      
      try {
        responseData = JSON.parse(responseText);
        console.log('Response data:', responseData);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON. Response text:', responseText.substring(0, 500));
        console.error('Parse error:', parseError);
        
        // More specific error messages based on response
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
          return { success: false, message: "Evolution API retornou página HTML - verifique URL da API nas configurações globais" };
        } else if (response.status === 401) {
          return { success: false, message: "Chave da API inválida - verifique a chave global da Evolution API" };
        } else if (response.status === 404) {
          return { success: false, message: "Instância do WhatsApp não encontrada - verifique o nome da instância" };
        } else {
          return { success: false, message: `Erro de comunicação com Evolution API (Status: ${response.status})` };
        }
      }

      if (response.ok && responseData.key) {
        console.log('✅ Review invitation sent successfully!');
        return { success: true, message: "Convite de avaliação enviado com sucesso!" };
      } else {
        console.error('❌ Error sending review invitation:', responseData);
        return { success: false, message: `Erro ao enviar mensagem: ${responseData.message || 'Erro desconhecido'}` };
      }

    } catch (error: any) {
      console.error("Error sending review invitation:", error);
      return { success: false, message: "Erro interno ao enviar convite de avaliação" };
    }
  }

  // Tasks operations
  async getTasks(companyId: number): Promise<Task[]> {
    try {
      return await db.select().from(tasks)
        .where(eq(tasks.companyId, companyId))
        .orderBy(desc(tasks.dueDate));
    } catch (error: any) {
      console.error("Error getting tasks:", error);
      return [];
    }
  }

  async getTask(id: number): Promise<Task | undefined> {
    try {
      const [task] = await db.select().from(tasks)
        .where(eq(tasks.id, id));
      return task;
    } catch (error: any) {
      console.error("Error getting task:", error);
      return undefined;
    }
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    try {
      await db.insert(tasks).values(taskData);
      
      // Get the last inserted task for this company
      const [task] = await db.select().from(tasks)
        .where(eq(tasks.companyId, taskData.companyId))
        .orderBy(desc(tasks.id))
        .limit(1);
      return task;
    } catch (error: any) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task> {
    try {
      const updateData = {
        ...taskData,
        updatedAt: new Date(),
      };
      
      await db.update(tasks)
        .set(updateData)
        .where(eq(tasks.id, id));
      
      const [task] = await db.select().from(tasks)
        .where(eq(tasks.id, id));
      return task;
    } catch (error: any) {
      console.error("Error updating task:", error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<void> {
    try {
      await db.delete(tasks).where(eq(tasks.id, id));
    } catch (error: any) {
      console.error("Error deleting task:", error);
      throw error;
    }
  }

  // Task reminder functions
  async createTaskReminder(reminder: InsertTaskReminder): Promise<TaskReminder> {
    await db.insert(taskReminders).values(reminder);
    const [created] = await db.select().from(taskReminders)
      .where(eq(taskReminders.taskId, reminder.taskId))
      .orderBy(desc(taskReminders.id))
      .limit(1);
    return created;
  }

  async getLastTaskReminder(taskId: number): Promise<TaskReminder | undefined> {
    const [reminder] = await db
      .select()
      .from(taskReminders)
      .where(eq(taskReminders.taskId, taskId))
      .orderBy(desc(taskReminders.sentAt))
      .limit(1);
    return reminder;
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByCompany(companyId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.companyId, companyId));
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async getWhatsAppInstancesByCompany(companyId: number): Promise<WhatsappInstance[]> {
    return await db.select().from(whatsappInstances).where(eq(whatsappInstances.companyId, companyId));
  }

  // Points management methods
  async getClientPointsByCompany(companyId: number): Promise<any[]> {
    return await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        totalPoints: sql`COALESCE(${clientPoints.totalPoints}, 0)`.as('totalPoints')
      })
      .from(clients)
      .leftJoin(clientPoints, eq(clients.id, clientPoints.clientId))
      .where(eq(clients.companyId, companyId));
  }

  async getClientPointsById(clientId: number, companyId: number): Promise<any> {
    const result = await db
      .select({
        totalPoints: sql`COALESCE(${clientPoints.totalPoints}, 0)`.as('totalPoints')
      })
      .from(clients)
      .leftJoin(clientPoints, and(eq(clients.id, clientPoints.clientId), eq(clientPoints.companyId, companyId)))
      .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId)));
    
    return result[0] || { totalPoints: 0 };
  }

  async updateClientPoints(clientId: number, pointsChange: number, description: string, companyId: number): Promise<any> {
    // First, ensure the client exists in the points table
    const [existingPoints] = await db
      .select()
      .from(clientPoints)
      .where(and(eq(clientPoints.clientId, clientId), eq(clientPoints.companyId, companyId)));

    if (!existingPoints) {
      // Create initial record
      await db.insert(clientPoints).values({
        clientId,
        companyId,
        totalPoints: Math.max(0, pointsChange),
      });
    } else {
      // Update existing record
      const newTotal = Math.max(0, existingPoints.totalPoints + pointsChange);
      await db
        .update(clientPoints)
        .set({ 
          totalPoints: newTotal,
          updatedAt: new Date()
        })
        .where(and(eq(clientPoints.clientId, clientId), eq(clientPoints.companyId, companyId)));
    }

    // Record the transaction in history
    await db.insert(pointsHistory).values({
      companyId,
      clientId,
      pointsChange,
      description,
    });

    return { success: true };
  }

  async getPointsCampaignsByCompany(companyId: number): Promise<any[]> {
    return await db
      .select({
        id: pointsCampaigns.id,
        name: pointsCampaigns.name,
        requiredPoints: pointsCampaigns.requiredPoints,
        rewardServiceId: pointsCampaigns.rewardServiceId,
        active: pointsCampaigns.active,
        rewardService: {
          name: services.name,
          price: services.price,
        }
      })
      .from(pointsCampaigns)
      .innerJoin(services, eq(pointsCampaigns.rewardServiceId, services.id))
      .where(eq(pointsCampaigns.companyId, companyId));
  }

  async createPointsCampaign(campaign: InsertPointsCampaign): Promise<PointsCampaign> {
    const result = await db.insert(pointsCampaigns).values(campaign);
    const [created] = await db.select().from(pointsCampaigns)
      .where(eq(pointsCampaigns.id, result.insertId))
      .limit(1);
    return created;
  }

  async updatePointsCampaign(id: number, updates: Partial<InsertPointsCampaign>): Promise<PointsCampaign> {
    await db
      .update(pointsCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pointsCampaigns.id, id));
    
    const [updated] = await db.select().from(pointsCampaigns)
      .where(eq(pointsCampaigns.id, id))
      .limit(1);
    return updated;
  }

  async deletePointsCampaign(id: number): Promise<void> {
    await db.delete(pointsCampaigns).where(eq(pointsCampaigns.id, id));
  }

  // Product operations
  async getProducts(companyId: number): Promise<Product[]> {
    return await db.select().from(products)
      .where(eq(products.companyId, companyId))
      .orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    // Insert the product
    await db.insert(products).values(productData);
    
    // Get the created product by querying the most recent one for this company
    const [product] = await db.select().from(products)
      .where(eq(products.companyId, productData.companyId))
      .orderBy(desc(products.id))
      .limit(1);
    
    if (!product) {
      throw new Error("Failed to create product");
    }
    
    return product;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product> {
    await db.update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(eq(products.id, id));
    
    const [product] = await db.select().from(products)
      .where(eq(products.id, id))
      .limit(1);
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Message Campaign methods
  async getMessageCampaigns(companyId: number): Promise<MessageCampaign[]> {
    return await db.select().from(messageCampaigns)
      .where(eq(messageCampaigns.companyId, companyId))
      .orderBy(desc(messageCampaigns.createdAt));
  }

  async createMessageCampaign(campaignData: InsertMessageCampaign): Promise<MessageCampaign> {
    await db.insert(messageCampaigns).values(campaignData);
    
    const [campaign] = await db.select().from(messageCampaigns)
      .where(eq(messageCampaigns.companyId, campaignData.companyId))
      .orderBy(desc(messageCampaigns.id))
      .limit(1);
    
    if (!campaign) {
      throw new Error("Failed to create message campaign");
    }
    
    return campaign;
  }

  async deleteMessageCampaign(id: number, companyId: number): Promise<void> {
    try {
      await db.delete(messageCampaigns)
        .where(and(
          eq(messageCampaigns.id, id),
          eq(messageCampaigns.companyId, companyId)
        ));
    } catch (error: any) {
      console.error("Error deleting message campaign:", error);
      throw error;
    }
  }

  // Coupon methods
  async getCoupons(): Promise<Coupon[]> {
    return await db.select().from(coupons);
  }

  async getCoupon(id: number): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id));
    return coupon;
  }

  async createCoupon(couponData: InsertCoupon): Promise<Coupon> {
    await db.insert(coupons).values(couponData);
    const [newCoupon] = await db.select().from(coupons).where(eq(coupons.code, couponData.code));
    if (!newCoupon) {
      throw new Error("Could not create coupon");
    }
    return newCoupon;
  }

  async updateCoupon(id: number, couponData: Partial<InsertCoupon>): Promise<Coupon> {
    await db.update(coupons).set(couponData).where(eq(coupons.id, id));
    const [updatedCoupon] = await db.select().from(coupons).where(eq(coupons.id, id));
    return updatedCoupon;
  }

  async deleteCoupon(id: number): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  async getCouponByCode(code: string, companyId: number): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons)
      .where(and(
        eq(coupons.code, code),
        eq(coupons.companyId, companyId),
        eq(coupons.isActive, true)
      ));
    return coupon;
  }

  // Subscription management methods
  async getCompanyById(companyId: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    return company;
  }

  async getPlanById(planId: number): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
    return plan;
  }

  async updateCompanyAsaasId(companyId: number, asaasCustomerId: string): Promise<void> {
    await db.execute(sql`
      UPDATE companies 
      SET asaas_customer_id = ${asaasCustomerId}
      WHERE id = ${companyId}
    `);
  }

  async updateCompanySubscription(companyId: number, subscriptionData: {
    planId: number;
    asaasSubscriptionId: string;
    subscriptionStatus: string;
    nextDueDate: Date;
    trialEndsAt: Date;
  }): Promise<void> {
    await db.execute(sql`
      UPDATE companies 
      SET 
        plan_id = ${subscriptionData.planId},
        asaas_subscription_id = ${subscriptionData.asaasSubscriptionId},
        subscription_status = ${subscriptionData.subscriptionStatus},
        subscription_next_due_date = ${subscriptionData.nextDueDate.toISOString().split('T')[0]},
        trial_ends_at = ${subscriptionData.trialEndsAt.toISOString().split('T')[0]},
        is_active = TRUE,
        updated_at = NOW()
      WHERE id = ${companyId}
    `);
  }
}

// Financial tables setup
async function ensureFinancialTables() {
  // Create financial categories table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS financial_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(20) NOT NULL,
      color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Create payment methods table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(20) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Create financial transactions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      description VARCHAR(500) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      type VARCHAR(20) NOT NULL,
      category_id INT NOT NULL,
      payment_method_id INT NOT NULL,
      date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES financial_categories(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE CASCADE
    )
  `);

  console.log("✅ Financial tables created/verified");

  // Add subscription columns to companies table
  try {
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS asaas_subscription_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
      ADD COLUMN IF NOT EXISTS subscription_next_due_date DATE,
      ADD COLUMN IF NOT EXISTS trial_ends_at DATE
    `);
    console.log("✅ Subscription columns added to companies table");
  } catch (error: any) {
    // Columns might already exist, which is fine
    if (!error.message?.includes('Duplicate column name')) {
      console.error("❌ Error adding subscription columns:", error);
    }
  }
}

export const storage = new DatabaseStorage();

// Initialize conversation tables on startup
(async () => {
  try {
    await ensureConversationTables();
    console.log("✅ Conversation tables initialized");
  } catch (error) {
    console.error("❌ Error initializing conversation tables:", error);
  }
})();

// Ensure favicon_url column exists in global_settings
(async () => {
  try {
    await db.execute(sql`
      ALTER TABLE global_settings 
      ADD COLUMN IF NOT EXISTS favicon_url VARCHAR(500) AFTER logo_url
    `);
    console.log("✅ Favicon column ensured in global_settings");
  } catch (error: any) {
    // Column might already exist, which is fine
    if (!error.message?.includes('Duplicate column name')) {
      console.error("❌ Error adding favicon column:", error);
    }
  }
})();

// Ensure permissions column exists in plans table
(async () => {
  try {
    await db.execute(sql`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS permissions JSON DEFAULT (JSON_OBJECT(
        'dashboard', true,
        'appointments', true,
        'services', true,
        'professionals', true,
        'clients', true,
        'reviews', false,
        'tasks', false,
        'pointsProgram', false,
        'loyalty', false,
        'inventory', false,
        'messages', false,
        'coupons', false,
        'financial', false,
        'reports', false,
        'settings', true
      ))
    `);
    
    // Update existing plans with default permissions if they don't have any
    await db.execute(sql`
      UPDATE plans SET permissions = JSON_OBJECT(
        'dashboard', true,
        'appointments', true,
        'services', true,
        'professionals', true,
        'clients', true,
        'reviews', false,
        'tasks', false,
        'pointsProgram', false,
        'loyalty', false,
        'inventory', false,
        'messages', false,
        'coupons', false,
        'financial', false,
        'reports', false,
        'settings', true
      ) WHERE permissions IS NULL
    `);
    
    console.log("✅ Permissions column ensured in plans");
  } catch (error: any) {
    // Column might already exist, which is fine
    if (!error.message?.includes('Duplicate column name')) {
      console.error("❌ Error adding permissions column:", error);
    }
  }
})();

// Ensure max_professionals column exists in plans table
(async () => {
  try {
    await db.execute(sql`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS max_professionals INT NOT NULL DEFAULT 1
    `);
    
    // Update existing plans with appropriate max_professionals values
    await db.execute(sql`
      UPDATE plans SET max_professionals = 
      CASE 
        WHEN LOWER(name) LIKE '%básico%' OR LOWER(name) LIKE '%basic%' THEN 1
        WHEN LOWER(name) LIKE '%premium%' OR LOWER(name) LIKE '%profissional%' THEN 5
        WHEN LOWER(name) LIKE '%enterprise%' OR LOWER(name) LIKE '%empresarial%' THEN 10
        ELSE 3
      END
      WHERE max_professionals = 1
    `);
    
    console.log("✅ Max professionals column ensured in plans");
  } catch (error: any) {
    // Column might already exist, which is fine
    if (!error.message?.includes('Duplicate column name')) {
      console.error("❌ Error adding max_professionals column:", error);
    }
  }
})();

// Ensure annual price column exists in plans table
(async () => {
  try {
    await db.execute(sql`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS annual_price DECIMAL(10,2) NULL AFTER price
    `);
    
    console.log("✅ Annual price column ensured in plans");
  } catch (error: any) {
    // Column might already exist, which is fine
    if (!error.message?.includes('Duplicate column name')) {
      console.error("❌ Error adding annual_price column:", error);
    }
  }
})();

// Ensure Stripe columns exist in plans table
(async () => {
  try {
    await db.execute(sql`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255)
    `);
    
    await db.execute(sql`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255)
    `);
    
    console.log("✅ Stripe columns ensured in plans table");
  } catch (error: any) {
    // Columns might already exist, which is fine
    if (!error.message?.includes('Duplicate column name')) {
      console.error("❌ Error adding Stripe columns:", error);
    }
  }
})();

// Ensure plan_id and is_active columns exist in companies table
(async () => {
  try {
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS plan_id INT
    `);
    
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
    `);
    
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS plan_status VARCHAR(50) DEFAULT 'inactive'
    `);
    
    console.log("✅ Company plan and status columns ensured");
  } catch (error: any) {
    // Columns might already exist, which is fine
    if (!error.message?.includes('Duplicate column name')) {
      console.error("❌ Error adding company columns:", error);
    }
  }
})();

// Initialize financial tables on startup
(async () => {
  try {
    await ensureFinancialTables();
  } catch (error) {
    console.error("❌ Error initializing financial tables:", error);
  }
})();

// Initialize loyalty tables
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS loyalty_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        condition_type VARCHAR(50) NOT NULL,
        condition_value INT NOT NULL,
        reward_type VARCHAR(50) NOT NULL,
        reward_value INT NOT NULL,
        reward_service_id INT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (reward_service_id) REFERENCES services(id) ON DELETE SET NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS loyalty_rewards_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        client_id INT NOT NULL,
        campaign_id INT NOT NULL,
        reward_type VARCHAR(50) NOT NULL,
        reward_value VARCHAR(255) NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES loyalty_campaigns(id) ON DELETE CASCADE
      )
    `);

    console.log("✅ Loyalty tables created/verified");
  } catch (error) {
    console.error("❌ Error creating loyalty tables:", error);
  }
})();

// Initialize products table
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        photo VARCHAR(500),
        description TEXT,
        purchase_price DECIMAL(10,2) NOT NULL,
        supplier_name VARCHAR(255),
        stock_quantity INT NOT NULL DEFAULT 0,
        alert_stock BOOLEAN DEFAULT FALSE,
        min_stock_level INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      )
    `);
    
    console.log("✅ Products table created/verified");
  } catch (error) {
    console.error("❌ Error creating products table:", error);
  }
})();

// Initialize message campaigns table
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS message_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        message TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        scheduled_date TIMESTAMP NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        target_type VARCHAR(20) NOT NULL,
        selected_clients JSON,
        sent_count INT DEFAULT 0,
        total_targets INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    // Fix existing table to support emojis
    try {
      await db.execute(sql`
        ALTER TABLE message_campaigns MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      await db.execute(sql`
        ALTER TABLE message_campaigns MODIFY COLUMN message TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
    } catch (alterError) {
      // Ignore if columns are already utf8mb4
    }
    
    console.log("✅ Message campaigns table created/verified");
  } catch (error) {
    console.error("❌ Error creating message campaigns table:", error);
  }
})();

// Loyalty Campaigns methods using SQL queries
export async function getLoyaltyCampaignsByCompany(companyId: number) {
  try {
    const result = await db.execute(sql`
      SELECT * FROM loyalty_campaigns 
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC
    `);
    return Array.isArray(result) ? result : [result];
  } catch (error) {
    console.error('Error getting loyalty campaigns:', error);
    throw error;
  }
}

export async function createLoyaltyCampaign(campaignData: any) {
  try {
    const result = await db.execute(sql`
      INSERT INTO loyalty_campaigns (
        company_id, name, condition_type, condition_value, 
        reward_type, reward_value, reward_service_id, active
      ) VALUES (
        ${campaignData.companyId}, ${campaignData.name}, ${campaignData.conditionType}, 
        ${campaignData.conditionValue}, ${campaignData.rewardType}, ${campaignData.rewardValue}, 
        ${campaignData.rewardServiceId || null}, ${campaignData.active || true}
      )
    `);
    
    // Get the created campaign
    const campaign = await db.execute(sql`
      SELECT * FROM loyalty_campaigns WHERE id = LAST_INSERT_ID()
    `);
    return (campaign as any)[0];
  } catch (error) {
    console.error('Error creating loyalty campaign:', error);
    throw error;
  }
}

export async function updateLoyaltyCampaign(id: number, updates: any, companyId: number) {
  try {
    // Build dynamic update query
    let updateQuery = 'UPDATE loyalty_campaigns SET ';
    const updateFields = [];
    
    if (updates.name !== undefined) {
      updateFields.push(`name = '${updates.name}'`);
    }
    if (updates.conditionType !== undefined) {
      updateFields.push(`condition_type = '${updates.conditionType}'`);
    }
    if (updates.conditionValue !== undefined) {
      updateFields.push(`condition_value = ${updates.conditionValue}`);
    }
    if (updates.rewardType !== undefined) {
      updateFields.push(`reward_type = '${updates.rewardType}'`);
    }
    if (updates.rewardValue !== undefined) {
      updateFields.push(`reward_value = ${updates.rewardValue}`);
    }
    if (updates.rewardServiceId !== undefined) {
      updateFields.push(`reward_service_id = ${updates.rewardServiceId || null}`);
    }
    if (updates.active !== undefined) {
      updateFields.push(`active = ${updates.active}`);
    }
    
    updateFields.push('updated_at = NOW()');
    updateQuery += updateFields.join(', ');
    updateQuery += ` WHERE id = ${id} AND company_id = ${companyId}`;
    
    await db.execute(sql.raw(updateQuery));
    
    // Get the updated campaign
    const result = await db.execute(sql`
      SELECT * FROM loyalty_campaigns WHERE id = ${id} AND company_id = ${companyId}
    `);
    return (result as any)[0];
  } catch (error) {
    console.error('Error updating loyalty campaign:', error);
    throw error;
  }
}

export async function toggleLoyaltyCampaign(id: number, active: boolean, companyId: number) {
  try {
    await db.execute(sql`
      UPDATE loyalty_campaigns 
      SET active = ${active}, updated_at = NOW()
      WHERE id = ${id} AND company_id = ${companyId}
    `);
  } catch (error) {
    console.error('Error toggling loyalty campaign:', error);
    throw error;
  }
}

export async function deleteLoyaltyCampaign(id: number, companyId: number) {
  try {
    console.log('Deleting campaign with ID:', id, 'for company:', companyId);
    
    if (!id || isNaN(id)) {
      throw new Error('Invalid campaign ID provided');
    }
    
    await db.execute(sql`
      DELETE FROM loyalty_campaigns 
      WHERE id = ${id} AND company_id = ${companyId}
    `);
  } catch (error) {
    console.error('Error deleting loyalty campaign:', error);
    throw error;
  }
}

export async function getLoyaltyRewardsHistory(companyId: number) {
  try {
    const result = await db.execute(sql`
      SELECT * FROM loyalty_rewards_history 
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC
    `);
    return result as any[];
  } catch (error) {
    console.error('Error getting loyalty rewards history:', error);
    throw error;
  }
}

// Initialize coupons table
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        discount_type ENUM('fixed', 'percentage') NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        min_order_value DECIMAL(10,2) DEFAULT 0,
        max_discount DECIMAL(10,2) DEFAULT NULL,
        usage_limit INT DEFAULT NULL,
        used_count INT DEFAULT 0,
        valid_until DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        UNIQUE KEY unique_company_code (company_id, code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Coupons table created/verified');
  } catch (error) {
    console.error('Error creating coupons table:', error);
  }
})();

// Ensure company_id column exists in coupons table
(async () => {
  try {
    // This is a bit of a hack for MySQL/PlanetScale to check if a column exists.
    // It will throw an error if the column doesn't exist, which we catch.
    await db.execute(sql`SELECT company_id FROM coupons LIMIT 1`);
    console.log("✅ company_id column already exists in coupons table.");
  } catch (error) {
    // If the error indicates the column is unknown, we add it.
    if (error.message.includes("Unknown column 'company_id'")) {
      console.log("company_id column not found in coupons table, adding it...");
      try {
        await db.execute(sql`
          ALTER TABLE coupons
          ADD COLUMN company_id INT NOT NULL AFTER id
        `);
        console.log("✅ company_id column added to coupons table.");
        
        // Add foreign key constraint
        await db.execute(sql`
          ALTER TABLE coupons
          ADD CONSTRAINT fk_coupon_company
          FOREIGN KEY (company_id) REFERENCES companies(id)
          ON DELETE CASCADE
        `);
        console.log("✅ Foreign key constraint added to coupons table.");
      } catch (migrationError) {
        console.error("❌ Error adding company_id column to coupons table:", migrationError);
      }
    } else {
      // For other errors, we just log them. The table might not exist yet.
      console.warn("Could not check for company_id column in coupons table. This might be okay if the table doesn't exist yet.", error.message);
    }
  }
})();

// Add tour system methods to DatabaseStorage class
Object.assign(storage, {
  // ===== TOUR SYSTEM METHODS =====

  async getTourSteps(): Promise<TourStep[]> {
    try {
      const steps = await db.select().from(tourSteps).orderBy(tourSteps.stepOrder);
      return steps;
    } catch (error) {
      console.error('Error fetching tour steps:', error);
      throw error;
    }
  },

  async getActiveTourSteps(): Promise<TourStep[]> {
    try {
      const steps = await db
        .select()
        .from(tourSteps)
        .where(eq(tourSteps.isActive, true))
        .orderBy(tourSteps.stepOrder);
      return steps;
    } catch (error) {
      console.error('Error fetching active tour steps:', error);
      throw error;
    }
  },

  async createTourStep(stepData: InsertTourStep): Promise<TourStep> {
    try {
      const result = await db.insert(tourSteps).values(stepData);
      const insertId = (result as any).insertId;
      
      // Fetch the created step
      const [createdStep] = await db.select().from(tourSteps).where(eq(tourSteps.id, insertId));
      return createdStep;
    } catch (error) {
      console.error('Error creating tour step:', error);
      throw error;
    }
  },

  async updateTourStep(stepId: number, stepData: Partial<InsertTourStep>): Promise<TourStep> {
    try {
      await db
        .update(tourSteps)
        .set(stepData)
        .where(eq(tourSteps.id, stepId));
      
      // Fetch the updated step
      const [updatedStep] = await db.select().from(tourSteps).where(eq(tourSteps.id, stepId));
      return updatedStep;
    } catch (error) {
      console.error('Error updating tour step:', error);
      throw error;
    }
  },

  async deleteTourStep(stepId: number): Promise<void> {
    try {
      await db.delete(tourSteps).where(eq(tourSteps.id, stepId));
    } catch (error) {
      console.error('Error deleting tour step:', error);
      throw error;
    }
  },

  async getCompanyTourProgress(companyId: number): Promise<CompanyTourProgress | null> {
    try {
      const [progress] = await db
        .select()
        .from(companyTourProgress)
        .where(eq(companyTourProgress.companyId, companyId));
      return progress || null;
    } catch (error) {
      console.error('Error fetching company tour progress:', error);
      throw error;
    }
  },

  async createCompanyTourProgress(progressData: InsertCompanyTourProgress): Promise<CompanyTourProgress> {
    try {
      const result = await db
        .insert(companyTourProgress)
        .values(progressData);
      
      // Get the inserted record
      const [newProgress] = await db
        .select()
        .from(companyTourProgress)
        .where(eq(companyTourProgress.companyId, progressData.companyId))
        .orderBy(desc(companyTourProgress.id))
        .limit(1);
      
      return newProgress;
    } catch (error) {
      console.error('Error creating company tour progress:', error);
      throw error;
    }
  },

  async updateCompanyTourProgress(progressId: number, progressData: Partial<InsertCompanyTourProgress>): Promise<CompanyTourProgress> {
    try {
      await db
        .update(companyTourProgress)
        .set(progressData)
        .where(eq(companyTourProgress.id, progressId));
        
      // Get the updated record
      const [updatedProgress] = await db
        .select()
        .from(companyTourProgress)
        .where(eq(companyTourProgress.id, progressId));
      return updatedProgress;
    } catch (error) {
      console.error('Error updating company tour progress:', error);
      throw error;
    }
  },

  // Test reminder function for companies
  async testReminderFunction(companyId: number, customTestPhone?: string) {
    try {
      console.log(`🧪 Testing reminder function for company ${companyId}`);
      
      // Check if company has WhatsApp instance configured
      console.log(`🔍 Checking WhatsApp instance for company ${companyId}`);
      const [whatsappInstance] = await db.select().from(whatsappInstances)
        .where(eq(whatsappInstances.companyId, companyId));

      console.log(`📱 WhatsApp instance found:`, !!whatsappInstance);
      if (!whatsappInstance) {
        return {
          success: false,
          message: "Nenhuma instância do WhatsApp configurada para esta empresa"
        };
      }

      // Check if there are any active reminder settings
      console.log(`🔍 Checking active reminder settings for company ${companyId}`);
      const activeReminders = await db.select().from(reminderSettings)
        .where(and(
          eq(reminderSettings.companyId, companyId),
          eq(reminderSettings.isActive, true)
        ));

      console.log(`📋 Active reminders found: ${activeReminders.length}`);
      if (activeReminders.length === 0) {
        return {
          success: false,
          message: "Nenhum lembrete ativo configurado para esta empresa"
        };
      }

      // Get global settings for Evolution API
      console.log(`🌐 Fetching global settings for Evolution API`);
      const [settings] = await db.select().from(globalSettings).limit(1);
      
      console.log(`⚙️ Global settings found:`, {
        hasUrl: !!settings?.evolutionApiUrl,
        hasKey: !!settings?.evolutionApiGlobalKey
      });
      
      if (!settings?.evolutionApiUrl || !settings?.evolutionApiGlobalKey) {
        return {
          success: false,
          message: "Configurações globais da Evolution API não encontradas"
        };
      }

      // Use custom test phone if provided, otherwise default test number
      const defaultTestPhone = "5511999999999";
      let testPhone = customTestPhone || defaultTestPhone;
      
      // Clean and format the phone number if custom phone provided
      if (customTestPhone) {
        testPhone = customTestPhone.replace(/\D/g, '');
        if (testPhone && testPhone.length >= 10 && !testPhone.startsWith('55')) {
          testPhone = '55' + testPhone;
        }
      }
      
      const testMessage = customTestPhone ? 
        `🧪 Teste de lembrete para ${customTestPhone} - sistema funcionando corretamente!` :
        "🧪 Teste de lembrete - sistema funcionando corretamente!";

      // Evolution API URL should NOT include /api/ prefix for message endpoints
      const correctedApiUrl = settings.evolutionApiUrl?.replace(/\/api\/?$/, '').replace(/\/$/, '');

      console.log(`🌐 Making API call to Evolution API`);
      console.log(`📡 URL: [HIDDEN]/message/sendText/${whatsappInstance.instanceName}`);
      console.log(`📱 Instance: ${whatsappInstance.instanceName}`);
      console.log(`📞 Test phone: ${testPhone}`);

      const requestPayload = {
        number: testPhone,
        text: testMessage
      };

      console.log(`📦 Request payload:`, JSON.stringify(requestPayload, null, 2));

      const response = await fetch(`${correctedApiUrl}/message/sendText/${whatsappInstance.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': settings.evolutionApiGlobalKey!
        },
        body: JSON.stringify(requestPayload)
      });

      console.log(`📊 Response status: ${response.status}`);
      console.log(`📊 Response ok: ${response.ok}`);

      const responseText = await response.text();
      console.log(`📄 Raw response text: ${responseText.substring(0, 500)}`);

      let result;
      try {
        result = JSON.parse(responseText);
        console.log(`📋 Parsed result:`, result);
      } catch (parseError) {
        console.error(`❌ Failed to parse response as JSON:`, parseError);
        return {
          success: false,
          message: `Erro ao processar resposta da Evolution API: ${responseText.substring(0, 200)}`,
          details: { responseText, status: response.status }
        };
      }

      if (response.ok) {
        console.log(`✅ Test successful! Status: ${response.status}`);
        return {
          success: true,
          message: "Teste de lembrete realizado com sucesso! Sistema funcionando corretamente.",
          details: {
            instanceName: whatsappInstance.instanceName,
            activeReminders: activeReminders.length,
            testMessage: testMessage,
            apiResponse: result
          }
        };
      } else {
        console.error(`❌ API Error - Status: ${response.status}`);
        console.error(`❌ Error details:`, result);
        
        // Check if the error is due to test number not existing in WhatsApp
        if (result?.response?.message && Array.isArray(result.response.message)) {
          const errorMessage = result.response.message[0];
          if (errorMessage && errorMessage.exists === false && errorMessage.number === testPhone) {
            return {
              success: true,
              message: "✅ Integração Evolution API funcionando! O número de teste não existe no WhatsApp, mas a conexão está correta.",
              details: { 
                status: response.status, 
                testPhone: testPhone,
                instanceName: whatsappInstance.instanceName,
                note: "A API está respondendo corretamente. Use um número real para testes completos."
              }
            };
          }
        }
        
        return {
          success: false,
          message: `Erro Evolution API (${response.status}): ${result?.message || result?.error || 'Resposta inválida da API'}`,
          details: { 
            status: response.status, 
            response: result,
            url: `${correctedApiUrl}/message/sendText/${whatsappInstance.instanceName}`,
            instanceName: whatsappInstance.instanceName
          }
        };
      }

    } catch (error: any) {
      console.error('❌ Critical error in testReminderFunction:', error);
      console.error('❌ Error stack:', error.stack);
      return {
        success: false,
        message: `Erro crítico no sistema: ${error.message || 'Erro desconhecido'}`,
        details: { 
          error: error.message,
          stack: error.stack,
          type: error.name
        }
      };
    }
  },

  // ===== PROFESSIONAL AUTHENTICATION FUNCTIONS =====

  async getProfessionalByEmail(email: string) {
    try {
      const result = await db.select({
        id: professionals.id,
        name: professionals.name,
        email: professionals.email,
        companyId: professionals.companyId,
        password: professionals.password,
        active: professionals.active,
        createdAt: professionals.createdAt,
        updatedAt: professionals.updatedAt
      })
        .from(professionals)
        .where(eq(professionals.email, email))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error getting professional by email:", error);
      throw error;
    }
  },



  async setProfessionalPassword(professionalId: number, hashedPassword: string) {
    try {
      await db.update(professionals)
        .set({ password: hashedPassword })
        .where(eq(professionals.id, professionalId));
      
      return true;
    } catch (error) {
      console.error("Error setting professional password:", error);
      throw error;
    }
  },

  // ===== AFFILIATE METHODS (using direct SQL) =====
  
  async createAffiliate(data: any): Promise<any> {
    try {
      // Generate unique affiliate code
      const affiliateCode = 'AFF' + Date.now().toString().slice(-6);
      
      const [result] = await pool.execute(
        `INSERT INTO affiliates (name, email, password, phone, affiliate_code, commission_rate, is_active, total_earnings, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          data.name,
          data.email,
          data.password,
          data.phone,
          affiliateCode,
          data.commissionRate || 10.00,
          1,
          0.00
        ]
      );
      
      const insertId = (result as any).insertId;
      const [rows] = await pool.execute(
        'SELECT * FROM affiliates WHERE id = ?',
        [insertId]
      );
      return (rows as any[])[0];
    } catch (error) {
      console.error("Error creating affiliate:", error);
      throw error;
    }
  },

  async getAffiliateByEmail(email: string): Promise<Affiliate | undefined> {
    try {
      const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.email, email));
      return affiliate;
    } catch (error) {
      console.error("Error getting affiliate by email:", error);
      throw error;
    }
  },

  async getAffiliateByCode(code: string): Promise<Affiliate | undefined> {
    try {
      const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.affiliateCode, code));
      return affiliate;
    } catch (error) {
      console.error("Error getting affiliate by code:", error);
      throw error;
    }
  },

  async getAffiliate(id: number): Promise<Affiliate | undefined> {
    try {
      const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, id));
      return affiliate;
    } catch (error) {
      console.error("Error getting affiliate:", error);
      throw error;
    }
  },

  async updateAffiliate(id: number, data: Partial<InsertAffiliate>): Promise<Affiliate> {
    try {
      await db.update(affiliates).set(data).where(eq(affiliates.id, id));
      const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, id));
      return affiliate;
    } catch (error) {
      console.error("Error updating affiliate:", error);
      throw error;
    }
  },

  async createAffiliateReferral(data: InsertAffiliateReferral): Promise<AffiliateReferral> {
    try {
      const result = await db.insert(affiliateReferrals).values(data);
      const [referral] = await db.select().from(affiliateReferrals).where(eq(affiliateReferrals.id, result.insertId));
      return referral;
    } catch (error) {
      console.error("Error creating affiliate referral:", error);
      throw error;
    }
  },

  async getAffiliateReferrals(affiliateId: number): Promise<any[]> {
    try {
      const results = await db
        .select({
          id: affiliateReferrals.id,
          companyId: affiliateReferrals.companyId,
          planId: affiliateReferrals.planId,
          status: affiliateReferrals.status,
          commissionPaid: affiliateReferrals.commissionPaid,
          monthlyCommission: affiliateReferrals.monthlyCommission,
          referralDate: affiliateReferrals.referralDate,
          activationDate: affiliateReferrals.activationDate,
          lastPaymentDate: affiliateReferrals.lastPaymentDate,
          companyName: companies.name,
          planName: plans.name,
          planPrice: plans.monthlyPrice,
        })
        .from(affiliateReferrals)
        .leftJoin(companies, eq(affiliateReferrals.companyId, companies.id))
        .leftJoin(plans, eq(affiliateReferrals.planId, plans.id))
        .where(eq(affiliateReferrals.affiliateId, affiliateId));
      
      return results;
    } catch (error) {
      console.error("Error getting affiliate referrals:", error);
      throw error;
    }
  },

  async updateAffiliateReferral(id: number, data: Partial<InsertAffiliateReferral>): Promise<AffiliateReferral> {
    try {
      await db.update(affiliateReferrals).set(data).where(eq(affiliateReferrals.id, id));
      const [referral] = await db.select().from(affiliateReferrals).where(eq(affiliateReferrals.id, id));
      return referral;
    } catch (error) {
      console.error("Error updating affiliate referral:", error);
      throw error;
    }
  },

  async createAffiliateCommission(data: InsertAffiliateCommission): Promise<AffiliateCommission> {
    try {
      const result = await db.insert(affiliateCommissions).values(data);
      const [commission] = await db.select().from(affiliateCommissions).where(eq(affiliateCommissions.id, result.insertId));
      return commission;
    } catch (error) {
      console.error("Error creating affiliate commission:", error);
      throw error;
    }
  },

  // Affiliate operations using direct SQL queries
  async getAffiliate(id: number): Promise<any | undefined> {
    try {
      const [rows] = await pool.execute(
        'SELECT id, name, email, password, phone, affiliate_code, commission_rate, is_active, total_earnings, created_at, updated_at FROM affiliates WHERE id = ?',
        [id]
      );
      const affiliate = (rows as any[])[0];
      
      if (affiliate) {
        // Map database column names to expected frontend field names
        affiliate.isActive = affiliate.is_active;
        affiliate.affiliateCode = affiliate.affiliate_code;
        affiliate.commissionRate = affiliate.commission_rate;
        affiliate.totalEarnings = affiliate.total_earnings;
        affiliate.createdAt = affiliate.created_at;
        affiliate.updatedAt = affiliate.updated_at;
      }
      
      return affiliate;
    } catch (error) {
      console.error("Error getting affiliate:", error);
      throw error;
    }
  },

  async getAffiliateByEmail(email: string): Promise<any | undefined> {
    try {
      const [rows] = await pool.execute(
        'SELECT id, name, email, password, phone, affiliate_code, commission_rate, is_active, total_earnings, created_at, updated_at FROM affiliates WHERE email = ?',
        [email]
      );
      const affiliate = (rows as any[])[0];
      
      if (affiliate) {
        console.log("Raw affiliate data from DB:", affiliate);
        // Map is_active to isActive for consistency
        affiliate.isActive = affiliate.is_active;
        affiliate.affiliateCode = affiliate.affiliate_code;
        affiliate.commissionRate = affiliate.commission_rate;
        affiliate.totalEarnings = affiliate.total_earnings;
        affiliate.createdAt = affiliate.created_at;
        affiliate.updatedAt = affiliate.updated_at;
      }
      
      return affiliate;
    } catch (error) {
      console.error("Error getting affiliate by email:", error);
      throw error;
    }
  },

  async getAffiliateByCode(code: string): Promise<any | undefined> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM affiliates WHERE affiliate_code = ?',
        [code]
      );
      return (rows as any[])[0];
    } catch (error) {
      console.error("Error getting affiliate by code:", error);
      throw error;
    }
  },

  async createAffiliate(affiliateData: any): Promise<any> {
    try {
      // Generate unique affiliate code
      const affiliateCode = 'AFF' + Date.now().toString().slice(-6);
      
      const [result] = await pool.execute(
        `INSERT INTO affiliates (name, email, password, phone, affiliate_code, commission_rate, is_active, total_earnings, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          affiliateData.name,
          affiliateData.email,
          affiliateData.password,
          affiliateData.phone,
          affiliateCode,
          affiliateData.commissionRate || 10.00,
          1,
          0.00
        ]
      );
      
      const insertId = (result as any).insertId;
      const [rows] = await pool.execute(
        'SELECT * FROM affiliates WHERE id = ?',
        [insertId]
      );
      return (rows as any[])[0];
    } catch (error) {
      console.error("Error creating affiliate:", error);
      throw error;
    }
  },

  async updateAffiliate(id: number, affiliateData: any): Promise<any> {
    try {
      await pool.execute(
        'UPDATE affiliates SET name = ?, email = ?, phone = ?, updated_at = NOW() WHERE id = ?',
        [affiliateData.name, affiliateData.email, affiliateData.phone, id]
      );
      
      const [rows] = await pool.execute(
        'SELECT * FROM affiliates WHERE id = ?',
        [id]
      );
      return (rows as any[])[0];
    } catch (error) {
      console.error("Error updating affiliate:", error);
      throw error;
    }
  },

  async getAffiliateReferrals(affiliateId: number): Promise<any[]> {
    try {
      const [rows] = await pool.execute(
        `SELECT ar.*, c.fantasy_name as companyName, p.name as planName, p.price as planPrice
         FROM affiliate_referrals ar
         LEFT JOIN companies c ON ar.company_id = c.id
         LEFT JOIN plans p ON ar.plan_id = p.id
         WHERE ar.affiliate_id = ?
         ORDER BY ar.created_at DESC`,
        [affiliateId]
      );
      return rows as any[];
    } catch (error) {
      console.error("Error getting affiliate referrals:", error);
      throw error;
    }
  },

  async getAffiliateCommissions(affiliateId: number): Promise<any[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM affiliate_commissions WHERE affiliate_id = ? ORDER BY created_at DESC',
        [affiliateId]
      );
      return rows as any[];
    } catch (error) {
      console.error("Error getting affiliate commissions:", error);
      throw error;
    }
  },

  async createAffiliateReferral(referralData: any): Promise<any> {
    try {
      const [result] = await pool.execute(
        `INSERT INTO affiliate_referrals (affiliate_id, company_id, plan_id, status, commission_paid, monthly_commission, referral_date, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [
          referralData.affiliateId,
          referralData.companyId,
          referralData.planId,
          referralData.status || 'pending',
          referralData.commissionPaid || 0.00,
          referralData.monthlyCommission || 0.00
        ]
      );
      
      const insertId = (result as any).insertId;
      const [rows] = await pool.execute(
        'SELECT * FROM affiliate_referrals WHERE id = ?',
        [insertId]
      );
      return (rows as any[])[0];
    } catch (error) {
      console.error("Error creating affiliate referral:", error);
      throw error;
    }
  }
});
