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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

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
      await db.insert(appointments).values(appointmentData);
      const [appointment] = await db.select().from(appointments).where(
        and(
          eq(appointments.companyId, appointmentData.companyId),
          eq(appointments.clientPhone, appointmentData.clientPhone),
          eq(appointments.appointmentDate, appointmentData.appointmentDate),
          eq(appointments.appointmentTime, appointmentData.appointmentTime)
        )
      );
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
}

export const storage = new DatabaseStorage();
