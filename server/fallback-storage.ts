import {
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
import { IStorage } from "./storage";

// In-memory storage for when database is not available
class FallbackStorage implements IStorage {
  private admins: Admin[] = [];
  private companies: Company[] = [];
  private plans: Plan[] = [];
  private globalSettings: GlobalSettings | undefined;
  private whatsappInstances: WhatsappInstance[] = [];
  private conversations: Conversation[] = [];
  private messages: Message[] = [];
  private services: Service[] = [];
  private professionals: Professional[] = [];
  private appointments: Appointment[] = [];
  private statuses: Status[] = [];
  private clients: Client[] = [];
  private nextId = 1;

  constructor() {
    // Initialize with demo admin
    this.admins.push({
      id: 1,
      username: 'admin',
      email: 'admin@sistema.com',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj1yYyDLxTLm', // admin123
      firstName: 'Administrador',
      lastName: 'Sistema',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Initialize with default global settings
    this.globalSettings = {
      id: 1,
      systemName: 'AdminPro',
      logoUrl: null,
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
      evolutionApiUrl: null,
      evolutionApiGlobalKey: null,
      openaiApiKey: null,
      openaiModel: 'gpt-4o',
      openaiTemperature: '0.70',
      openaiMaxTokens: 4000,
      updatedAt: new Date(),
    };
  }

  // Admin operations
  async getAdmin(id: number): Promise<Admin | undefined> {
    return this.admins.find(admin => admin.id === id);
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    return this.admins.find(admin => admin.username === username);
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    return this.admins.find(admin => admin.email === email);
  }

  async createAdmin(adminData: InsertAdmin): Promise<Admin> {
    const admin: Admin = {
      id: this.nextId++,
      ...adminData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.admins.push(admin);
    return admin;
  }

  async updateAdmin(id: number, adminData: Partial<InsertAdmin>): Promise<Admin> {
    const index = this.admins.findIndex(admin => admin.id === id);
    if (index === -1) throw new Error('Admin not found');
    
    this.admins[index] = {
      ...this.admins[index],
      ...adminData,
      updatedAt: new Date(),
    };
    return this.admins[index];
  }

  // Company operations
  async getCompanies(): Promise<Company[]> {
    return [...this.companies];
  }

  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.find(company => company.id === id);
  }

  async getCompanyByEmail(email: string): Promise<Company | undefined> {
    return this.companies.find(company => company.email === email);
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    const company: Company = {
      id: this.nextId++,
      ...companyData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.companies.push(company);
    return company;
  }

  async updateCompany(id: number, companyData: Partial<InsertCompany>): Promise<Company> {
    const index = this.companies.findIndex(company => company.id === id);
    if (index === -1) throw new Error('Company not found');
    
    this.companies[index] = {
      ...this.companies[index],
      ...companyData,
      updatedAt: new Date(),
    };
    return this.companies[index];
  }

  async deleteCompany(id: number): Promise<void> {
    const index = this.companies.findIndex(company => company.id === id);
    if (index !== -1) {
      this.companies.splice(index, 1);
    }
  }

  // Plan operations
  async getPlans(): Promise<Plan[]> {
    return [...this.plans];
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    return this.plans.find(plan => plan.id === id);
  }

  async createPlan(planData: InsertPlan): Promise<Plan> {
    const plan: Plan = {
      id: this.nextId++,
      ...planData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.plans.push(plan);
    return plan;
  }

  async updatePlan(id: number, planData: Partial<InsertPlan>): Promise<Plan> {
    const index = this.plans.findIndex(plan => plan.id === id);
    if (index === -1) throw new Error('Plan not found');
    
    this.plans[index] = {
      ...this.plans[index],
      ...planData,
      updatedAt: new Date(),
    };
    return this.plans[index];
  }

  async deletePlan(id: number): Promise<void> {
    const index = this.plans.findIndex(plan => plan.id === id);
    if (index !== -1) {
      this.plans.splice(index, 1);
    }
  }

  // Global settings operations
  async getGlobalSettings(): Promise<GlobalSettings | undefined> {
    return this.globalSettings;
  }

  async updateGlobalSettings(settingsData: Partial<InsertGlobalSettings>): Promise<GlobalSettings> {
    if (!this.globalSettings) {
      this.globalSettings = {
        id: 1,
        systemName: 'AdminPro',
        logoUrl: null,
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        backgroundColor: '#f8fafc',
        textColor: '#1e293b',
        evolutionApiUrl: null,
        evolutionApiGlobalKey: null,
        openaiApiKey: null,
        openaiModel: 'gpt-4o',
        openaiTemperature: '0.70',
        openaiMaxTokens: 4000,
        updatedAt: new Date(),
      };
    }

    this.globalSettings = {
      ...this.globalSettings,
      ...settingsData,
      updatedAt: new Date(),
    };
    return this.globalSettings;
  }

  // Stub implementations for other methods (return empty arrays/undefined for now)
  async getWhatsappInstancesByCompany(companyId: number): Promise<WhatsappInstance[]> {
    return this.whatsappInstances.filter(instance => instance.companyId === companyId);
  }

  async getWhatsappInstance(id: number): Promise<WhatsappInstance | undefined> {
    return this.whatsappInstances.find(instance => instance.id === id);
  }

  async getWhatsappInstanceByName(instanceName: string): Promise<WhatsappInstance | undefined> {
    return this.whatsappInstances.find(instance => instance.instanceName === instanceName);
  }

  async createWhatsappInstance(instanceData: InsertWhatsappInstance): Promise<WhatsappInstance> {
    const instance: WhatsappInstance = {
      id: this.nextId++,
      ...instanceData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.whatsappInstances.push(instance);
    return instance;
  }

  async updateWhatsappInstance(id: number, instanceData: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance> {
    const index = this.whatsappInstances.findIndex(instance => instance.id === id);
    if (index === -1) throw new Error('WhatsApp instance not found');
    
    this.whatsappInstances[index] = {
      ...this.whatsappInstances[index],
      ...instanceData,
      updatedAt: new Date(),
    };
    return this.whatsappInstances[index];
  }

  async deleteWhatsappInstance(id: number): Promise<void> {
    const index = this.whatsappInstances.findIndex(instance => instance.id === id);
    if (index !== -1) {
      this.whatsappInstances.splice(index, 1);
    }
  }

  // Minimal implementations for other required methods
  async getConversation(companyId: number, whatsappInstanceId: number, phoneNumber: string): Promise<Conversation | undefined> {
    return this.conversations.find(conv => 
      conv.companyId === companyId && 
      conv.whatsappInstanceId === whatsappInstanceId && 
      conv.phoneNumber === phoneNumber
    );
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const conversation: Conversation = {
      id: this.nextId++,
      ...conversationData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.push(conversation);
    return conversation;
  }

  async updateConversation(id: number, conversationData: Partial<InsertConversation>): Promise<Conversation> {
    const index = this.conversations.findIndex(conv => conv.id === id);
    if (index === -1) throw new Error('Conversation not found');
    
    this.conversations[index] = {
      ...this.conversations[index],
      ...conversationData,
      updatedAt: new Date(),
    };
    return this.conversations[index];
  }

  async getConversationsByCompany(companyId: number): Promise<Conversation[]> {
    return this.conversations.filter(conv => conv.companyId === companyId);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.nextId++,
      ...messageData,
      createdAt: new Date(),
    };
    this.messages.push(message);
    return message;
  }

  async getMessagesByConversation(conversationId: number, limit?: number): Promise<Message[]> {
    const messages = this.messages.filter(msg => msg.conversationId === conversationId);
    return limit ? messages.slice(-limit) : messages;
  }

  async getRecentMessages(conversationId: number, limit: number): Promise<Message[]> {
    return this.getMessagesByConversation(conversationId, limit);
  }

  async getServicesByCompany(companyId: number): Promise<Service[]> {
    return this.services.filter(service => service.companyId === companyId);
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.find(service => service.id === id);
  }

  async createService(serviceData: InsertService): Promise<Service> {
    const service: Service = {
      id: this.nextId++,
      ...serviceData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.services.push(service);
    return service;
  }

  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service> {
    const index = this.services.findIndex(service => service.id === id);
    if (index === -1) throw new Error('Service not found');
    
    this.services[index] = {
      ...this.services[index],
      ...serviceData,
      updatedAt: new Date(),
    };
    return this.services[index];
  }

  async deleteService(id: number): Promise<void> {
    const index = this.services.findIndex(service => service.id === id);
    if (index !== -1) {
      this.services.splice(index, 1);
    }
  }

  async getProfessionalsByCompany(companyId: number): Promise<Professional[]> {
    return this.professionals.filter(prof => prof.companyId === companyId);
  }

  async getProfessional(id: number): Promise<Professional | undefined> {
    return this.professionals.find(prof => prof.id === id);
  }

  async createProfessional(professionalData: InsertProfessional): Promise<Professional> {
    const professional: Professional = {
      id: this.nextId++,
      ...professionalData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.professionals.push(professional);
    return professional;
  }

  async updateProfessional(id: number, professionalData: Partial<InsertProfessional>): Promise<Professional> {
    const index = this.professionals.findIndex(prof => prof.id === id);
    if (index === -1) throw new Error('Professional not found');
    
    this.professionals[index] = {
      ...this.professionals[index],
      ...professionalData,
      updatedAt: new Date(),
    };
    return this.professionals[index];
  }

  async deleteProfessional(id: number): Promise<void> {
    const index = this.professionals.findIndex(prof => prof.id === id);
    if (index !== -1) {
      this.professionals.splice(index, 1);
    }
  }

  async getAppointmentsByCompany(companyId: number, month?: string): Promise<Appointment[]> {
    return this.appointments.filter(apt => apt.companyId === companyId);
  }

  async getAppointmentsByClient(clientId: number, companyId: number): Promise<any[]> {
    const client = this.clients.find(c => c.id === clientId && c.companyId === companyId);
    if (!client) return [];

    return this.appointments
      .filter(apt => apt.companyId === companyId && apt.clientPhone === client.phone)
      .map(apt => {
        const service = this.services.find(s => s.id === apt.serviceId);
        const professional = this.professionals.find(p => p.id === apt.professionalId);
        const status = this.statuses.find(st => st.id === parseInt(apt.status || '1'));
        
        return {
          id: apt.id,
          appointmentDate: apt.appointmentDate,
          appointmentTime: apt.appointmentTime,
          price: apt.totalPrice,
          notes: apt.notes,
          serviceName: service?.name || 'Serviço não encontrado',
          professionalName: professional?.name || 'Profissional não encontrado',
          statusName: status?.name || 'Pendente',
          statusColor: status?.color || '#A0A0A0'
        };
      })
      .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.find(apt => apt.id === id);
  }

  async createAppointment(appointmentData: InsertAppointment): Promise<Appointment> {
    const appointment: Appointment = {
      id: this.nextId++,
      ...appointmentData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.appointments.push(appointment);
    return appointment;
  }

  async updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment> {
    const index = this.appointments.findIndex(apt => apt.id === id);
    if (index === -1) throw new Error('Appointment not found');
    
    this.appointments[index] = {
      ...this.appointments[index],
      ...appointmentData,
      updatedAt: new Date(),
    };
    return this.appointments[index];
  }

  async deleteAppointment(id: number): Promise<void> {
    const index = this.appointments.findIndex(apt => apt.id === id);
    if (index !== -1) {
      this.appointments.splice(index, 1);
    }
  }

  async getStatus(): Promise<Status[]> {
    return [...this.statuses];
  }

  async getStatusById(id: number): Promise<Status | undefined> {
    return this.statuses.find(status => status.id === id);
  }

  async createStatus(statusData: InsertStatus): Promise<Status> {
    const status: Status = {
      id: this.nextId++,
      ...statusData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.statuses.push(status);
    return status;
  }

  async updateStatus(id: number, statusData: Partial<InsertStatus>): Promise<Status> {
    const index = this.statuses.findIndex(status => status.id === id);
    if (index === -1) throw new Error('Status not found');
    
    this.statuses[index] = {
      ...this.statuses[index],
      ...statusData,
      updatedAt: new Date(),
    };
    return this.statuses[index];
  }

  async deleteStatus(id: number): Promise<void> {
    const index = this.statuses.findIndex(status => status.id === id);
    if (index !== -1) {
      this.statuses.splice(index, 1);
    }
  }

  async getClientsByCompany(companyId: number): Promise<Client[]> {
    return this.clients.filter(client => client.companyId === companyId);
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.find(client => client.id === id);
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const client: Client = {
      id: this.nextId++,
      ...clientData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clients.push(client);
    return client;
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client> {
    const index = this.clients.findIndex(client => client.id === id);
    if (index === -1) throw new Error('Client not found');
    
    this.clients[index] = {
      ...this.clients[index],
      ...clientData,
      updatedAt: new Date(),
    };
    return this.clients[index];
  }

  async deleteClient(id: number): Promise<void> {
    const index = this.clients.findIndex(client => client.id === id);
    if (index !== -1) {
      this.clients.splice(index, 1);
    }
  }
}

export const fallbackStorage = new FallbackStorage();