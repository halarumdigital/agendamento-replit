import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  index,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for express-session
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid", { length: 255 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: text("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Admin users table
export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username", { length: 100 }).notNull().unique(),
  email: text("email", { length: 255 }).notNull().unique(),
  password: text("password", { length: 255 }).notNull(),
  firstName: text("first_name", { length: 100 }),
  lastName: text("last_name", { length: 100 }),
  isActive: integer("is_active").notNull().default(true),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Companies table
export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fantasyName: text("fantasy_name", { length: 255 }).notNull(),
  document: text("document", { length: 20 }).notNull().unique(),
  address: text("address").notNull(),
  phone: text("phone", { length: 20 }),
  zipCode: text("zip_code", { length: 10 }),
  number: text("number", { length: 20 }),
  neighborhood: text("neighborhood", { length: 255 }),
  city: text("city", { length: 255 }),
  state: text("state", { length: 2 }),
  email: text("email", { length: 255 }).notNull().unique(),
  password: text("password", { length: 255 }).notNull(),
  planId: integer("plan_id"),
  planStatus: text("plan_status", { length: 50 }).default("inactive"),
  isActive: integer("is_active").notNull().default(true),
  aiAgentPrompt: text("ai_agent_prompt"),
  resetToken: text("reset_token", { length: 255 }),
  resetTokenExpires: text("reset_token_expires"),
  stripeCustomerId: text("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: text("stripe_subscription_id", { length: 255 }),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Subscription plans table
export const plans = sqliteTable("plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 255 }).notNull(),
  freeDays: integer("free_days").notNull().default(0),
  price: real("price", { precision: 10, scale: 2 }).notNull(),
  maxProfessionals: integer("max_professionals").notNull().default(1),
  isActive: integer("is_active").notNull().default(true),
  stripeProductId: text("stripe_product_id", { length: 255 }),
  stripePriceId: text("stripe_price_id", { length: 255 }),
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
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Admin alerts/announcements table
export const adminAlerts = sqliteTable("admin_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: text("type", { length: 50 }).notNull().default("info"), // info, warning, success, error
  isActive: integer("is_active").notNull().default(true),
  showToAllCompanies: integer("show_to_all_companies").notNull().default(true),
  targetCompanyIds: json("target_company_ids").$type<number[]>().default([]),
  startDate: text("start_date").defaultNow(),
  endDate: text("end_date"),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Company alert views table (to track which companies have seen the alert)
export const companyAlertViews = sqliteTable("company_alert_views", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  alertId: integer("alert_id").notNull(),
  viewedAt: text("viewed_at").defaultNow(),
});

// Global settings table
export const globalSettings = sqliteTable("global_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  systemName: text("system_name", { length: 255 }).default("AdminPro"),
  logoUrl: text("logo_url", { length: 500 }),
  faviconUrl: text("favicon_url", { length: 500 }),
  primaryColor: text("primary_color", { length: 7 }).notNull().default("#2563eb"),
  secondaryColor: text("secondary_color", { length: 7 }).notNull().default("#64748b"),
  backgroundColor: text("background_color", { length: 7 }).notNull().default("#f8fafc"),
  textColor: text("text_color", { length: 7 }).notNull().default("#1e293b"),
  evolutionApiUrl: text("evolution_api_url", { length: 500 }),
  evolutionApiGlobalKey: text("evolution_api_global_key", { length: 500 }),
  openaiApiKey: text("openai_api_key", { length: 500 }),
  openaiModel: text("openai_model", { length: 100 }).notNull().default("gpt-4o"),
  openaiTemperature: text("openai_temperature", { length: 10 }).notNull().default("0.70"),
  openaiMaxTokens: text("openai_max_tokens", { length: 10 }).notNull().default("4000"),
  // SMTP Configuration
  smtpHost: text("smtp_host", { length: 255 }),
  smtpPort: text("smtp_port", { length: 10 }),
  smtpUser: text("smtp_user", { length: 255 }),
  smtpPassword: text("smtp_password", { length: 255 }),
  smtpFromEmail: text("smtp_from_email", { length: 255 }),
  smtpFromName: text("smtp_from_name", { length: 255 }),
  smtpSecure: text("smtp_secure", { length: 10 }).default("tls"),
  customHtml: text("custom_html"),
  customDomainUrl: text("custom_domain_url", { length: 500 }),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// WhatsApp instances table
export const whatsappInstances = sqliteTable("whatsapp_instances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  instanceName: text("instance_name", { length: 255 }).notNull(),
  status: text("status", { length: 50 }),
  qrCode: text("qr_code"),
  webhook: text("webhook", { length: 500 }),
  apiUrl: text("api_url", { length: 500 }),
  apiKey: text("api_key", { length: 500 }),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Conversations table
export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  whatsappInstanceId: integer("whatsapp_instance_id").notNull(),
  phoneNumber: text("phone_number", { length: 50 }).notNull(),
  contactName: text("contact_name", { length: 255 }),
  lastMessageAt: text("last_message_at").defaultNow(),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Messages table
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull(),
  role: text("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  messageId: text("message_id", { length: 255 }),
  messageType: text("message_type", { length: 50 }),
  delivered: integer("delivered").default(false),
  timestamp: text("timestamp").defaultNow(),
  createdAt: text("created_at").defaultNow(),
});

// Services table
export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name", { length: 255 }).notNull(),
  description: text("description"),
  price: real("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(),
  color: text("color", { length: 7 }).default("#3B82F6"),
  isActive: integer("is_active").notNull().default(true),
  points: integer("points").default(0),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Professionals table
export const professionals = sqliteTable("professionals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name", { length: 255 }).notNull(),
  email: text("email", { length: 255 }),
  phone: text("phone", { length: 50 }),
  specialties: json("specialties").$type<string[]>(),
  workDays: json("work_days"),
  workStartTime: text("work_start_time", { length: 10 }),
  workEndTime: text("work_end_time", { length: 10 }),
  active: integer("active").default(true),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Appointments table
export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  professionalId: integer("professional_id").notNull(),
  serviceId: integer("service_id").notNull(),
  clientName: text("client_name", { length: 255 }).notNull(),
  clientPhone: text("client_phone", { length: 50 }),
  clientEmail: text("client_email", { length: 255 }),
  appointmentDate: text("appointment_date").notNull(),
  appointmentTime: text("appointment_time", { length: 10 }).notNull(),
  duration: integer("duration").default(30),
  totalPrice: real("total_price", { precision: 10, scale: 2 }).default("0.00"),
  status: text("status", { length: 50 }).notNull().default("agendado"),
  notes: text("notes"),
  reminderSent: integer("reminder_sent").default(false),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Status table
export const status = sqliteTable("status", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 100 }).notNull(),
  color: text("color", { length: 7 }).notNull(),
  createdAt: text("created_at").defaultNow(),
});

// Clients table
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name", { length: 255 }).notNull(),
  email: text("email", { length: 255 }),
  phone: text("phone", { length: 50 }),
  birthDate: text("birth_date"),
  notes: text("notes"),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Birthday messages table
export const birthdayMessages = sqliteTable("birthday_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  message: text("message").notNull(),
  messageTemplate: text("message_template"),
  isActive: integer("is_active").default(true),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Birthday message history table
export const birthdayMessageHistory = sqliteTable("birthday_message_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  clientId: integer("client_id").notNull(),
  message: text("message").notNull(),
  sentAt: text("sent_at").defaultNow(),
});

// Reminder settings table
export const reminderSettings = sqliteTable("reminder_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  reminderType: text("reminder_type", { length: 50 }).notNull(),
  isActive: integer("is_active").default(true),
  messageTemplate: text("message_template").notNull(),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Reminder history table
export const reminderHistory = sqliteTable("reminder_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  reminderType: text("reminder_type", { length: 50 }).notNull(),
  clientPhone: text("client_phone", { length: 20 }).notNull(),
  message: text("message").notNull(),
  sentAt: text("sent_at").defaultNow(),
  status: text("status", { length: 20 }).default("sent"),
  whatsappInstanceId: integer("whatsapp_instance_id"),
});

// Professional reviews table
export const professionalReviews = sqliteTable("professional_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  professionalId: integer("professional_id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  clientPhone: text("client_phone", { length: 50 }).notNull(),
  clientName: text("client_name", { length: 255 }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: text("created_at").defaultNow(),
});

// Review invitations table
export const reviewInvitations = sqliteTable("review_invitations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  whatsappInstanceId: integer("whatsapp_instance_id"),
  professionalId: integer("professional_id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  clientPhone: text("client_phone", { length: 50 }).notNull(),
  invitationToken: text("invitation_token", { length: 255 }).notNull().unique(),
  sentAt: text("sent_at"),
  reviewSubmittedAt: text("review_submitted_at"),
  status: text("status", { length: 50 }).default("pending"),
});

// Tasks table
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: text("due_date").notNull(),
  recurrence: text("recurrence", { length: 50 }).default("none"),
  whatsappNumber: text("whatsapp_number", { length: 50 }),
  isActive: integer("is_active").default(true),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Task reminders table
export const taskReminders = sqliteTable("task_reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  whatsappNumber: text("whatsapp_number", { length: 50 }).notNull(),
  message: text("message").notNull(),
  sentAt: text("sent_at").defaultNow(),
});

// Client points table
export const clientPoints = sqliteTable("client_points", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  companyId: integer("company_id").notNull(),
  totalPoints: integer("total_points").default(0),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Points campaigns table
export const pointsCampaigns = sqliteTable("points_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name", { length: 255 }).notNull(),
  requiredPoints: integer("required_points").notNull(),
  rewardServiceId: integer("reward_service_id").notNull(),
  active: integer("active").default(true),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Points history table
export const pointsHistory = sqliteTable("points_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  clientId: integer("client_id").notNull(),
  pointsChange: integer("points_change").notNull(),
  description: text("description").notNull(),
  createdAt: text("created_at").defaultNow(),
});

// Loyalty campaigns table
export const loyaltyCampaigns = sqliteTable("loyalty_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name", { length: 255 }).notNull(),
  conditionType: text("condition_type", { length: 50 }).notNull(), // 'services' or 'amount'
  conditionValue: integer("condition_value").notNull(), // X services or X amount
  rewardType: text("reward_type", { length: 50 }).notNull(), // 'service' or 'discount'
  rewardValue: integer("reward_value").notNull(), // service ID or discount percentage
  rewardServiceId: integer("reward_service_id"), // ID of the service to give as reward
  active: integer("active").default(true),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Loyalty rewards history table
export const loyaltyRewardsHistory = sqliteTable("loyalty_rewards_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  clientId: integer("client_id").notNull(),
  campaignId: integer("campaign_id").notNull(),
  rewardType: text("reward_type", { length: 50 }).notNull(),
  rewardValue: text("reward_value", { length: 255 }).notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").defaultNow(),
});

// Products table
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name", { length: 255 }).notNull(),
  photo: text("photo", { length: 500 }),
  description: text("description"),
  purchasePrice: real("purchase_price", { precision: 10, scale: 2 }).notNull(),
  supplierName: text("supplier_name", { length: 255 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  alertStock: integer("alert_stock").default(false),
  minStockLevel: integer("min_stock_level").default(0),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Coupons table
export const coupons = sqliteTable("coupons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name", { length: 255 }).notNull(),
  code: text("code", { length: 50 }).notNull().unique(),
  discountType: text("discount_type", { length: 20 }).notNull(), // 'percentage' or 'fixed'
  discountValue: real("discount_value", { precision: 10, scale: 2 }).notNull(),
  expiresAt: text("expires_at"),
  maxUses: integer("max_uses").notNull().default(1),
  usesCount: integer("uses_count").notNull().default(0),
  isActive: integer("is_active").notNull().default(true),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Message campaigns table
export const messageCampaigns = sqliteTable("message_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name", { length: 255 }).notNull(),
  message: text("message").notNull(),
  scheduledDate: text("scheduled_date").notNull(),
  status: text("status", { length: 50 }).notNull().default("pending"), // pending, sending, completed, failed
  targetType: text("target_type", { length: 20 }).notNull(), // all, specific
  selectedClients: json("selected_clients"), // array of client IDs for specific targeting
  sentCount: integer("sent_count").default(0),
  totalTargets: integer("total_targets").default(0),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Financial categories table
export const financialCategories = sqliteTable("financial_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name", { length: 255 }).notNull(),
  description: text("description"),
  type: text("type", { length: 20 }).notNull(), // income, expense
  color: text("color", { length: 7 }).notNull().default("#3B82F6"),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Payment methods table
export const paymentMethods = sqliteTable("payment_methods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  name: text("name", { length: 255 }).notNull(),
  description: text("description"),
  type: text("type", { length: 20 }).notNull(), // cash, card, pix, transfer, other
  isActive: integer("is_active").default(true),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
});

// Financial transactions table
export const financialTransactions = sqliteTable("financial_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull(),
  description: text("description", { length: 500 }).notNull(),
  amount: real("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type", { length: 20 }).notNull(), // income, expense
  categoryId: integer("category_id").notNull(),
  paymentMethodId: integer("payment_method_id").notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").defaultNow(),
  updatedAt: text("updated_at").defaultNow().onUpdateNow(),
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

export const insertCouponSchema = createInsertSchema(coupons, {
  discountValue: z.number(),
  usageLimit: z.number().optional(),
  companyId: z.number(),
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