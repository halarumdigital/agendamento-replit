import {
  admins,
  companies,
  plans,
  globalSettings,
  whatsappInstances,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
  createWhatsappInstance(instance: InsertWhatsappInstance): Promise<WhatsappInstance>;
  updateWhatsappInstance(id: number, instance: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance>;
  deleteWhatsappInstance(id: number): Promise<void>;
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

  // WhatsApp instances operations
  async getWhatsappInstancesByCompany(companyId: number): Promise<WhatsappInstance[]> {
    return await db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.companyId, companyId))
      .orderBy(desc(whatsappInstances.createdAt));
  }

  async getWhatsappInstance(id: number): Promise<WhatsappInstance | undefined> {
    const [instance] = await db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.id, id));
    return instance;
  }

  async createWhatsappInstance(instanceData: InsertWhatsappInstance): Promise<WhatsappInstance> {
    const [instance] = await db
      .insert(whatsappInstances)
      .values(instanceData)
      .returning();
    return instance;
  }

  async updateWhatsappInstance(id: number, instanceData: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance> {
    const [instance] = await db
      .update(whatsappInstances)
      .set({
        ...instanceData,
        updatedAt: new Date(),
      })
      .where(eq(whatsappInstances.id, id))
      .returning();
    return instance;
  }

  async deleteWhatsappInstance(id: number): Promise<void> {
    await db
      .delete(whatsappInstances)
      .where(eq(whatsappInstances.id, id));
  }
}

export const storage = new DatabaseStorage();
