import {
  mysqlTable,
  text,
  varchar,
  timestamp,
  json,
  index,
  int,
  decimal,
  boolean,
  date,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for express-session
export const sessions = mysqlTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Admin users table
export const admins = mysqlTable("admins", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Companies table
export const companies = mysqlTable("companies", {
  id: int("id").primaryKey().autoincrement(),
  fantasyName: varchar("fantasy_name", { length: 255 }).notNull(),
  document: varchar("document", { length: 20 }).notNull().unique(), // CNPJ or CPF
  address: text("address").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  aiAgentPrompt: text("ai_agent_prompt"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Subscription plans table
export const plans = mysqlTable("plans", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  freeDays: int("free_days").notNull().default(0),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Global settings table
export const globalSettings = mysqlTable("global_settings", {
  id: int("id").primaryKey().autoincrement(),
  systemName: varchar("system_name", { length: 255 }).notNull().default("AdminPro"),
  logoUrl: varchar("logo_url", { length: 500 }),
  primaryColor: varchar("primary_color", { length: 7 }).notNull().default("#2563eb"),
  secondaryColor: varchar("secondary_color", { length: 7 }).notNull().default("#64748b"),
  backgroundColor: varchar("background_color", { length: 7 }).notNull().default("#f8fafc"),
  textColor: varchar("text_color", { length: 7 }).notNull().default("#1e293b"),
  evolutionApiUrl: varchar("evolution_api_url", { length: 500 }),
  evolutionApiGlobalKey: varchar("evolution_api_global_key", { length: 500 }),
  openaiApiKey: varchar("openai_api_key", { length: 500 }),
  openaiModel: varchar("openai_model", { length: 100 }).notNull().default("gpt-4o"),
  openaiTemperature: decimal("openai_temperature", { precision: 3, scale: 2 }).notNull().default("0.70").$type<number>(),
  openaiMaxTokens: int("openai_max_tokens").notNull().default(4000),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// WhatsApp instances table
export const whatsappInstances = mysqlTable("whatsapp_instances", {
  id: int("id").primaryKey().autoincrement(),
  companyId: int("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  instanceName: varchar("instance_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("disconnected"),
  qrCode: text("qr_code"),
  webhook: varchar("webhook", { length: 500 }),
  apiUrl: varchar("api_url", { length: 500 }),
  apiKey: varchar("api_key", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Conversations table
export const conversations = mysqlTable("conversations", {
  id: int("id").primaryKey().autoincrement(),
  companyId: int("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  whatsappInstanceId: int("whatsapp_instance_id").notNull().references(() => whatsappInstances.id, { onDelete: "cascade" }),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  contactName: varchar("contact_name", { length: 100 }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Messages table
export const messages = mysqlTable("messages", {
  id: int("id").primaryKey().autoincrement(),
  conversationId: int("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  messageId: varchar("message_id", { length: 100 }),
  content: text("content").notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
  messageType: varchar("message_type", { length: 50 }).default("text"), // 'text', 'image', etc.
  delivered: boolean("delivered").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Services table
export const services = mysqlTable("services", {
  id: int("id").primaryKey().autoincrement(),
  companyId: int("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  duration: int("duration").notNull(), // in minutes
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  color: varchar("color", { length: 7 }).default("#3b82f6"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Professionals table
export const professionals = mysqlTable("professionals", {
  id: int("id").primaryKey().autoincrement(),
  companyId: int("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  specialties: json("specialties").$type<string[]>().default([]),
  workDays: json("work_days").$type<number[]>().default([1, 2, 3, 4, 5]), // 0=sunday, 1=monday, etc
  workStartTime: varchar("work_start_time", { length: 5 }).default("09:00"),
  workEndTime: varchar("work_end_time", { length: 5 }).default("18:00"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Appointments table
export const appointments = mysqlTable("appointments", {
  id: int("id").primaryKey().autoincrement(),
  companyId: int("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  serviceId: int("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  professionalId: int("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }),
  clientPhone: varchar("client_phone", { length: 20 }).notNull(),
  appointmentDate: date("appointment_date").notNull(),
  appointmentTime: varchar("appointment_time", { length: 5 }).notNull(),
  duration: int("duration").notNull(), // in minutes
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("scheduled"), // scheduled, confirmed, cancelled, completed
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Status table
export const status = mysqlTable("status", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(), // hex color
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Clients table
export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  companyId: int("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  birthDate: date("birth_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  whatsappInstances: many(whatsappInstances),
  conversations: many(conversations),
  services: many(services),
  professionals: many(professionals),
  appointments: many(appointments),
  clients: many(clients),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  company: one(companies, {
    fields: [clients.companyId],
    references: [companies.id],
  }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  // Add future relations here if needed
}));

export const whatsappInstancesRelations = relations(whatsappInstances, ({ one, many }) => ({
  company: one(companies, {
    fields: [whatsappInstances.companyId],
    references: [companies.id],
  }),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  company: one(companies, {
    fields: [conversations.companyId],
    references: [companies.id],
  }),
  whatsappInstance: one(whatsappInstances, {
    fields: [conversations.whatsappInstanceId],
    references: [whatsappInstances.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
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
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  company: one(companies, {
    fields: [appointments.companyId],
    references: [companies.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  professional: one(professionals, {
    fields: [appointments.professionalId],
    references: [professionals.id],
  }),
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

export const insertGlobalSettingsSchema = createInsertSchema(globalSettings).omit({
  id: true,
  updatedAt: true,
}).extend({
  openaiTemperature: z.number().min(0).max(2).optional(),
  openaiMaxTokens: z.number().min(1).max(200000).optional(),
});

export const insertWhatsappInstanceSchema = createInsertSchema(whatsappInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
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

export const insertStatusSchema = createInsertSchema(status).omit({
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
export type GlobalSettings = typeof globalSettings.$inferSelect;
export type InsertGlobalSettings = z.infer<typeof insertGlobalSettingsSchema>;
export type WhatsappInstance = typeof whatsappInstances.$inferSelect;
export type InsertWhatsappInstance = z.infer<typeof insertWhatsappInstanceSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Status = typeof status.$inferSelect;
export type InsertStatus = z.infer<typeof insertStatusSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;