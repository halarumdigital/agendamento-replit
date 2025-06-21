import {
  mysqlTable,
  varchar,
  text,
  int,
  decimal,
  boolean,
  timestamp,
  date,
  json,
  index,
  serial,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for express-session
export const sessions = mysqlTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: text("sess").notNull(),
    expire: varchar("expire", { length: 255 }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Admin users table
export const admins = mysqlTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  isActive: int("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Companies table
export const companies = mysqlTable("companies", {
  id: serial("id").primaryKey(),
  fantasyName: varchar("fantasy_name", { length: 255 }).notNull(),
  document: varchar("document", { length: 20 }).notNull().unique(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 20 }),
  zipCode: varchar("zip_code", { length: 10 }),
  number: varchar("number", { length: 20 }),
  neighborhood: varchar("neighborhood", { length: 255 }),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 2 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  planId: int("plan_id"),
  planStatus: varchar("plan_status", { length: 50 }).default("inactive"),
  isActive: int("is_active").notNull().default(1),
  aiAgentPrompt: text("ai_agent_prompt"),
  resetToken: varchar("reset_token", { length: 255 }),
  resetTokenExpires: varchar("reset_token_expires", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Subscription plans table
export const plans = mysqlTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  freeDays: int("free_days").notNull().default(0),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  annualPrice: decimal("annual_price", { precision: 10, scale: 2 }),
  maxProfessionals: int("max_professionals").notNull().default(1),
  isActive: int("is_active").notNull().default(1),
  stripeProductId: varchar("stripe_product_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  permissions: json("permissions").$type<{
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
    support: boolean;
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
    support: true,
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Admin alerts/announcements table
export const adminAlerts = mysqlTable("admin_alerts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("info"), // info, warning, success, error
  isActive: int("is_active").notNull().default(1),
  showToAllCompanies: int("show_to_all_companies").notNull().default(1),
  targetCompanyIds: json("target_company_ids").$type<number[]>().default([]),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Company alert views table (to track which companies have seen the alert)
export const companyAlertViews = mysqlTable("company_alert_views", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  alertId: int("alert_id").notNull(),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Global settings table
export const globalSettings = mysqlTable("global_settings", {
  id: serial("id").primaryKey(),
  systemName: varchar("system_name", { length: 255 }).default("AdminPro"),
  logoUrl: varchar("logo_url", { length: 500 }),
  faviconUrl: varchar("favicon_url", { length: 500 }),
  primaryColor: varchar("primary_color", { length: 7 }).notNull().default("#2563eb"),
  secondaryColor: varchar("secondary_color", { length: 7 }).notNull().default("#64748b"),
  backgroundColor: varchar("background_color", { length: 7 }).notNull().default("#f8fafc"),
  textColor: varchar("text_color", { length: 7 }).notNull().default("#1e293b"),
  evolutionApiUrl: varchar("evolution_api_url", { length: 500 }),
  evolutionApiGlobalKey: varchar("evolution_api_global_key", { length: 500 }),
  openaiApiKey: varchar("openai_api_key", { length: 500 }),
  openaiModel: varchar("openai_model", { length: 100 }).notNull().default("gpt-4o"),
  openaiTemperature: varchar("openai_temperature", { length: 10 }).notNull().default("0.70"),
  openaiMaxTokens: varchar("openai_max_tokens", { length: 10 }).notNull().default("4000"),
  // SMTP Configuration
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: varchar("smtp_port", { length: 10 }),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPassword: varchar("smtp_password", { length: 255 }),
  smtpFromEmail: varchar("smtp_from_email", { length: 255 }),
  smtpFromName: varchar("smtp_from_name", { length: 255 }),
  smtpSecure: varchar("smtp_secure", { length: 10 }).default("tls"),
  customHtml: text("custom_html"),
  customDomainUrl: varchar("custom_domain_url", { length: 500 }),
  systemUrl: varchar("system_url", { length: 500 }),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// WhatsApp instances table
export const whatsappInstances = mysqlTable("whatsapp_instances", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  instanceName: varchar("instance_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }),
  qrCode: text("qr_code"),
  webhook: varchar("webhook", { length: 500 }),
  apiUrl: varchar("api_url", { length: 500 }),
  apiKey: varchar("api_key", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Conversations table
export const conversations = mysqlTable("conversations", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  whatsappInstanceId: int("whatsapp_instance_id").notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Messages table
export const messages = mysqlTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: int("conversation_id").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  messageId: varchar("message_id", { length: 255 }),
  messageType: varchar("message_type", { length: 50 }),
  delivered: int("delivered").default(0),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Services table
export const services = mysqlTable("services", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: int("duration").notNull(),
  color: varchar("color", { length: 7 }).default("#3B82F6"),
  isActive: int("is_active").notNull().default(1),
  points: int("points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Professionals table
export const professionals = mysqlTable("professionals", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  specialties: json("specialties").$type<string[]>(),
  workDays: json("work_days"),
  workStartTime: varchar("work_start_time", { length: 10 }),
  workEndTime: varchar("work_end_time", { length: 10 }),
  active: int("active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Appointments table
export const appointments = mysqlTable("appointments", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  professionalId: int("professional_id").notNull(),
  serviceId: int("service_id").notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 50 }),
  clientEmail: varchar("client_email", { length: 255 }),
  appointmentDate: date("appointment_date").notNull(),
  appointmentTime: varchar("appointment_time", { length: 10 }).notNull(),
  duration: int("duration").default(30),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 50 }).notNull().default("agendado"),
  notes: text("notes"),
  reminderSent: int("reminder_sent").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Status table
export const status = mysqlTable("status", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients table
export const clients = mysqlTable("clients", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  birthDate: date("birth_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Birthday messages table
export const birthdayMessages = mysqlTable("birthday_messages", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  message: text("message").notNull(),
  messageTemplate: text("message_template"),
  isActive: int("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Birthday message history table
export const birthdayMessageHistory = mysqlTable("birthday_message_history", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  clientId: int("client_id").notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Reminder settings table
export const reminderSettings = mysqlTable("reminder_settings", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  reminderType: varchar("reminder_type", { length: 50 }).notNull(),
  isActive: int("is_active").default(1),
  messageTemplate: text("message_template").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Reminder history table
export const reminderHistory = mysqlTable("reminder_history", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  appointmentId: int("appointment_id").notNull(),
  reminderType: varchar("reminder_type", { length: 50 }).notNull(),
  clientPhone: varchar("client_phone", { length: 20 }).notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  status: varchar("status", { length: 20 }).default("sent"),
  whatsappInstanceId: int("whatsapp_instance_id"),
});

// Professional reviews table
export const professionalReviews = mysqlTable("professional_reviews", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  professionalId: int("professional_id").notNull(),
  appointmentId: int("appointment_id").notNull(),
  clientPhone: varchar("client_phone", { length: 50 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Review invitations table
export const reviewInvitations = mysqlTable("review_invitations", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  whatsappInstanceId: int("whatsapp_instance_id"),
  professionalId: int("professional_id").notNull(),
  appointmentId: int("appointment_id").notNull(),
  clientPhone: varchar("client_phone", { length: 50 }).notNull(),
  invitationToken: varchar("invitation_token", { length: 255 }).notNull().unique(),
  sentAt: timestamp("sent_at"),
  reviewSubmittedAt: timestamp("review_submitted_at"),
  status: varchar("status", { length: 50 }).default("pending"),
});

// Tasks table
export const tasks = mysqlTable("tasks", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: date("due_date").notNull(),
  recurrence: varchar("recurrence", { length: 50 }).default("none"),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }),
  isActive: int("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Task reminders table
export const taskReminders = mysqlTable("task_reminders", {
  id: serial("id").primaryKey(),
  taskId: int("task_id").notNull(),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }).notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Client points table
export const clientPoints = mysqlTable("client_points", {
  id: serial("id").primaryKey(),
  clientId: int("client_id").notNull(),
  companyId: int("company_id").notNull(),
  totalPoints: int("total_points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Points campaigns table
export const pointsCampaigns = mysqlTable("points_campaigns", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  requiredPoints: int("required_points").notNull(),
  rewardServiceId: int("reward_service_id").notNull(),
  active: int("active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Points history table
export const pointsHistory = mysqlTable("points_history", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  clientId: int("client_id").notNull(),
  pointsChange: int("points_change").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Loyalty campaigns table
export const loyaltyCampaigns = mysqlTable("loyalty_campaigns", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  conditionType: varchar("condition_type", { length: 50 }).notNull(), // 'services' or 'amount'
  conditionValue: int("condition_value").notNull(), // X services or X amount
  rewardType: varchar("reward_type", { length: 50 }).notNull(), // 'service' or 'discount'
  rewardValue: int("reward_value").notNull(), // service ID or discount percentage
  rewardServiceId: int("reward_service_id"), // ID of the service to give as reward
  active: int("active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Loyalty rewards history table
export const loyaltyRewardsHistory = mysqlTable("loyalty_rewards_history", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  clientId: int("client_id").notNull(),
  campaignId: int("campaign_id").notNull(),
  rewardType: varchar("reward_type", { length: 50 }).notNull(),
  rewardValue: varchar("reward_value", { length: 255 }).notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table
export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  photo: varchar("photo", { length: 500 }),
  description: text("description"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  supplierName: varchar("supplier_name", { length: 255 }),
  stockQuantity: int("stock_quantity").notNull().default(0),
  alertStock: int("alert_stock").default(0),
  minStockLevel: int("min_stock_level").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Coupons table
export const coupons = mysqlTable("coupons", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 20 }).notNull(), // 'percentage' or 'fixed'
  discountValue: varchar("discount_value", { length: 20 }).notNull(),
  minOrderValue: decimal("min_order_value", { precision: 10, scale: 2 }),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
  usageLimit: int("usage_limit"),
  usedCount: int("used_count").notNull().default(0),
  validUntil: date("valid_until").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Message campaigns table
export const messageCampaigns = mysqlTable("message_campaigns", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  message: text("message").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, sending, completed, failed
  targetType: varchar("target_type", { length: 20 }).notNull(), // all, specific
  selectedClients: json("selected_clients"), // array of client IDs for specific targeting
  sentCount: int("sent_count").default(0),
  totalTargets: int("total_targets").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Financial categories table
export const financialCategories = mysqlTable("financial_categories", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull(), // income, expense
  color: varchar("color", { length: 7 }).notNull().default("#3B82F6"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Payment methods table
export const paymentMethods = mysqlTable("payment_methods", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull(), // cash, card, pix, transfer, other
  isActive: int("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Financial transactions table
export const financialTransactions = mysqlTable("financial_transactions", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // income, expense
  categoryId: int("category_id").notNull(),
  paymentMethodId: int("payment_method_id").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  professionals: many(professionals),
  services: many(services),
  appointments: many(appointments),
  whatsappInstances: many(whatsappInstances),
  clients: many(clients),
  birthdayMessages: many(birthdayMessages),
  reminderSettings: many(reminderSettings),
  tasks: many(tasks),
  clientPoints: many(clientPoints),
  pointsCampaigns: many(pointsCampaigns),
  loyaltyCampaigns: many(loyaltyCampaigns),
  loyaltyRewardsHistory: many(loyaltyRewardsHistory),
  products: many(products),
  messageCampaigns: many(messageCampaigns),
  financialCategories: many(financialCategories),
  paymentMethods: many(paymentMethods),
  financialTransactions: many(financialTransactions),
}));

export const messageCampaignsRelations = relations(messageCampaigns, ({ one }) => ({
  company: one(companies, {
    fields: [messageCampaigns.companyId],
    references: [companies.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  company: one(companies, {
    fields: [clients.companyId],
    references: [companies.id],
  }),
}));

export const clientPointsRelations = relations(clientPoints, ({ one }) => ({
  client: one(clients, {
    fields: [clientPoints.clientId],
    references: [clients.id],
  }),
  company: one(companies, {
    fields: [clientPoints.companyId],
    references: [companies.id],
  }),
}));

export const pointsCampaignsRelations = relations(pointsCampaigns, ({ one }) => ({
  company: one(companies, {
    fields: [pointsCampaigns.companyId],
    references: [companies.id],
  }),
  rewardService: one(services, {
    fields: [pointsCampaigns.rewardServiceId],
    references: [services.id],
  }),
}));

export const pointsHistoryRelations = relations(pointsHistory, ({ one }) => ({
  client: one(clients, {
    fields: [pointsHistory.clientId],
    references: [clients.id],
  }),
  company: one(companies, {
    fields: [pointsHistory.companyId],
    references: [companies.id],
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
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBirthdayMessageSchema = createInsertSchema(birthdayMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBirthdayMessageHistorySchema = createInsertSchema(birthdayMessageHistory).omit({
  id: true,
  sentAt: true,
});

export const insertReminderSettingsSchema = createInsertSchema(reminderSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReminderHistorySchema = createInsertSchema(reminderHistory).omit({
  id: true,
  sentAt: true,
});

export const insertProfessionalReviewSchema = createInsertSchema(professionalReviews).omit({
  id: true,
  createdAt: true,
});

export const insertReviewInvitationSchema = createInsertSchema(reviewInvitations).omit({
  id: true,
});

export const insertClientPointsSchema = createInsertSchema(clientPoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPointsCampaignSchema = createInsertSchema(pointsCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPointsHistorySchema = createInsertSchema(pointsHistory).omit({
  id: true,
  createdAt: true,
});

export const insertLoyaltyCampaignSchema = createInsertSchema(loyaltyCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoyaltyRewardsHistorySchema = createInsertSchema(loyaltyRewardsHistory).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageCampaignSchema = createInsertSchema(messageCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinancialCategorySchema = createInsertSchema(financialCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminAlertSchema = createInsertSchema(adminAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanyAlertViewSchema = createInsertSchema(companyAlertViews).omit({
  id: true,
  viewedAt: true,
});

// Type exports
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
export type BirthdayMessage = typeof birthdayMessages.$inferSelect;
export type InsertBirthdayMessage = z.infer<typeof insertBirthdayMessageSchema>;
export type BirthdayMessageHistory = typeof birthdayMessageHistory.$inferSelect;
export type InsertBirthdayMessageHistory = z.infer<typeof insertBirthdayMessageHistorySchema>;
export type ReminderSettings = typeof reminderSettings.$inferSelect;
export type InsertReminderSettings = z.infer<typeof insertReminderSettingsSchema>;
export type ReminderHistory = typeof reminderHistory.$inferSelect;
export type InsertReminderHistory = z.infer<typeof insertReminderHistorySchema>;
export type ProfessionalReview = typeof professionalReviews.$inferSelect;
export type InsertProfessionalReview = z.infer<typeof insertProfessionalReviewSchema>;
export type ReviewInvitation = typeof reviewInvitations.$inferSelect;
export type InsertReviewInvitation = z.infer<typeof insertReviewInvitationSchema>;
export type ClientPoints = typeof clientPoints.$inferSelect;
export type InsertClientPoints = z.infer<typeof insertClientPointsSchema>;
export type PointsCampaign = typeof pointsCampaigns.$inferSelect;
export type InsertPointsCampaign = z.infer<typeof insertPointsCampaignSchema>;
export type PointsHistory = typeof pointsHistory.$inferSelect;
export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type LoyaltyCampaign = typeof loyaltyCampaigns.$inferSelect;
export type InsertLoyaltyCampaign = z.infer<typeof insertLoyaltyCampaignSchema>;
export type LoyaltyRewardsHistory = typeof loyaltyRewardsHistory.$inferSelect;
export type InsertLoyaltyRewardsHistory = z.infer<typeof insertLoyaltyRewardsHistorySchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type MessageCampaign = typeof messageCampaigns.$inferSelect;
export type InsertMessageCampaign = z.infer<typeof insertMessageCampaignSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type AdminAlert = typeof adminAlerts.$inferSelect;
export type InsertAdminAlert = z.infer<typeof insertAdminAlertSchema>;
export type CompanyAlertView = typeof companyAlertViews.$inferSelect;
export type InsertCompanyAlertView = z.infer<typeof insertCompanyAlertViewSchema>;

// Support ticket types table
export const supportTicketTypes = mysqlTable("support_ticket_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Support ticket statuses table
export const supportTicketStatuses = mysqlTable("support_ticket_statuses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).notNull().default("#6b7280"), // hex color
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Support tickets table
export const supportTickets = mysqlTable("support_tickets", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull(),
  typeId: int("type_id"),
  statusId: int("status_id"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, urgent
  category: varchar("category", { length: 100 }).notNull().default("general"), // general, technical, billing, feature_request
  adminResponse: text("admin_response"),
  attachments: text("attachments"), // Comma-separated filenames
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertSupportTicketTypeSchema = createInsertSchema(supportTicketTypes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupportTicketStatusSchema = createInsertSchema(supportTicketStatuses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true });

export type SupportTicketType = typeof supportTicketTypes.$inferSelect;
export type InsertSupportTicketType = z.infer<typeof insertSupportTicketTypeSchema>;
export type SupportTicketStatus = typeof supportTicketStatuses.$inferSelect;
export type InsertSupportTicketStatus = z.infer<typeof insertSupportTicketStatusSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;