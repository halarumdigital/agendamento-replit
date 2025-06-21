import {
  pgTable,
  text,
  varchar,
  timestamp,
  json,
  index,
  integer,
  decimal,
  boolean,
  date,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for express-session
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Admin users table
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies table
export const companies = pgTable("companies", {
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
  planId: integer("plan_id"),
  planStatus: varchar("plan_status", { length: 50 }).default("inactive"),
  isActive: boolean("is_active").notNull().default(true),
  aiAgentPrompt: text("ai_agent_prompt"),
  resetToken: varchar("reset_token", { length: 255 }),
  resetTokenExpires: timestamp("reset_token_expires"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans table
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  freeDays: integer("free_days").notNull().default(0),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  maxProfessionals: integer("max_professionals").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin alerts/announcements table
export const adminAlerts = pgTable("admin_alerts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("info"), // info, warning, success, error
  isActive: boolean("is_active").notNull().default(true),
  showToAllCompanies: boolean("show_to_all_companies").notNull().default(true),
  targetCompanyIds: json("target_company_ids").$type<number[]>().default([]),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company alert views table (to track which companies have seen the alert)
export const companyAlertViews = pgTable("company_alert_views", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  alertId: integer("alert_id").notNull(),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Global settings table
export const globalSettings = pgTable("global_settings", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp instances table
export const whatsappInstances = pgTable("whatsapp_instances", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  instanceName: varchar("instance_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }),
  qrCode: text("qr_code"),
  webhook: varchar("webhook", { length: 500 }),
  apiUrl: varchar("api_url", { length: 500 }),
  apiKey: varchar("api_key", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  whatsappInstanceId: integer("whatsapp_instance_id").notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  messageId: varchar("message_id", { length: 255 }),
  messageType: varchar("message_type", { length: 50 }),
  delivered: boolean("delivered").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Services table
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(),
  color: varchar("color", { length: 7 }).default("#3B82F6"),
  isActive: boolean("is_active").notNull().default(true),
  points: integer("points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Professionals table
export const professionals = pgTable("professionals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  specialties: json("specialties").$type<string[]>(),
  workDays: json("work_days"),
  workStartTime: varchar("work_start_time", { length: 10 }),
  workEndTime: varchar("work_end_time", { length: 10 }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  professionalId: integer("professional_id").notNull(),
  serviceId: integer("service_id").notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 50 }),
  clientEmail: varchar("client_email", { length: 255 }),
  appointmentDate: date("appointment_date").notNull(),
  appointmentTime: varchar("appointment_time", { length: 10 }).notNull(),
  duration: integer("duration").default(30),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 50 }).notNull().default("agendado"),
  notes: text("notes"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Status table
export const status = pgTable("status", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  birthDate: date("birth_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Birthday messages table
export const birthdayMessages = pgTable("birthday_messages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  message: text("message").notNull(),
  messageTemplate: text("message_template"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Birthday message history table
export const birthdayMessageHistory = pgTable("birthday_message_history", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  clientId: integer("client_id").notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Reminder settings table
export const reminderSettings = pgTable("reminder_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  reminderType: varchar("reminder_type", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true),
  messageTemplate: text("message_template").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reminder history table
export const reminderHistory = pgTable("reminder_history", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  reminderType: varchar("reminder_type", { length: 50 }).notNull(),
  clientPhone: varchar("client_phone", { length: 20 }).notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  status: varchar("status", { length: 20 }).default("sent"),
  whatsappInstanceId: integer("whatsapp_instance_id"),
});

// Professional reviews table
export const professionalReviews = pgTable("professional_reviews", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  professionalId: integer("professional_id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  clientPhone: varchar("client_phone", { length: 50 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Review invitations table
export const reviewInvitations = pgTable("review_invitations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  whatsappInstanceId: integer("whatsapp_instance_id"),
  professionalId: integer("professional_id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  clientPhone: varchar("client_phone", { length: 50 }).notNull(),
  invitationToken: varchar("invitation_token", { length: 255 }).notNull().unique(),
  sentAt: timestamp("sent_at"),
  reviewSubmittedAt: timestamp("review_submitted_at"),
  status: varchar("status", { length: 50 }).default("pending"),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: date("due_date").notNull(),
  recurrence: varchar("recurrence", { length: 50 }).default("none"),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task reminders table
export const taskReminders = pgTable("task_reminders", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }).notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Client points table
export const clientPoints = pgTable("client_points", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  companyId: integer("company_id").notNull(),
  totalPoints: integer("total_points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Points campaigns table
export const pointsCampaigns = pgTable("points_campaigns", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  requiredPoints: integer("required_points").notNull(),
  rewardServiceId: integer("reward_service_id").notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Points history table
export const pointsHistory = pgTable("points_history", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  clientId: integer("client_id").notNull(),
  pointsChange: integer("points_change").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Loyalty campaigns table
export const loyaltyCampaigns = pgTable("loyalty_campaigns", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  conditionType: varchar("condition_type", { length: 50 }).notNull(), // 'services' or 'amount'
  conditionValue: integer("condition_value").notNull(), // X services or X amount
  rewardType: varchar("reward_type", { length: 50 }).notNull(), // 'service' or 'discount'
  rewardValue: integer("reward_value").notNull(), // service ID or discount percentage
  rewardServiceId: integer("reward_service_id"), // ID of the service to give as reward
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loyalty rewards history table
export const loyaltyRewardsHistory = pgTable("loyalty_rewards_history", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  clientId: integer("client_id").notNull(),
  campaignId: integer("campaign_id").notNull(),
  rewardType: varchar("reward_type", { length: 50 }).notNull(),
  rewardValue: varchar("reward_value", { length: 255 }).notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  photo: varchar("photo", { length: 500 }),
  description: text("description"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  supplierName: varchar("supplier_name", { length: 255 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  alertStock: boolean("alert_stock").default(false),
  minStockLevel: integer("min_stock_level").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coupons table
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountType: varchar("discount_type", { length: 20 }).notNull(), // 'percentage' or 'fixed'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  expiresAt: timestamp("expires_at"),
  maxUses: integer("max_uses").notNull().default(1),
  usesCount: integer("uses_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message campaigns table
export const messageCampaigns = pgTable("message_campaigns", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  message: text("message").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, sending, completed, failed
  targetType: varchar("target_type", { length: 20 }).notNull(), // all, specific
  selectedClients: json("selected_clients"), // array of client IDs for specific targeting
  sentCount: integer("sent_count").default(0),
  totalTargets: integer("total_targets").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial categories table
export const financialCategories = pgTable("financial_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull(), // income, expense
  color: varchar("color", { length: 7 }).notNull().default("#3B82F6"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment methods table
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull(), // cash, card, pix, transfer, other
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial transactions table
export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // income, expense
  categoryId: integer("category_id").notNull(),
  paymentMethodId: integer("payment_method_id").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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