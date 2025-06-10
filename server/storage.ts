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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Helper function to create conversation and message tables
export async function ensureConversationTables() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        whatsapp_instance_id INT NOT NULL,
        phone_number VARCHAR(50) NOT NULL,
        contact_name VARCHAR(255),
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_company_phone (company_id, phone_number),
        INDEX idx_instance_phone (whatsapp_instance_id, phone_number)
      )
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        role ENUM('user', 'assistant') NOT NULL,
        content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        message_id VARCHAR(255),
        message_type VARCHAR(50),
        delivered BOOLEAN DEFAULT false,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_conversation (conversation_id),
        INDEX idx_timestamp (timestamp)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    console.log("✅ Conversation and message tables created/verified");
  } catch (error) {
    console.error("Error creating conversation tables:", error);
  }
}

export interface IStorage {
  // Admin operations
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(id: number, admin: Partial<InsertAdmin>): Promise<Admin>;
  
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
  createProfessional(professional: InsertProfessional): Promise<Professional>;
  updateProfessional(id: number, professional: Partial<InsertProfessional>): Promise<Professional>;
  deleteProfessional(id: number): Promise<void>;
  
  // Appointments operations
  getAppointmentsByCompany(companyId: number, month?: string): Promise<Appointment[]>;
  getAppointmentsByClient(clientId: number, companyId: number): Promise<any[]>;
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
}

export class DatabaseStorage implements IStorage {
  // Admin operations
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
    await db.insert(admins).values(adminData);
    const [admin] = await db.select().from(admins).where(eq(admins.username, adminData.username));
    return admin;
  }

  async updateAdmin(id: number, adminData: Partial<InsertAdmin>): Promise<Admin> {
    await db.update(admins).set(adminData).where(eq(admins.id, id));
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
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
    const [company] = await db.select().from(companies).where(eq(companies.email, email));
    return company;
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
    return await db.select().from(plans).orderBy(desc(plans.createdAt));
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async createPlan(planData: InsertPlan): Promise<Plan> {
    await db.insert(plans).values(planData);
    const [plan] = await db.select().from(plans).where(eq(plans.name, planData.name));
    return plan;
  }

  async updatePlan(id: number, planData: Partial<InsertPlan>): Promise<Plan> {
    await db.update(plans).set(planData).where(eq(plans.id, id));
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
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
    
    // Convert numeric fields to strings for database storage
    const processedData = { ...settingsData };
    if (typeof processedData.openaiTemperature === 'number') {
      (processedData as any).openaiTemperature = processedData.openaiTemperature.toString();
    }
    
    if (existingSettings) {
      await db.update(globalSettings).set(processedData as any).where(eq(globalSettings.id, existingSettings.id));
      const [updatedSettings] = await db.select().from(globalSettings).where(eq(globalSettings.id, existingSettings.id));
      return updatedSettings;
    } else {
      await db.insert(globalSettings).values(processedData as any);
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
      await db
        .update(conversations)
        .set({ ...conversationData, updatedAt: new Date() })
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
      
      await db
        .insert(messages)
        .values(messageData);
      
      // Get the created message by timestamp and conversation
      const [message] = await db.select().from(messages)
        .where(
          and(
            eq(messages.conversationId, messageData.conversationId),
            eq(messages.content, messageData.content),
            eq(messages.role, messageData.role)
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

  // Appointments operations
  async getAppointmentsByCompany(companyId: number, month?: string): Promise<Appointment[]> {
    try {
      let query = db.select({
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
      .where(eq(appointments.companyId, companyId));
      
      return await query.orderBy(desc(appointments.appointmentDate));
    } catch (error: any) {
      console.error("Error getting appointments:", error);
      return [];
    }
  }

  async getAppointmentsByClient(clientId: number, companyId: number): Promise<any[]> {
    try {
      // First get the client's phone number
      const clientResult = await db.execute(`
        SELECT phone FROM clients WHERE id = ${clientId} AND company_id = ${companyId}
      `);
      
      if (!clientResult || clientResult.length === 0) {
        console.log(`No client found with id ${clientId}`);
        return [];
      }
      
      const clientPhone = (clientResult[0] as any).phone;
      console.log(`Looking for appointments for client phone: ${clientPhone}`);
      
      // Then get appointments for that phone number
      const results = await db.execute(`
        SELECT 
          a.id,
          a.appointment_date as appointmentDate,
          a.appointment_time as appointmentTime,
          a.total_price as price,
          a.notes,
          a.client_name as clientName,
          a.client_phone as clientPhone,
          s.name as serviceName,
          p.name as professionalName,
          st.name as statusName,
          st.color as statusColor
        FROM appointments a
        LEFT JOIN services s ON a.service_id = s.id
        LEFT JOIN professionals p ON a.professional_id = p.id
        LEFT JOIN status st ON a.status = st.id
        WHERE a.client_phone = '${clientPhone}' AND a.company_id = ${companyId}
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `);
      
      console.log(`Found ${results.length} appointments for client ${clientId}`);
      return results as any[];
    } catch (error: any) {
      console.error("Error getting appointments by client:", error);
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
      await db.update(appointments)
        .set({ ...appointmentData, updatedAt: new Date() })
        .where(eq(appointments.id, id));
      
      const [appointment] = await db.select().from(appointments)
        .where(eq(appointments.id, id));
      return appointment;
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

        const response = await fetch(`${evolutionApiUrl}/message/sendText/${whatsappInstance.instanceName}`, {
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
