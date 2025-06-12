import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for express-session
export const sessions = sqliteTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: text("sess", { mode: "json" }).notNull(),
  expire: integer("expire", { mode: "timestamp" }).notNull(),
});

// Admin users table
export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Companies table
export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fantasyName: text("fantasy_name").notNull(),
  document: text("document").notNull().unique(),
  address: text("address").notNull(),
  phone: text("phone"),
  zipCode: text("zip_code"),
  number: text("number"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  planId: integer("plan_id"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  aiAgentPrompt: text("ai_agent_prompt"),
  resetToken: text("reset_token"),
  resetTokenExpires: integer("reset_token_expires", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Subscription plans table
export const plans = sqliteTable("plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  freeDays: integer("free_days").notNull().default(0),
  price: real("price").notNull(),
  maxProfessionals: integer("max_professionals").notNull().default(1),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  permissions: text("permissions", { mode: "json" }).$type<{
    dashboard: boolean;
    appointments: boolean;
    services: boolean;
    professionals: boolean;
    clients: boolean;
    reviews: boolean;
    tasks: boolean;
    pointsProgram: boolean;
    loyalty: boolean;
    inventory: boolean;
    messages: boolean;
    coupons: boolean;
    financial: boolean;
    reports: boolean;
    settings: boolean;
  }>().default({
    dashboard: true,
    appointments: true,
    services: true,
    professionals: true,
    clients: true,
    reviews: false,
    tasks: false,
    pointsProgram: false,
    loyalty: false,
    inventory: false,
    messages: false,
    coupons: false,
    financial: false,
    reports: false,
    settings: true,
  }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Global settings table
export const globalSettings = sqliteTable("global_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  systemName: text("system_name").default("AdminPro"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: text("primary_color").notNull().default("#2563eb"),
  secondaryColor: text("secondary_color").notNull().default("#64748b"),
  backgroundColor: text("background_color").notNull().default("#f8fafc"),
  textColor: text("text_color").notNull().default("#1e293b"),
  evolutionApiUrl: text("evolution_api_url"),
  evolutionApiGlobalKey: text("evolution_api_global_key"),
  openaiApiKey: text("openai_api_key"),
  openaiModel: text("openai_model").notNull().default("gpt-4o"),
  openaiTemperature: text("openai_temperature").notNull().default("0.70"),
  openaiMaxTokens: text("openai_max_tokens").notNull().default("4000"),
  // SMTP Configuration
  smtpHost: text("smtp_host"),
  smtpPort: text("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smtpFromEmail: text("smtp_from_email"),
  smtpFromName: text("smtp_from_name"),
  smtpSecure: text("smtp_secure").default("tls"),
  customHtml: text("custom_html"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// WhatsApp instances table
export const whatsappInstances = sqliteTable("whatsapp_instances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  instanceName: text("instance_name").notNull(),
  status: text("status"),
  qrCode: text("qr_code"),
  webhook: text("webhook"),
  apiUrl: text("api_url"),
  apiKey: text("api_key"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Conversations table
export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  whatsappInstanceId: integer("whatsapp_instance_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  contactName: text("contact_name"),
  lastMessageAt: integer("last_message_at", { mode: "timestamp" }).default(Date.now()),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Messages table
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  messageId: text("message_id"),
  messageType: text("message_type"),
  delivered: integer("delivered", { mode: "boolean" }).default(false),
  timestamp: integer("timestamp", { mode: "timestamp" }).default(Date.now()),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
});

// Services table
export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  duration: integer("duration").notNull(),
  color: text("color").default("#3B82F6"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  points: integer("points").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Professionals table
export const professionals = sqliteTable("professionals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  specialties: text("specialties", { mode: "json" }).$type<string[]>(),
  workDays: text("work_days", { mode: "json" }),
  workStartTime: text("work_start_time"),
  workEndTime: text("work_end_time"),
  active: integer("active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Appointments table
export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  professionalId: integer("professional_id").notNull(),
  serviceId: integer("service_id").notNull(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  appointmentDate: text("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  duration: integer("duration").default(30),
  totalPrice: real("total_price").default(0.00),
  status: text("status").notNull().default("agendado"),
  notes: text("notes"),
  reminderSent: integer("reminder_sent", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Status table
export const status = sqliteTable("status", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
});

// Clients table
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  birthDate: text("birth_date"),
  notes: text("notes"),
  points: integer("points").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Birthday messages table
export const birthdayMessages = sqliteTable("birthday_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  message: text("message").notNull(),
  messageTemplate: text("message_template"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Birthday message history table
export const birthdayMessageHistory = sqliteTable("birthday_message_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  clientId: integer("client_id").notNull(),
  message: text("message").notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }).default(Date.now()),
});

// Reminder settings table
export const reminderSettings = sqliteTable("reminder_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  reminderType: text("reminder_type").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  messageTemplate: text("message_template").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Reminder history table
export const reminderHistory = sqliteTable("reminder_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  reminderType: text("reminder_type").notNull(),
  clientPhone: text("client_phone").notNull(),
  message: text("message").notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }).default(Date.now()),
  status: text("status").default("sent"),
  whatsappInstanceId: integer("whatsapp_instance_id"),
});

// Professional reviews table
export const professionalReviews = sqliteTable("professional_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  professionalId: integer("professional_id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  clientPhone: text("client_phone").notNull(),
  clientName: text("client_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
});

// Tasks table
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  dueDate: text("due_date"),
  assignedTo: integer("assigned_to"),
  createdBy: integer("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Point transactions table
export const pointTransactions = sqliteTable("point_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  clientId: integer("client_id").notNull(),
  appointmentId: integer("appointment_id"),
  points: integer("points").notNull(),
  type: text("type").notNull(), // 'earned' or 'redeemed'
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
});

// Inventory items table
export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("min_quantity").default(0),
  price: real("price"),
  category: text("category"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Coupons table
export const coupons = sqliteTable("coupons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  discountType: text("discount_type").notNull(), // 'percentage' or 'fixed'
  discountValue: real("discount_value").notNull(),
  minAmount: real("min_amount"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Financial records table
export const financialRecords = sqliteTable("financial_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  appointmentId: integer("appointment_id"),
  type: text("type").notNull(), // 'income' or 'expense'
  category: text("category"),
  description: text("description"),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  paymentMethod: text("payment_method"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(Date.now()),
});

// Relations
export const companiesRelations = relations(companies, ({ many, one }) => ({
  services: many(services),
  professionals: many(professionals),
  appointments: many(appointments),  
  clients: many(clients),
  whatsappInstances: many(whatsappInstances),
  conversations: many(conversations),
  plan: one(plans, {
    fields: [companies.planId],
    references: [plans.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  company: one(companies, {
    fields: [services.companyId],
    references: [companies.id],
  }),
  appointments: many(appointments),
}));

export const professionalsRelations = relations(professionals, ({ one, many }) => ({
  company: one(companies, {
    fields: [professionals.companyId],
    references: [companies.id],
  }),
  appointments: many(appointments),
  reviews: many(professionalReviews),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  company: one(companies, {
    fields: [appointments.companyId],
    references: [companies.id],
  }),
  professional: one(professionals, {
    fields: [appointments.professionalId],
    references: [professionals.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  company: one(companies, {
    fields: [clients.companyId],
    references: [companies.id],
  }),
  pointTransactions: many(pointTransactions),
}));

// Insert schemas
export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProfessionalSchema = createInsertSchema(professionals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type WhatsappInstance = typeof whatsappInstances.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type FinancialRecord = typeof financialRecords.$inferSelect;