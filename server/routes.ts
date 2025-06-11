import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { db } from "./db";
import { insertCompanySchema, insertPlanSchema, insertGlobalSettingsSchema, insertAdminSchema, financialCategories, paymentMethods, financialTransactions } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import QRCode from "qrcode";
import { reminderScheduler, rescheduleRemindersForAppointment } from "./reminder-scheduler";
import { sql, eq, and, desc, asc, sum, count, gte, lte } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  getLoyaltyCampaignsByCompany, 
  createLoyaltyCampaign, 
  updateLoyaltyCampaign, 
  toggleLoyaltyCampaign, 
  deleteLoyaltyCampaign, 
  getLoyaltyRewardsHistory 
} from "./storage";

// Temporary in-memory storage for WhatsApp instances
const tempWhatsappInstances: any[] = [];

// Configure multer for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
});

// Helper function to generate public webhook URLs
function generateWebhookUrl(req: any, instanceName: string): string {
  const host = req.get('host');
  if (host?.includes('replit.dev') || host?.includes('replit.app')) {
    return `https://${host}/api/webhook/whatsapp/${instanceName}`;
  }
  return `${req.protocol}://${host}/api/webhook/whatsapp/${instanceName}`;
}

async function generateAvailabilityInfo(professionals: any[], existingAppointments: any[]): Promise<string> {
  const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  
  let availabilityText = 'DISPONIBILIDADE REAL DOS PROFISSIONAIS (CONSULTE ANTES DE CONFIRMAR):\n\n';
  
  for (const prof of professionals) {
    if (!prof.active) continue;
    
    availabilityText += `${prof.name} (ID: ${prof.id}):\n`;
    
    // Work days and hours
    const workDays = prof.workDays || [1, 2, 3, 4, 5, 6]; // Default: Monday to Saturday
    const workStart = prof.workStartTime || '09:00';
    const workEnd = prof.workEndTime || '18:00';
    
    availabilityText += `- Trabalha: ${workDays.map((day: number) => dayNames[day]).join(', ')}\n`;
    availabilityText += `- Horário: ${workStart} às ${workEnd}\n`;
    
    // Check if works on Friday (day 5)
    if (workDays.includes(5)) {
      availabilityText += `- SEXTA-FEIRA: DISPONÍVEL (${workStart} às ${workEnd})\n`;
    } else {
      availabilityText += `- SEXTA-FEIRA: NÃO TRABALHA\n`;
    }
    
    // Check existing appointments for this week
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    
    const profAppointments = existingAppointments.filter(apt => 
      apt.professionalId === prof.id && 
      new Date(apt.appointmentDate) >= weekStart &&
      apt.status !== 'Cancelado'
    );
    
    if (profAppointments.length > 0) {
      availabilityText += `- Agendamentos ocupados:\n`;
      profAppointments.forEach(apt => {
        const date = new Date(apt.appointmentDate);
        const dayName = dayNames[date.getDay()];
        availabilityText += `  • ${dayName} ${apt.appointmentTime} - OCUPADO\n`;
      });
    } else {
      availabilityText += `- Esta semana: LIVRE (sem agendamentos)\n`;
    }
    
    availabilityText += '\n';
  }
  
  return availabilityText;
}

async function createAppointmentFromConversation(conversationId: number, companyId: number) {
  try {
    console.log('📅 Creating appointment from conversation:', conversationId);
    
    // Check if appointment already exists for this conversation within the last 10 minutes
    const existingAppointments = await storage.getAppointmentsByCompany(companyId);
    const conversationAppointment = existingAppointments.find(apt => 
      apt.notes && apt.notes.includes(`Conversa ID: ${conversationId}`) &&
      apt.createdAt && new Date(apt.createdAt).getTime() > (Date.now() - 10 * 60 * 1000)
    );
    
    if (conversationAppointment) {
      console.log('ℹ️ Recent appointment already exists for this conversation:', conversationAppointment.id);
      
      // Still broadcast the event for notification purposes
      const service = await storage.getService(conversationAppointment.serviceId);
      const professional = await storage.getProfessional(conversationAppointment.professionalId);
      
      broadcastEvent({
        type: 'new_appointment',
        appointment: {
          id: conversationAppointment.id,
          clientName: conversationAppointment.clientName,
          serviceName: service?.name || 'Serviço',
          professionalName: professional?.name || 'Profissional',
          appointmentDate: conversationAppointment.appointmentDate,
          appointmentTime: conversationAppointment.appointmentTime
        }
      });
      
      return;
    }
    
    // Get conversation messages
    const messages = await storage.getMessagesByConversation(conversationId);
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    // Get available professionals and services to match
    const professionals = await storage.getProfessionalsByCompany(companyId);
    const services = await storage.getServicesByCompany(companyId);
    
    console.log('💬 Analyzing conversation for appointment data...');
    
    // Extract appointment data using AI
    const OpenAI = (await import('openai')).default;
    const globalSettings = await storage.getGlobalSettings();
    if (!globalSettings?.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    const openai = new OpenAI({ apiKey: globalSettings.openaiApiKey });
    
    // Calculate correct dates for relative day names
    const today = new Date();
    const dayMap = {
      'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 
      'quinta': 4, 'sexta': 5, 'sábado': 6
    };
    
    function getNextWeekdayDate(dayName: string): string {
      const targetDay = dayMap[dayName.toLowerCase()];
      if (targetDay === undefined) return '';
      
      const date = new Date();
      const currentDay = date.getDay();
      let daysUntilTarget = targetDay - currentDay;
      
      // If target day is today, use today
      if (daysUntilTarget === 0) {
        return date.toISOString().split('T')[0];
      }
      
      // If target day has passed this week, get next week's occurrence
      if (daysUntilTarget < 0) {
        daysUntilTarget += 7;
      }
      
      date.setDate(date.getDate() + daysUntilTarget);
      return date.toISOString().split('T')[0];
    }

    const extractionPrompt = `Analise esta conversa de WhatsApp e extraia os dados do agendamento em formato JSON.

HOJE É: ${today.toLocaleDateString('pt-BR')} (${['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][today.getDay()]})

PRÓXIMOS DIAS DA SEMANA:
- Domingo: ${getNextWeekdayDate('domingo')} 
- Segunda-feira: ${getNextWeekdayDate('segunda')}
- Terça-feira: ${getNextWeekdayDate('terça')}
- Quarta-feira: ${getNextWeekdayDate('quarta')}
- Quinta-feira: ${getNextWeekdayDate('quinta')}
- Sexta-feira: ${getNextWeekdayDate('sexta')}
- Sábado: ${getNextWeekdayDate('sábado')}

PROFISSIONAIS DISPONÍVEIS:
${professionals.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}

SERVIÇOS DISPONÍVEIS:
${services.map(s => `- ${s.name} (ID: ${s.id})`).join('\n')}

CONVERSA:
${conversationText}

INSTRUÇÕES IMPORTANTES PARA DATAS:
- Se mencionado "sexta-feira" ou "sexta", use: ${getNextWeekdayDate('sexta')}
- Se mencionado "segunda-feira" ou "segunda", use: ${getNextWeekdayDate('segunda')}
- Se mencionado "terça-feira" ou "terça", use: ${getNextWeekdayDate('terça')}
- Se mencionado "quarta-feira" ou "quarta", use: ${getNextWeekdayDate('quarta')}
- Se mencionado "quinta-feira" ou "quinta", use: ${getNextWeekdayDate('quinta')}
- Se mencionado "sábado", use: ${getNextWeekdayDate('sábado')}

Extraia APENAS se TODOS os dados estiverem presentes na conversa:
- Nome do cliente
- Telefone do cliente  
- Profissional escolhido (use o ID correto da lista acima)
- Serviço escolhido (use o ID correto da lista acima)
- Data e hora do agendamento (use as datas calculadas acima para dias da semana)

Responda APENAS em formato JSON válido ou "DADOS_INCOMPLETOS" se algum dado estiver faltando:
{
  "clientName": "Nome completo",
  "clientPhone": "Telefone",
  "professionalId": 123,
  "serviceId": 456,
  "appointmentDate": "YYYY-MM-DD",
  "appointmentTime": "HH:MM"
}`;

    const extraction = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: extractionPrompt }],
      temperature: 0,
      max_tokens: 500
    });

    const extractedData = extraction.choices[0]?.message?.content?.trim();
    console.log('🤖 Extracted data:', extractedData);
    
    if (!extractedData || extractedData === 'DADOS_INCOMPLETOS') {
      console.log('⚠️ Incomplete appointment data, skipping creation');
      return;
    }

    try {
      const appointmentData = JSON.parse(extractedData);
      
      // Use the date exactly as extracted by AI - no automatic corrections

      console.log('✅ Final appointment data with corrected date:', appointmentData);
      
      // Validate required fields
      if (!appointmentData.clientName || !appointmentData.clientPhone || 
          !appointmentData.professionalId || !appointmentData.serviceId ||
          !appointmentData.appointmentDate || !appointmentData.appointmentTime) {
        console.log('⚠️ Missing required appointment fields');
        return;
      }

      // Find the service to get duration
      const service = services.find(s => s.id === appointmentData.serviceId);
      if (!service) {
        console.log('⚠️ Service not found');
        return;
      }

      // Create client if doesn't exist
      let client;
      try {
        // Normalize phone number for comparison (remove all non-digits)
        const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
        const normalizedClientPhone = normalizePhone(appointmentData.clientPhone);
        
        const existingClients = await storage.getClientsByCompany(companyId);
        client = existingClients.find(c => 
          c.phone && normalizePhone(c.phone) === normalizedClientPhone
        );
        
        if (!client) {
          client = await storage.createClient({
            companyId,
            name: appointmentData.clientName,
            phone: appointmentData.clientPhone,
            email: null,
            notes: 'Cliente criado via WhatsApp',
            birthDate: null
          });
          console.log('👤 New client created:', client.name);
        } else {
          console.log('👤 Existing client found:', client.name);
        }
      } catch (error) {
        console.error('Error creating/finding client:', error);
        return;
      }

      // Create appointment
      const appointmentDate = new Date(appointmentData.appointmentDate);
      
      const appointmentPayload = {
        companyId,
        serviceId: appointmentData.serviceId,
        professionalId: appointmentData.professionalId,
        clientName: appointmentData.clientName,
        clientPhone: appointmentData.clientPhone,
        appointmentDate: appointmentDate,
        appointmentTime: appointmentData.appointmentTime,
        duration: service.duration || 60,
        status: 'Pendente',
        totalPrice: String(service.price || 0),
        notes: `Agendamento criado via WhatsApp - Conversa ID: ${conversationId}`,
        reminderSent: false
      };

      console.log('📋 Appointment payload before creation:', JSON.stringify(appointmentPayload, null, 2));
      
      const appointment = await storage.createAppointment(appointmentPayload);

      console.log('✅ Appointment created successfully:', appointment.id);
      console.log(`📅 ${appointmentData.clientName} - ${service.name} - ${appointmentDate.toLocaleString('pt-BR')}`);

      // Get professional name for notification
      const professional = await storage.getProfessional(appointmentData.professionalId);
      
      // Broadcast new appointment event to all connected clients
      broadcastEvent({
        type: 'new_appointment',
        appointment: {
          id: appointment.id,
          clientName: appointmentData.clientName,
          serviceName: service.name,
          professionalName: professional?.name || 'Profissional',
          appointmentDate: appointmentData.appointmentDate,
          appointmentTime: appointmentData.appointmentTime
        }
      });

    } catch (parseError) {
      console.error('❌ Error parsing extracted appointment data:', parseError);
    }

  } catch (error) {
    console.error('❌ Error in createAppointmentFromConversation:', error);
    throw error;
  }
}

// Store SSE connections
const sseConnections = new Set<any>();

// Function to broadcast events to all connected clients
const broadcastEvent = (eventData: any) => {
  const data = JSON.stringify(eventData);
  sseConnections.forEach((res) => {
    try {
      res.write(`data: ${data}\n\n`);
    } catch (error) {
      // Remove dead connections
      sseConnections.delete(res);
    }
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Test endpoint for notification system (before auth middleware)
  app.get('/api/test-notification', async (req, res) => {
    console.log('🔔 Test notification endpoint called');
    
    try {
      // Create a real test appointment to trigger notifications
      const testAppointment = {
        companyId: 1,
        serviceId: 11, // Corte de Cabelo
        professionalId: 5, // Magnus
        clientName: 'Teste Notificação',
        clientPhone: '49999999999',
        appointmentDate: new Date('2025-06-13T00:00:00.000Z'),
        appointmentTime: '10:00',
        duration: 45,
        status: 'Pendente',
        totalPrice: '35.00',
        notes: 'Agendamento teste para notificação',
        reminderSent: false
      };

      const appointment = await storage.createAppointment(testAppointment);
      console.log('✅ Test appointment created:', appointment.id);

      // Get service and professional info for notification
      const service = await storage.getService(testAppointment.serviceId);
      const professional = await storage.getProfessional(testAppointment.professionalId);

      // Broadcast new appointment event
      broadcastEvent({
        type: 'new_appointment',
        appointment: {
          id: appointment.id,
          clientName: testAppointment.clientName,
          serviceName: service?.name || 'Serviço Teste',
          professionalName: professional?.name || 'Profissional Teste',
          appointmentDate: '2025-06-13',
          appointmentTime: '10:00'
        }
      });
      
      console.log('📡 Real appointment notification broadcast sent');
      res.json({ 
        message: 'Test appointment created and notification sent', 
        success: true,
        appointmentId: appointment.id
      });
    } catch (error) {
      console.error('❌ Error creating test appointment:', error);
      res.status(500).json({ error: 'Failed to create test appointment' });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // SSE endpoint for real-time updates
  app.get('/api/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Add connection to store
    sseConnections.add(res);

    // Send keep-alive ping every 30 seconds
    const keepAlive = setInterval(() => {
      res.write('data: {"type":"ping"}\n\n');
    }, 30000);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      sseConnections.delete(res);
    });
  });



  // Simple admin authentication using hardcoded credentials for demo
  const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123',
    id: 1,
    email: 'admin@sistema.com',
    firstName: 'Administrador',
    lastName: 'Sistema'
  };

  // Company routes
  app.get('/api/companies', isAuthenticated, async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Falha ao buscar empresas" });
    }
  });

  app.get('/api/companies/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.getCompany(id);
      
      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Falha ao buscar empresa" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      
      // Check if email already exists
      const existingCompany = await storage.getCompanyByEmail(validatedData.email);
      if (existingCompany) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);
      
      const company = await storage.createCompany({
        ...validatedData,
        password: hashedPassword,
      });
      
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Falha ao criar empresa" });
    }
  });

  app.put('/api/companies/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCompanySchema.partial().parse(req.body);
      
      // Hash password if provided
      if (validatedData.password) {
        validatedData.password = await bcrypt.hash(validatedData.password, 12);
      }
      
      const company = await storage.updateCompany(id, validatedData);
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Falha ao atualizar empresa" });
    }
  });

  app.delete('/api/companies/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCompany(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "Falha ao excluir empresa" });
    }
  });

  // Plan routes
  app.get('/api/plans', isAuthenticated, async (req, res) => {
    try {
      const plans = await storage.getPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Falha ao buscar planos" });
    }
  });

  app.get('/api/plans/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const plan = await storage.getPlan(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }
      
      res.json(plan);
    } catch (error) {
      console.error("Error fetching plan:", error);
      res.status(500).json({ message: "Falha ao buscar plano" });
    }
  });

  app.post('/api/plans', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPlanSchema.parse(req.body);
      const plan = await storage.createPlan(validatedData);
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Error creating plan:", error);
      res.status(500).json({ message: "Falha ao criar plano" });
    }
  });

  app.put('/api/plans/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPlanSchema.partial().parse(req.body);
      const plan = await storage.updatePlan(id, validatedData);
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Error updating plan:", error);
      res.status(500).json({ message: "Falha ao atualizar plano" });
    }
  });

  app.delete('/api/plans/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePlan(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ message: "Falha ao excluir plano" });
    }
  });

  // Public settings route for login page (without authentication)
  app.get('/api/public-settings', async (req, res) => {
    try {
      const settings = await storage.getGlobalSettings();
      // Return public settings needed for login page including colors
      res.json({
        logoUrl: settings?.logoUrl || null,
        systemName: settings?.systemName || null,
        faviconUrl: settings?.faviconUrl || null,
        primaryColor: settings?.primaryColor || null,
        secondaryColor: settings?.secondaryColor || null,
        backgroundColor: settings?.backgroundColor || null,
        textColor: settings?.textColor || null
      });
    } catch (error) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ message: "Falha ao buscar configurações públicas" });
    }
  });

  // Global settings routes
  app.get('/api/settings', isAuthenticated, async (req, res) => {
    try {
      // Try to add OpenAI columns if they don't exist
      try {
        await db.execute(`
          ALTER TABLE global_settings 
          ADD COLUMN openai_api_key VARCHAR(500) NULL,
          ADD COLUMN openai_model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
          ADD COLUMN openai_temperature DECIMAL(3,2) NOT NULL DEFAULT 0.70,
          ADD COLUMN openai_max_tokens INT NOT NULL DEFAULT 4000
        `);
        console.log('OpenAI columns added successfully');
      } catch (dbError: any) {
        if (dbError.code !== 'ER_DUP_FIELDNAME') {
          console.log('OpenAI columns may already exist:', dbError.code);
        }
      }

      const settings = await storage.getGlobalSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Falha ao buscar configurações" });
    }
  });

  app.put('/api/settings', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertGlobalSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateGlobalSettings(validatedData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Falha ao atualizar configurações" });
    }
  });

  // OpenAI models endpoint
  app.get('/api/openai/models', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getGlobalSettings();
      
      if (!settings?.openaiApiKey) {
        return res.status(400).json({ 
          message: "Chave da API OpenAI não configurada. Configure nas configurações globais.",
          models: []
        });
      }

      const openaiResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${settings.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!openaiResponse.ok) {
        return res.status(openaiResponse.status).json({ 
          message: `Erro da OpenAI API: ${openaiResponse.statusText}`,
          models: []
        });
      }

      const modelsData = await openaiResponse.json();
      
      // Filter for GPT models only and sort by relevance
      const gptModels = modelsData.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          created: model.created
        }))
        .sort((a: any, b: any) => {
          // Sort by model priority: gpt-4o, gpt-4, gpt-3.5
          const priority = (id: string) => {
            if (id.includes('gpt-4o')) return 1;
            if (id.includes('gpt-4')) return 2;
            if (id.includes('gpt-3.5')) return 3;
            return 4;
          };
          return priority(a.id) - priority(b.id);
        });

      res.json({
        models: gptModels,
        message: `${gptModels.length} modelos encontrados`
      });
    } catch (error: any) {
      console.error("Error fetching OpenAI models:", error);
      res.status(500).json({ 
        message: `Erro ao buscar modelos: ${error.message}`,
        models: []
      });
    }
  });

  // Logo upload endpoint
  app.post('/api/upload/logo', isAuthenticated, upload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      // Generate the URL for the uploaded file
      const host = req.get('host');
      const protocol = req.protocol;
      const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

      res.json({ 
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Erro ao fazer upload do logo" });
    }
  });

  // Favicon upload endpoint
  app.post('/api/upload/favicon', isAuthenticated, upload.single('favicon'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      // Generate the URL for the uploaded file
      const host = req.get('host');
      const protocol = req.protocol;
      const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

      res.json({ 
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Error uploading favicon:", error);
      res.status(500).json({ message: "Erro ao fazer upload do favicon" });
    }
  });

  // Admin authentication routes
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Usuário e senha são obrigatórios" });
      }

      // Check hardcoded admin credentials
      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        req.session.adminId = ADMIN_CREDENTIALS.id;
        req.session.adminUsername = ADMIN_CREDENTIALS.username;
        
        const { password: _, ...adminData } = ADMIN_CREDENTIALS;
        res.json({ message: "Login realizado com sucesso", admin: adminData });
      } else {
        res.status(401).json({ message: "Credenciais inválidas" });
      }
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const adminId = req.session.adminId;
      if (!adminId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { password: _, ...adminData } = ADMIN_CREDENTIALS;
      res.json(adminData);
    } catch (error) {
      console.error("Error fetching admin user:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ message: "Erro ao fazer logout" });
        }
        res.json({ message: "Logout realizado com sucesso" });
      });
    } catch (error) {
      console.error("Error during admin logout:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      const plans = await storage.getPlans();
      
      const totalCompanies = companies.length;
      const activePlans = plans.filter(plan => plan.isActive).length;
      const activeCompanies = companies.length; // For now, all companies are considered active
      
      // Calculate monthly revenue (simplified calculation)
      const monthlyRevenue = plans
        .filter(plan => plan.isActive)
        .reduce((total, plan) => total + parseFloat(plan.price), 0);

      res.json({
        totalCompanies,
        activePlans,
        activeCompanies,
        monthlyRevenue: monthlyRevenue.toFixed(2),
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Falha ao buscar estatísticas" });
    }
  });

  // Company Auth routes
  app.post('/api/company/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      const company = await storage.getCompanyByEmail(email);
      if (!company) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const isValidPassword = await bcrypt.compare(password, company.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      req.session.companyId = company.id;
      res.json({ 
        message: "Login realizado com sucesso",
        company: {
          id: company.id,
          fantasyName: company.fantasyName,
          email: company.email
        }
      });
    } catch (error) {
      console.error("Company login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get('/api/company/auth/profile', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Add AI agent prompt column if it doesn't exist
      try {
        await db.execute(`
          ALTER TABLE companies 
          ADD COLUMN ai_agent_prompt TEXT NULL
        `);
        console.log('AI agent prompt column added successfully');
      } catch (dbError: any) {
        if (dbError.code !== 'ER_DUP_FIELDNAME') {
          console.log('AI agent prompt column may already exist:', dbError.code);
        }
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      // Remove password from response
      const { password, ...companyData } = company;
      res.json(companyData);
    } catch (error) {
      console.error("Error fetching company profile:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get('/api/company/auth/logout', async (req: any, res) => {
    try {
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Erro ao fazer logout" });
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
      });
    } catch (error) {
      console.error("Company logout error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.put('/api/company/profile', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { fantasyName, address } = req.body;
      
      if (!fantasyName || !address) {
        return res.status(400).json({ message: "Nome fantasia e endereço são obrigatórios" });
      }

      const company = await storage.updateCompany(companyId, {
        fantasyName,
        address,
      });

      // Remove password from response
      const { password, ...companyData } = company;
      res.json(companyData);
    } catch (error) {
      console.error("Error updating company profile:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.put('/api/company/password', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, company.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      await storage.updateCompany(companyId, {
        password: hashedNewPassword,
      });

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Error updating company password:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Company AI agent configuration
  app.put('/api/company/ai-agent', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { aiAgentPrompt } = req.body;
      
      if (!aiAgentPrompt || aiAgentPrompt.trim().length < 10) {
        return res.status(400).json({ message: "Prompt deve ter pelo menos 10 caracteres" });
      }

      const updatedCompany = await storage.updateCompany(companyId, {
        aiAgentPrompt: aiAgentPrompt.trim()
      });

      res.json({ 
        message: "Configuração do agente IA atualizada com sucesso",
        aiAgentPrompt: updatedCompany.aiAgentPrompt
      });
    } catch (error) {
      console.error("Error updating AI agent config:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Webhook endpoint for WhatsApp integration with AI agent
  app.post('/api/webhook/whatsapp/:instanceName', async (req: any, res) => {
    try {
      const { instanceName } = req.params;
      const webhookData = req.body;

      // Log incoming webhook data for debugging
      console.log('🔔 WhatsApp webhook received for instance:', instanceName);
      console.log('📋 Webhook event:', webhookData.event);
      console.log('📄 Full webhook data:', JSON.stringify(webhookData, null, 2));

      // Handle CONNECTION_UPDATE events to update instance status
      const isConnectionEvent = webhookData.event === 'connection.update' || webhookData.event === 'CONNECTION_UPDATE';
      
      if (isConnectionEvent) {
        console.log('🔄 Processing connection update event');
        
        const connectionData = webhookData.data;
        let newStatus = 'disconnected'; // default status
        
        // Map Evolution API connection states to our status
        if (connectionData?.state === 'open') {
          newStatus = 'connected';
        } else if (connectionData?.state === 'connecting') {
          newStatus = 'connecting';
        } else if (connectionData?.state === 'close') {
          newStatus = 'disconnected';
        }
        
        console.log(`📡 Connection state: ${connectionData?.state} -> ${newStatus}`);
        
        // Update instance status in database
        try {
          const whatsappInstance = await storage.getWhatsappInstanceByName(instanceName);
          if (whatsappInstance) {
            await storage.updateWhatsappInstance(whatsappInstance.id, {
              status: newStatus
            });
            console.log(`✅ Updated instance ${instanceName} status to: ${newStatus}`);
          } else {
            console.log(`⚠️ Instance ${instanceName} not found in database`);
          }
        } catch (dbError) {
          console.error("Error updating instance status:", dbError);
        }
        
        return res.status(200).json({ 
          received: true, 
          processed: true, 
          instanceName,
          newStatus,
          event: 'connection.update'
        });
      }

      // Check if it's a QR code update event
      const isQrCodeEvent = webhookData.event === 'qrcode.updated' || webhookData.event === 'QRCODE_UPDATED';
      
      if (isQrCodeEvent) {
        console.log('📱 QR code updated for instance:', instanceName);
        
        // Extract QR code from Evolution API
        let qrCodeData = null;
        
        // Check all possible locations for QR code
        if (webhookData.data) {
          if (webhookData.data.base64) {
            qrCodeData = webhookData.data.base64;
            console.log('QR found in data.base64');
          } else if (webhookData.data.qrcode) {
            qrCodeData = webhookData.data.qrcode;
            console.log('QR found in data.qrcode');
          }
        } else if (webhookData.qrcode) {
          qrCodeData = webhookData.qrcode;
          console.log('QR found in root.qrcode');
        } else if (webhookData.base64) {
          qrCodeData = webhookData.base64;
          console.log('QR found in root.base64');
        }
        
        if (qrCodeData) {
          try {
            console.log('QR code data type:', typeof qrCodeData);
            console.log('QR code raw data:', qrCodeData);
            
            let qrCodeString = '';
            
            // Handle different data formats from Evolution API
            if (typeof qrCodeData === 'string') {
              qrCodeString = qrCodeData;
            } else if (typeof qrCodeData === 'object' && qrCodeData !== null) {
              // Check if it's a buffer or has base64 property
              if (qrCodeData.base64) {
                qrCodeString = qrCodeData.base64;
              } else if (qrCodeData.data) {
                qrCodeString = qrCodeData.data;
              } else if (Buffer.isBuffer(qrCodeData)) {
                qrCodeString = qrCodeData.toString('base64');
                qrCodeString = `data:image/png;base64,${qrCodeString}`;
              } else {
                // Try to convert object to JSON and see if it contains the QR
                console.log('Object keys:', Object.keys(qrCodeData));
                qrCodeString = JSON.stringify(qrCodeData);
              }
            } else {
              qrCodeString = String(qrCodeData);
            }
            
            console.log('Processed QR code length:', qrCodeString.length);
            
            if (qrCodeString && qrCodeString.length > 50) {
              const whatsappInstance = await storage.getWhatsappInstanceByName(instanceName);
              if (whatsappInstance) {
                await storage.updateWhatsappInstance(whatsappInstance.id, {
                  qrCode: qrCodeString,
                  status: 'connecting'
                });
                console.log('✅ QR code saved successfully for instance:', instanceName);
                console.log('QR code preview:', qrCodeString.substring(0, 100) + '...');
              } else {
                console.log('❌ Instance not found:', instanceName);
              }
            } else {
              console.log('❌ QR code data is too short or invalid:', qrCodeString.length);
            }
          } catch (error) {
            console.error('❌ Error processing QR code:', error);
          }
        } else {
          console.log('❌ No QR code found in webhook data');
        }
        
        return res.json({ received: true, processed: true, type: 'qrcode' });
      }

      // Check if it's a message event (handle both formats)
      const isMessageEventArray = (webhookData.event === 'messages.upsert' || webhookData.event === 'MESSAGES_UPSERT') && webhookData.data?.messages?.length > 0;
      const isMessageEventDirect = (webhookData.event === 'messages.upsert' || webhookData.event === 'MESSAGES_UPSERT') && webhookData.data?.key && webhookData.data?.message;
      const isMessageEvent = isMessageEventArray || isMessageEventDirect;
      
      console.log('🔍 Debug - isMessageEventArray:', isMessageEventArray);
      console.log('🔍 Debug - isMessageEventDirect:', isMessageEventDirect);
      console.log('🔍 Debug - Has key:', !!webhookData.data?.key);
      console.log('🔍 Debug - Has message:', !!webhookData.data?.message);
      
      if (!isMessageEvent) {
        console.log('❌ Event not processed:', webhookData.event);
        return res.status(200).json({ received: true, processed: false, reason: `Event: ${webhookData.event}` });
      }

      console.log('✅ Processing message event:', webhookData.event);
      // Handle both formats: array format and direct format
      const message = isMessageEventArray ? webhookData.data.messages[0] : webhookData.data;
        
        // Only process text messages from users (not from the bot itself)
        console.log('📱 Message type:', message.messageType);
        console.log('👤 From me:', message.key.fromMe);
        console.log('📞 Remote JID:', message.key.remoteJid);
        
        // Handle both 'textMessage' and 'conversation' message types
        const hasTextContent = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const isTextMessage = hasTextContent && !message.key.fromMe;
        
        // Debug logging (can be removed in production)
        // console.log('🔍 Message content:', hasTextContent);
        
        if (isTextMessage) {
          const phoneNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');
          const messageText = message.message.conversation || message.message.extendedTextMessage?.text;
          
          console.log('📞 Phone number:', phoneNumber);
          console.log('💬 Message text:', messageText);
          
          if (messageText) {
            console.log('✅ Message text found, proceeding with AI processing...');
            // Find company by instance name
            console.log('🔍 Searching for instance:', instanceName);
            const whatsappInstance = await storage.getWhatsappInstanceByName(instanceName);
            if (!whatsappInstance) {
              console.log(`❌ WhatsApp instance ${instanceName} not found`);
              return res.status(404).json({ error: 'Instance not found' });
            }
            console.log('✅ Found instance:', whatsappInstance.id);

            console.log('🏢 Searching for company:', whatsappInstance.companyId);
            const company = await storage.getCompany(whatsappInstance.companyId);
            if (!company || !company.aiAgentPrompt) {
              console.log(`❌ Company or AI prompt not found for instance ${instanceName}`);
              console.log('Company:', company ? 'Found' : 'Not found');
              console.log('AI Prompt:', company?.aiAgentPrompt ? 'Configured' : 'Not configured');
              return res.status(404).json({ error: 'Company or AI prompt not configured' });
            }
            console.log('✅ Found company and AI prompt configured');

            // Get global OpenAI settings
            const globalSettings = await storage.getGlobalSettings();
            if (!globalSettings || !globalSettings.openaiApiKey) {
              console.log('❌ OpenAI not configured');
              return res.status(400).json({ error: 'OpenAI not configured' });
            }

            if (!globalSettings.evolutionApiUrl || !globalSettings.evolutionApiGlobalKey) {
              console.log('❌ Evolution API not configured');
              return res.status(400).json({ error: 'Evolution API not configured' });
            }

            try {
              // Find or create conversation
              console.log('💬 Managing conversation for:', phoneNumber);
              let conversation = await storage.getConversation(company.id, whatsappInstance.id, phoneNumber);
              
              if (!conversation) {
                console.log('🆕 Creating new conversation');
                conversation = await storage.createConversation({
                  companyId: company.id,
                  whatsappInstanceId: whatsappInstance.id,
                  phoneNumber: phoneNumber,
                  contactName: message.pushName || undefined,
                  lastMessageAt: new Date(),
                });
              } else {
                // Update last message timestamp
                console.log('♻️ Updating existing conversation');
                await storage.updateConversation(conversation.id, {
                  lastMessageAt: new Date(),
                  contactName: message.pushName || conversation.contactName,
                });
              }

              // Save user message
              console.log('💾 Saving user message to database');
              await storage.createMessage({
                conversationId: conversation.id,
                messageId: message.key?.id,
                content: messageText,
                role: 'user',
                messageType: message.messageType || 'text',
                timestamp: new Date(message.messageTimestamp * 1000),
              });

              // Get conversation history (last 10 messages for context)
              console.log('📚 Loading conversation history');
              const recentMessages = await storage.getRecentMessages(conversation.id, 10);
              
              // Build conversation context for AI
              const conversationHistory = recentMessages
                .reverse() // Oldest first
                .map(msg => ({
                  role: msg.role as 'user' | 'assistant',
                  content: msg.content
                }));

              // Get available professionals and services for this company
              const professionals = await storage.getProfessionalsByCompany(company.id);
              const availableProfessionals = professionals
                .filter(prof => prof.active)
                .map(prof => `- ${prof.name}`)
                .join('\n');

              const services = await storage.getServicesByCompany(company.id);
              const availableServices = services
                .filter(service => service.isActive !== false) // Include services where isActive is true or null
                .map(service => `- ${service.name}${service.price ? ` (R$ ${service.price})` : ''}`)
                .join('\n');

              // Get existing appointments to check availability
              const existingAppointments = await storage.getAppointmentsByCompany(company.id);
              
              // Create availability context for AI with detailed schedule info
              const availabilityInfo = await generateAvailabilityInfo(professionals, existingAppointments);
              
              console.log('📋 Professional availability info generated:', availabilityInfo);

              // Generate AI response with conversation context
              const OpenAI = (await import('openai')).default;
              const openai = new OpenAI({ apiKey: globalSettings.openaiApiKey });

              const systemPrompt = `${company.aiAgentPrompt}

Importante: Você está representando a empresa "${company.fantasyName}" via WhatsApp. 

PROFISSIONAIS DISPONÍVEIS PARA AGENDAMENTO:
${availableProfessionals || 'Nenhum profissional cadastrado no momento'}

SERVIÇOS DISPONÍVEIS:
${availableServices || 'Nenhum serviço cadastrado no momento'}

${availabilityInfo}

INSTRUÇÕES OBRIGATÓRIAS:
- SEMPRE que o cliente mencionar "agendar", "horário", "agendamento" ou similar, ofereça IMEDIATAMENTE a lista completa de profissionais
- Use o formato: "Temos os seguintes profissionais disponíveis:\n[lista dos profissionais]\n\nCom qual profissional você gostaria de agendar?"
- Após a escolha do profissional, ofereça IMEDIATAMENTE a lista completa de serviços disponíveis
- Use o formato: "Aqui estão os serviços disponíveis:\n[lista dos serviços]\n\nQual serviço você gostaria de agendar?"
- Após a escolha do serviço, peça o nome completo
- Após o nome, peça a data e hora desejada
- REGRA OBRIGATÓRIA DE CONFIRMAÇÃO DE DATA: Quando cliente mencionar dias da semana (segunda, terça, quarta, quinta, sexta, sábado, domingo), SEMPRE confirme o dia específico do mês
- Exemplo: Se cliente falar "quarta-feira", responda "Quarta-feira dia 11/06. Está correto?" 
- Exemplo: Se cliente falar "sexta", responda "Sexta-feira dia 13/06. Confirma?"
- Esta confirmação é OBRIGATÓRIA antes de prosseguir com o agendamento
- IMPORTANTE: Quando cliente sugerir data/hora, SEMPRE verifique a disponibilidade real usando as informações acima
- Verifique se o profissional trabalha no dia solicitado
- Verifique se o horário está dentro do expediente
- Verifique se não há conflito com agendamentos existentes
- Se horário não disponível, sugira alternativas baseadas na agenda real
- Após confirmar disponibilidade, peça o telefone para finalizar
- Quando tiver TODOS os dados (profissional, serviço, nome, data/hora disponível, telefone), confirme o agendamento
- NÃO invente serviços - use APENAS os serviços listados acima
- NÃO confirme horários sem verificar disponibilidade real
- SEMPRE mostre todos os profissionais/serviços disponíveis antes de pedir para escolher
- Mantenha respostas concisas e adequadas para mensagens de texto
- Seja profissional mas amigável
- Use o histórico da conversa para dar respostas contextualizadas
- Limite respostas a no máximo 200 palavras por mensagem
- Lembre-se do que já foi discutido anteriormente na conversa`;

              // Prepare messages for OpenAI with conversation history
              const messages = [
                { role: 'system' as const, content: systemPrompt },
                ...conversationHistory.slice(-8), // Last 8 messages for context
                { role: 'user' as const, content: messageText }
              ];

              console.log('🤖 Generating AI response with conversation context');
              console.log('📖 Using', conversationHistory.length, 'previous messages for context');

              const completion = await openai.chat.completions.create({
                model: globalSettings.openaiModel || 'gpt-4o',
                messages: messages,
                temperature: parseFloat(globalSettings.openaiTemperature?.toString() || '0.7'),
                max_tokens: Math.min(parseInt(globalSettings.openaiMaxTokens?.toString() || '300'), 300),
              });

              const aiResponse = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

              // Send response back via Evolution API using global settings
              console.log('🚀 Sending AI response via Evolution API...');
              console.log('🤖 AI Generated Response:', aiResponse);
              
              const evolutionResponse = await fetch(`${globalSettings.evolutionApiUrl}/message/sendText/${instanceName}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': globalSettings.evolutionApiGlobalKey!
                },
                body: JSON.stringify({
                  number: phoneNumber,
                  text: aiResponse
                })
              });

              if (evolutionResponse.ok) {
                console.log(`✅ AI response sent to ${phoneNumber}: ${aiResponse}`);
                
                // Save AI response to database
                console.log('💾 Saving AI response to database');
                await storage.createMessage({
                  conversationId: conversation.id,
                  content: aiResponse,
                  role: 'assistant',
                  messageType: 'text',
                  delivered: true,
                  timestamp: new Date(),
                });
                console.log('✅ AI response saved to conversation history');
                
                // Always check for appointment creation after AI response
                try {
                  console.log('🔍 Checking conversation for appointment data...');
                  await createAppointmentFromConversation(conversation.id, company.id);
                } catch (error) {
                  console.log('ℹ️ No appointment data found or error:', error);
                }
                
              } else {
                const errorText = await evolutionResponse.text();
                console.error('❌ Failed to send message via Evolution API:', errorText);
                console.log('ℹ️  Note: This is normal for test numbers. Real WhatsApp numbers will work.');
                
                // Still save the AI response even if sending failed (for debugging)
                await storage.createMessage({
                  conversationId: conversation.id,
                  content: aiResponse,
                  role: 'assistant',
                  messageType: 'text',
                  delivered: false,
                  timestamp: new Date(),
                });
              }

            } catch (aiError) {
              console.error('Error generating AI response:', aiError);
            }
          }
        }
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET endpoint for webhook verification
  app.get('/api/webhook/whatsapp/:instanceName', (req, res) => {
    const { instanceName } = req.params;
    console.log('🔔 GET request to webhook for instance:', instanceName);
    console.log('🔍 Query params:', req.query);
    res.status(200).send('Webhook endpoint is active');
  });

  // Company Status API
  app.get('/api/company/status', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const statuses = await storage.getStatus();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching status:", error);
      res.status(500).json({ message: "Erro ao buscar status" });
    }
  });

  // Company Appointments API
  app.get('/api/company/appointments', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const month = req.query.month as string;
      const appointments = await storage.getAppointmentsByCompany(companyId, month);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Erro ao buscar agendamentos" });
    }
  });

  // Get detailed appointments for reports (must be before :id route)
  app.get('/api/company/appointments/detailed', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const appointments = await storage.getDetailedAppointmentsForReports(companyId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching detailed appointments:", error);
      res.status(500).json({ message: "Erro ao buscar agendamentos detalhados" });
    }
  });

  // Get appointments by client
  app.get('/api/company/appointments/client/:clientId', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID do cliente inválido" });
      }

      const appointments = await storage.getAppointmentsByClient(clientId, companyId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching client appointments:", error);
      res.status(500).json({ message: "Erro ao buscar histórico do cliente" });
    }
  });

  // Get single appointment by ID (must be after specific routes)
  app.get('/api/company/appointments/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID do agendamento inválido" });
      }

      const appointment = await storage.getAppointmentById(id, companyId);
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Erro ao buscar agendamento" });
    }
  });

  // Fix appointment date (temporary route)
  app.post('/api/fix-appointment-date', async (req: any, res) => {
    try {
      await storage.updateAppointment(29, {
        appointmentDate: new Date('2025-06-14')
      });
      res.json({ message: "Data do agendamento corrigida para 14/06/2025" });
    } catch (error) {
      console.error("Error fixing appointment date:", error);
      res.status(500).json({ message: "Erro ao corrigir data" });
    }
  });

  app.post('/api/company/appointments', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      console.log('📋 Creating appointment with data:', JSON.stringify(req.body, null, 2));

      // Validate required fields
      const { 
        professionalId, 
        serviceId, 
        clientName, 
        clientPhone, 
        appointmentDate, 
        appointmentTime,
        status = 'agendado',
        notes,
        clientEmail
      } = req.body;

      if (!professionalId || !serviceId || !clientName || !clientPhone || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ 
          message: "Dados obrigatórios em falta",
          required: ['professionalId', 'serviceId', 'clientName', 'clientPhone', 'appointmentDate', 'appointmentTime']
        });
      }

      // Get service details for duration and price
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(400).json({ message: "Serviço não encontrado" });
      }

      // Create/find client
      let client;
      try {
        // Normalize phone number for comparison (remove all non-digits)
        const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
        const normalizedClientPhone = normalizePhone(clientPhone);
        
        const existingClients = await storage.getClientsByCompany(companyId);
        client = existingClients.find(c => 
          c.phone && normalizePhone(c.phone) === normalizedClientPhone
        );
        
        if (!client) {
          client = await storage.createClient({
            companyId,
            name: clientName,
            phone: clientPhone,
            email: clientEmail || null,
            notes: notes || null,
            birthDate: null
          });
          console.log('👤 New client created:', client.name);
        } else {
          console.log('👤 Existing client found:', client.name);
        }
      } catch (clientError) {
        console.error('Error handling client:', clientError);
        return res.status(500).json({ message: "Erro ao processar cliente" });
      }

      // Create appointment with all required fields
      const appointmentData = {
        companyId,
        professionalId: parseInt(professionalId),
        serviceId: parseInt(serviceId),
        clientName,
        clientPhone,
        clientEmail: clientEmail || null,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        status,
        duration: service.duration || 60,
        totalPrice: service.price ? String(service.price) : '0',
        notes: notes || null,
        reminderSent: false
      };

      console.log('📋 Final appointment data:', JSON.stringify(appointmentData, null, 2));

      const appointment = await storage.createAppointment(appointmentData);
      
      console.log('✅ Appointment created successfully with ID:', appointment.id);
      
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Erro ao criar agendamento", error: error.message });
    }
  });

  app.patch('/api/company/appointments/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const id = parseInt(req.params.id);
      console.log('📋 Updating appointment ID:', id, 'with data:', JSON.stringify(req.body, null, 2));
      
      // Process the update data
      const updateData: any = {};
      
      if (req.body.serviceId) {
        updateData.serviceId = parseInt(req.body.serviceId);
        // Get service details for pricing
        const service = await storage.getService(updateData.serviceId);
        if (service) {
          updateData.duration = service.duration;
          updateData.totalPrice = String(service.price);
        }
      }
      
      if (req.body.professionalId) {
        updateData.professionalId = parseInt(req.body.professionalId);
      }
      
      if (req.body.appointmentDate) {
        updateData.appointmentDate = new Date(req.body.appointmentDate);
      }
      
      if (req.body.appointmentTime) {
        updateData.appointmentTime = req.body.appointmentTime;
      }
      
      if (req.body.status) {
        updateData.status = req.body.status;
      }
      
      if (req.body.notes !== undefined) {
        updateData.notes = req.body.notes || null;
      }
      
      if (req.body.clientName) {
        updateData.clientName = req.body.clientName;
      }
      
      if (req.body.clientPhone) {
        updateData.clientPhone = req.body.clientPhone;
      }
      
      if (req.body.clientEmail !== undefined) {
        updateData.clientEmail = req.body.clientEmail || null;
      }
      
      updateData.updatedAt = new Date();
      
      console.log('📋 Processed update data:', JSON.stringify(updateData, null, 2));
      
      const appointment = await storage.updateAppointment(id, updateData);
      
      console.log('✅ Appointment updated successfully:', appointment.id);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Erro ao atualizar agendamento", error: error.message });
    }
  });

  // Company Services API
  app.get('/api/company/services', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const services = await storage.getServicesByCompany(companyId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Erro ao buscar serviços" });
    }
  });

  app.post('/api/company/services', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const service = await storage.createService({
        ...req.body,
        companyId,
      });
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Erro ao criar serviço" });
    }
  });

  app.put('/api/company/services/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const id = parseInt(req.params.id);
      const service = await storage.updateService(id, req.body);
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Erro ao atualizar serviço" });
    }
  });

  app.delete('/api/company/services/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteService(id);
      res.json({ message: "Serviço excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Erro ao excluir serviço" });
    }
  });

  // Company Professionals API
  app.get('/api/company/professionals', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const professionals = await storage.getProfessionalsByCompany(companyId);
      res.json(professionals);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      res.status(500).json({ message: "Erro ao buscar profissionais" });
    }
  });

  app.post('/api/company/professionals', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const professional = await storage.createProfessional({
        ...req.body,
        companyId,
      });
      res.status(201).json(professional);
    } catch (error) {
      console.error("Error creating professional:", error);
      res.status(500).json({ message: "Erro ao criar profissional" });
    }
  });

  app.put('/api/company/professionals/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const id = parseInt(req.params.id);
      const professional = await storage.updateProfessional(id, req.body);
      res.json(professional);
    } catch (error) {
      console.error("Error updating professional:", error);
      res.status(500).json({ message: "Erro ao atualizar profissional" });
    }
  });

  app.delete('/api/company/professionals/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteProfessional(id);
      res.json({ message: "Profissional excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting professional:", error);
      res.status(500).json({ message: "Erro ao excluir profissional" });
    }
  });

  // Company Clients API
  app.get('/api/company/clients', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const clients = await storage.getClientsByCompany(companyId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  app.post('/api/company/clients', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Clean up empty fields to prevent MySQL errors
      const clientData = {
        ...req.body,
        companyId,
        email: req.body.email === '' ? null : req.body.email,
        phone: req.body.phone === '' ? null : req.body.phone,
        birthDate: req.body.birthDate === '' ? null : (req.body.birthDate ? new Date(req.body.birthDate + 'T12:00:00') : null),
        notes: req.body.notes === '' ? null : req.body.notes,
      };

      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Erro ao criar cliente" });
    }
  });

  app.put('/api/company/clients/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Clean up empty fields to prevent MySQL errors
      const clientData = {
        ...req.body,
        email: req.body.email === '' ? null : req.body.email,
        phone: req.body.phone === '' ? null : req.body.phone,
        birthDate: req.body.birthDate === '' ? null : (req.body.birthDate ? new Date(req.body.birthDate + 'T12:00:00') : null),
        notes: req.body.notes === '' ? null : req.body.notes,
      };

      const id = parseInt(req.params.id);
      const client = await storage.updateClient(id, clientData);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Erro ao atualizar cliente" });
    }
  });

  app.delete('/api/company/clients/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteClient(id);
      res.json({ message: "Cliente excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Erro ao excluir cliente" });
    }
  });

  // Status API
  app.get('/api/status', async (req, res) => {
    try {
      const statusList = await storage.getStatus();
      res.json(statusList);
    } catch (error) {
      console.error("Error fetching status:", error);
      res.status(500).json({ message: "Erro ao buscar status" });
    }
  });

  app.post('/api/status', async (req, res) => {
    try {
      const status = await storage.createStatus(req.body);
      res.status(201).json(status);
    } catch (error) {
      console.error("Error creating status:", error);
      res.status(500).json({ message: "Erro ao criar status" });
    }
  });

  app.put('/api/status/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const status = await storage.updateStatus(id, req.body);
      res.json(status);
    } catch (error) {
      console.error("Error updating status:", error);
      res.status(500).json({ message: "Erro ao atualizar status" });
    }
  });

  app.delete('/api/status/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStatus(id);
      res.json({ message: "Status excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting status:", error);
      res.status(500).json({ message: "Erro ao excluir status" });
    }
  });

  // Birthday Messages API
  app.get('/api/company/birthday-messages', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const messages = await storage.getBirthdayMessagesByCompany(companyId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching birthday messages:", error);
      res.status(500).json({ message: "Erro ao buscar mensagens de aniversário" });
    }
  });

  app.post('/api/company/birthday-messages', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const messageData = { ...req.body, companyId };
      const message = await storage.createBirthdayMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating birthday message:", error);
      res.status(500).json({ message: "Erro ao criar mensagem de aniversário" });
    }
  });

  app.put('/api/company/birthday-messages/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const id = parseInt(req.params.id);
      const message = await storage.updateBirthdayMessage(id, req.body);
      res.json(message);
    } catch (error) {
      console.error("Error updating birthday message:", error);
      res.status(500).json({ message: "Erro ao atualizar mensagem de aniversário" });
    }
  });

  app.delete('/api/company/birthday-messages/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteBirthdayMessage(id);
      res.json({ message: "Mensagem de aniversário excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting birthday message:", error);
      res.status(500).json({ message: "Erro ao excluir mensagem de aniversário" });
    }
  });

  // Birthday Message History API
  app.get('/api/company/birthday-message-history', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const history = await storage.getBirthdayMessageHistory(companyId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching birthday message history:", error);
      res.status(500).json({ message: "Erro ao buscar histórico de mensagens de aniversário" });
    }
  });

  // Reminder Settings API
  app.get('/api/company/reminder-settings', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const settings = await storage.getReminderSettings(companyId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching reminder settings:", error);
      res.status(500).json({ message: "Erro ao buscar configurações de lembrete" });
    }
  });

  app.put('/api/company/reminder-settings/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const id = parseInt(req.params.id);
      const settings = await storage.updateReminderSettings(id, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating reminder settings:", error);
      res.status(500).json({ message: "Erro ao atualizar configurações de lembrete" });
    }
  });

  // Reminder History API
  app.get('/api/company/reminder-history', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const history = await storage.getReminderHistory(companyId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching reminder history:", error);
      res.status(500).json({ message: "Erro ao buscar histórico de lembretes" });
    }
  });

  // Test reminder function
  app.post('/api/company/test-reminder', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const result = await storage.testReminderFunction(companyId);
      res.json(result);
    } catch (error) {
      console.error("Error testing reminder function:", error);
      res.status(500).json({ message: "Erro ao testar função de lembrete" });
    }
  });

  // Initialize appointment tables
  app.post("/api/admin/init-appointments", async (req, res) => {
    try {
      // Create services table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS services (
          id INT AUTO_INCREMENT PRIMARY KEY,
          company_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          duration INT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          color VARCHAR(7) DEFAULT '#3b82f6',
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_company_id (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Create professionals table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS professionals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          company_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(20),
          specialties JSON,
          work_days JSON,
          work_start_time VARCHAR(5) DEFAULT '09:00',
          work_end_time VARCHAR(5) DEFAULT '18:00',
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_company_id (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Create appointments table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS appointments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          company_id INT NOT NULL,
          service_id INT NOT NULL,
          professional_id INT NOT NULL,
          client_name VARCHAR(255) NOT NULL,
          client_email VARCHAR(255),
          client_phone VARCHAR(20) NOT NULL,
          appointment_date DATE NOT NULL,
          appointment_time VARCHAR(5) NOT NULL,
          duration INT NOT NULL,
          notes TEXT,
          status VARCHAR(20) DEFAULT 'scheduled',
          total_price DECIMAL(10,2) NOT NULL,
          reminder_sent BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_company_id (company_id),
          INDEX idx_appointment_date (appointment_date),
          INDEX idx_professional_date (professional_id, appointment_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Add sample data for first company
      try {
        // Add sample services
        await db.execute(`
          INSERT IGNORE INTO services (company_id, name, description, duration, price, color) VALUES
          (1, 'Corte de Cabelo', 'Corte masculino e feminino', 60, 35.00, '#3b82f6'),
          (1, 'Escova', 'Escova progressiva e modeladora', 90, 45.00, '#ef4444'),
          (1, 'Manicure', 'Cuidados com as unhas das mãos', 45, 25.00, '#10b981'),
          (1, 'Pedicure', 'Cuidados com as unhas dos pés', 60, 30.00, '#f59e0b')
        `);

        // Add sample professionals
        await db.execute(`
          INSERT IGNORE INTO professionals (company_id, name, email, phone, specialties, work_days, work_start_time, work_end_time) VALUES
          (1, 'Maria Silva', 'maria@salao.com', '(11) 99999-1111', '["Corte de Cabelo", "Escova"]', '[1,2,3,4,5,6]', '08:00', '18:00'),
          (1, 'Ana Santos', 'ana@salao.com', '(11) 99999-2222', '["Manicure", "Pedicure"]', '[1,2,3,4,5]', '09:00', '17:00'),
          (1, 'João Costa', 'joao@salao.com', '(11) 99999-3333', '["Corte de Cabelo"]', '[2,3,4,5,6]', '09:00', '19:00')
        `);

        console.log('✅ Sample data added successfully');
      } catch (sampleError) {
        console.log('ℹ️ Sample data may already exist:', sampleError);
      }

      res.json({ message: "Tabelas de agendamentos criadas com sucesso" });
    } catch (error: any) {
      console.error("Error creating appointment tables:", error);
      res.status(500).json({ message: "Erro ao criar tabelas de agendamentos", error: error.message });
    }
  });

  // Initialize status table
  app.post("/api/admin/init-status", async (req, res) => {
    try {
      // Create status table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS status (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          color VARCHAR(7) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Add sample status
      try {
        await db.execute(`
          INSERT IGNORE INTO status (name, color) VALUES
          ('Novo', '#3b82f6'),
          ('Em Andamento', '#f59e0b'),
          ('Concluído', '#10b981'),
          ('Cancelado', '#ef4444'),
          ('Pausado', '#6b7280')
        `);
        console.log('✅ Sample status added successfully');
      } catch (sampleError) {
        console.log('ℹ️ Sample status may already exist:', sampleError);
      }

      res.json({ message: "Tabela de status criada com sucesso" });
    } catch (error: any) {
      console.error("Error creating status table:", error);
      res.status(500).json({ message: "Erro ao criar tabela de status", error: error.message });
    }
  });

  // Initialize birthday messaging tables
  app.post("/api/admin/init-birthday-messages", async (req, res) => {
    try {
      // Create birthday messages table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS birthday_messages (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          message_template TEXT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Create birthday message history table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS birthday_message_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          client_id INT,
          client_name VARCHAR(255) NOT NULL,
          client_phone VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'sent',
          whatsapp_instance_id INT,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
          FOREIGN KEY (whatsapp_instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('✅ Birthday messaging tables created successfully');
      res.json({ message: "Tabelas de mensagens de aniversário criadas com sucesso" });
    } catch (error: any) {
      console.error("Error creating birthday messaging tables:", error);
      res.status(500).json({ message: "Erro ao criar tabelas de mensagens de aniversário", error: error.message });
    }
  });

  // Send birthday message to specific client
  app.post('/api/company/send-birthday-message/:clientId', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { clientId } = req.params;

      // Get client information
      const client = await storage.getClient(parseInt(clientId));
      if (!client || client.companyId !== companyId) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      if (!client.phone) {
        return res.status(400).json({ message: "Cliente não possui telefone cadastrado" });
      }

      // Get company information
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      // Get active birthday message template
      const birthdayMessages = await storage.getBirthdayMessagesByCompany(companyId);
      const activeMessage = birthdayMessages.find(msg => msg.isActive);
      
      if (!activeMessage) {
        return res.status(400).json({ message: "Nenhuma mensagem de aniversário ativa configurada" });
      }

      // Get WhatsApp instance for the company
      const whatsappInstances = await storage.getWhatsappInstancesByCompany(companyId);
      console.log('=== DEBUG WHATSAPP INSTANCES ===');
      console.log('Company ID:', companyId);
      console.log('Total instances found:', whatsappInstances.length);
      whatsappInstances.forEach((instance, index) => {
        console.log(`Instance ${index + 1}:`, {
          id: instance.id,
          instanceName: instance.instanceName,
          status: instance.status,
          hasApiUrl: !!instance.apiUrl,
          hasApiKey: !!instance.apiKey,
          apiUrl: instance.apiUrl
        });
      });

      // Try to find active instance with more flexible criteria
      let activeInstance = whatsappInstances.find(instance => 
        (instance.status === 'connected' || instance.status === 'open') && instance.apiUrl && instance.apiKey
      );

      // If no active instance found, try with any instance that has API credentials
      if (!activeInstance) {
        activeInstance = whatsappInstances.find(instance => instance.apiUrl && instance.apiKey);
        if (activeInstance) {
          console.log('Using instance with credentials despite status:', activeInstance.status);
        }
      }
      
      if (!activeInstance) {
        // Check if there's any instance at all for debugging
        const anyInstance = whatsappInstances.find(instance => instance.instanceName);
        if (anyInstance) {
          console.log('Available instance but incomplete:', anyInstance);
          return res.status(400).json({ 
            message: "Instância WhatsApp encontrada mas não configurada completamente",
            details: {
              instancia: anyInstance.instanceName,
              status: anyInstance.status,
              temApiUrl: !!anyInstance.apiUrl,
              temApiKey: !!anyInstance.apiKey
            }
          });
        }
        return res.status(400).json({ message: "Nenhuma instância WhatsApp conectada encontrada" });
      }

      // Replace placeholders in message template
      let messageText = activeMessage.messageTemplate || activeMessage.message || '';
      if (messageText) {
        messageText = messageText.replace(/{NOME}/g, client.name);
        messageText = messageText.replace(/{EMPRESA}/g, company.fantasyName);
      }

      // Clean and format phone number (remove non-digits and ensure format)
      let cleanPhone = client.phone.replace(/\D/g, '');
      
      // Ensure phone number starts with country code
      if (!cleanPhone.startsWith('55')) {
        if (cleanPhone.length === 11 || cleanPhone.length === 10) {
          cleanPhone = '55' + cleanPhone;
        }
      }
      
      // Validate phone number format
      if (cleanPhone.length < 12 || cleanPhone.length > 13) {
        return res.status(400).json({ 
          message: "Formato de telefone inválido", 
          details: `Número deve ter 12-13 dígitos (com DDI 55). Recebido: ${cleanPhone} (${cleanPhone.length} dígitos)`
        });
      }
      
      // Send message via Evolution API
      const sendMessageUrl = `${activeInstance.apiUrl}/message/sendText/${activeInstance.instanceName}`;
      
      const messageData = {
        number: cleanPhone,
        text: messageText
      };

      console.log('=== SENDING BIRTHDAY MESSAGE ===');
      console.log('API URL:', sendMessageUrl);
      console.log('Client:', client.name);
      console.log('Phone:', cleanPhone);
      console.log('Message:', messageText);
      console.log('API Key being used:', activeInstance.apiKey?.substring(0, 8) + '...');

      const response = await fetch(sendMessageUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': activeInstance.apiKey || ''
        },
        body: JSON.stringify(messageData)
      });

      const responseData = await response.json();
      console.log('Evolution API Response:', responseData);

      let status = 'sent';
      if (!response.ok) {
        status = 'error';
        console.error('Error sending birthday message:', responseData);
        
        // Log detailed error information
        if (responseData.response && responseData.response.message) {
          console.error('Detailed error message:', JSON.stringify(responseData.response.message, null, 2));
        }
        
        // Return more specific error to client
        const errorMessage = responseData.response?.message?.[0] || responseData.message || 'Erro desconhecido da API';
        return res.status(500).json({ 
          message: "Erro ao enviar mensagem de aniversário", 
          error: errorMessage,
          phone: cleanPhone,
          apiResponse: responseData
        });
      }

      // Save to history
      await storage.createBirthdayMessageHistory({
        companyId,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        message: messageText,
        status,
        whatsappInstanceId: activeInstance.id
      });

      if (status === 'sent') {
        res.json({ 
          message: "Mensagem de aniversário enviada com sucesso",
          client: client.name,
          phone: client.phone,
          messageText
        });
      } else {
        res.status(500).json({ 
          message: "Erro ao enviar mensagem de aniversário",
          error: responseData.message || 'Erro desconhecido'
        });
      }

    } catch (error: any) {
      console.error('Error sending birthday message:', error);
      res.status(500).json({ message: "Erro interno do servidor", error: error.message });
    }
  });

  // Test birthday message functionality
  app.post('/api/company/test-birthday-message', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { testPhoneNumber } = req.body;
      if (!testPhoneNumber) {
        return res.status(400).json({ message: "Número de telefone para teste é obrigatório" });
      }

      // Get company information
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      // Get active birthday message template
      const birthdayMessages = await storage.getBirthdayMessagesByCompany(companyId);
      const activeMessage = birthdayMessages.find(msg => msg.isActive);
      
      if (!activeMessage) {
        return res.status(400).json({ message: "Nenhuma mensagem de aniversário ativa configurada" });
      }

      // Get WhatsApp instance for the company
      const whatsappInstances = await storage.getWhatsappInstancesByCompany(companyId);
      const activeInstance = whatsappInstances.find(instance => 
        (instance.status === 'connected' || instance.status === 'open') && instance.apiUrl && instance.apiKey
      );
      
      if (!activeInstance) {
        // Check if there's any instance at all
        const anyInstance = whatsappInstances.find(instance => instance.instanceName);
        if (anyInstance) {
          return res.status(400).json({ 
            message: "Instância WhatsApp encontrada mas não configurada completamente",
            details: {
              instancia: anyInstance.instanceName,
              status: anyInstance.status,
              temApiUrl: !!anyInstance.apiUrl,
              temApiKey: !!anyInstance.apiKey
            }
          });
        }
        return res.status(400).json({ message: "Nenhuma instância WhatsApp configurada encontrada" });
      }

      // Test with example data
      let testMessage = activeMessage.messageTemplate;
      testMessage = testMessage.replace(/{NOME}/g, 'João Silva (TESTE)');
      testMessage = testMessage.replace(/{EMPRESA}/g, company.fantasyName);

      console.log('=== ENVIANDO TESTE DE MENSAGEM DE ANIVERSÁRIO ===');
      console.log('Empresa:', company.fantasyName);
      console.log('Instância WhatsApp:', activeInstance.instanceName);
      console.log('Número de teste:', testPhoneNumber);
      console.log('Mensagem de teste:');
      console.log(testMessage);
      console.log('===============================================');

      // Actually send the WhatsApp message via Evolution API
      const messageData = {
        number: testPhoneNumber,
        text: testMessage
      };

      const response = await fetch(`${activeInstance.apiUrl}/message/sendText/${activeInstance.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': activeInstance.apiKey || ''
        },
        body: JSON.stringify(messageData)
      });

      const responseData = await response.json();
      console.log('Evolution API Response:', responseData);

      if (response.ok && responseData.key) {
        console.log('✅ Mensagem de teste enviada com sucesso!');
        res.json({ 
          message: "Mensagem de teste enviada com sucesso!",
          details: {
            empresa: company.fantasyName,
            instanciaWhatsApp: activeInstance.instanceName,
            statusInstancia: activeInstance.status,
            numeroTeste: testPhoneNumber,
            mensagemTeste: testMessage,
            messageId: responseData.key.id,
            status: 'enviada'
          }
        });
      } else {
        console.error('❌ Erro ao enviar mensagem:', responseData);
        res.status(400).json({
          message: "Erro ao enviar mensagem de teste",
          error: responseData.message || 'Erro desconhecido',
          details: responseData
        });
      }

    } catch (error: any) {
      console.error('Error testing birthday message:', error);
      res.status(500).json({ message: "Erro interno do servidor", error: error.message });
    }
  });

  // Auto-configure webhook using global settings
  app.post('/api/company/whatsapp/:instanceId/auto-configure-webhook', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { instanceId } = req.params;

      // Get the instance and verify ownership
      const instance = await storage.getWhatsappInstance(parseInt(instanceId));
      if (!instance || instance.companyId !== companyId) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }

      // Get global Evolution API settings
      const globalSettings = await storage.getGlobalSettings();
      console.log('=== AUTO CONFIGURE WEBHOOK ===');
      console.log('Instance ID:', instanceId);
      console.log('Instance name:', instance.instanceName);
      console.log('Global settings found:', !!globalSettings);
      console.log('Evolution API URL:', globalSettings?.evolutionApiUrl);
      console.log('Evolution API Key exists:', !!globalSettings?.evolutionApiGlobalKey);
      
      // Force configuration with dummy data for testing
      if (!globalSettings?.evolutionApiUrl) {
        console.log('No global Evolution API settings found - using instance settings or prompting for configuration');
        return res.status(400).json({ 
          message: "Evolution API não configurada",
          details: "Acesse as configurações do administrador e configure a URL e chave global da Evolution API antes de configurar o agente IA"
        });
      }

      // Generate webhook URL for this instance
      const webhookUrl = generateWebhookUrl(req, instance.instanceName);

      // Update instance with global API details and webhook
      await storage.updateWhatsappInstance(parseInt(instanceId), {
        apiUrl: globalSettings.evolutionApiUrl,
        apiKey: globalSettings.evolutionApiGlobalKey,
        webhook: webhookUrl
      });

      // Configure webhook in Evolution API
      try {
        const webhookPayload = {
          webhook: {
            enabled: true,
            url: webhookUrl,
            headers: {
              authorization: `Bearer ${globalSettings.evolutionApiGlobalKey}`,
              "Content-Type": "application/json"
            }
          },
          byEvents: false,
          base64: false,
          events: [
            "APPLICATION_STARTUP",
            "QRCODE_UPDATED",
            "MESSAGES_SET",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "MESSAGES_DELETE",
            "SEND_MESSAGE",
            "CONTACTS_SET",
            "CONTACTS_UPSERT",
            "CONTACTS_UPDATE",
            "PRESENCE_UPDATE",
            "CHATS_SET",
            "CHATS_UPSERT",
            "CHATS_UPDATE",
            "CHATS_DELETE",
            "GROUPS_UPSERT",
            "GROUP_UPDATE",
            "GROUP_PARTICIPANTS_UPDATE",
            "CONNECTION_UPDATE",
            "LABELS_EDIT",
            "LABELS_ASSOCIATION",
            "CALL",
            "TYPEBOT_START",
            "TYPEBOT_CHANGE_STATUS"
          ]
        };

        console.log('Configuring webhook for instance:', instance.instanceName);
        console.log('Evolution API URL:', globalSettings.evolutionApiUrl);
        console.log('Webhook URL:', webhookUrl);
        console.log('Payload:', JSON.stringify(webhookPayload, null, 2));

        const apiKey = globalSettings.evolutionApiGlobalKey;
        if (!apiKey) {
          return res.status(400).json({ 
            message: "Chave da Evolution API não configurada" 
          });
        }

        const webhookResponse = await fetch(`${globalSettings.evolutionApiUrl}/webhook/set/${instance.instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          },
          body: JSON.stringify(webhookPayload)
        });

        const responseText = await webhookResponse.text();
        console.log('Evolution API response status:', webhookResponse.status);
        console.log('Evolution API response:', responseText);

        if (webhookResponse.ok) {
          res.json({ 
            message: "Agente IA configurado com sucesso",
            webhookUrl,
            configured: true,
            evolutionResponse: responseText
          });
        } else {
          console.error('Evolution API webhook error:', responseText);
          res.status(400).json({ 
            message: "Erro ao configurar webhook na Evolution API",
            error: responseText,
            status: webhookResponse.status
          });
        }
      } catch (webhookError: any) {
        console.error('Webhook configuration error:', webhookError);
        res.status(500).json({ 
          message: "Erro ao conectar com a Evolution API",
          error: webhookError?.message || 'Erro desconhecido'
        });
      }
    } catch (error) {
      console.error('Auto-configure webhook error:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Configure webhook for WhatsApp instance (manual)
  app.post('/api/company/whatsapp/:instanceId/configure-webhook', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { instanceId } = req.params;

      // Get the instance and verify ownership
      const instance = await storage.getWhatsappInstance(parseInt(instanceId));
      if (!instance || instance.companyId !== companyId) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }

      // Get global Evolution API settings
      const globalSettings = await storage.getGlobalSettings();
      if (!globalSettings?.evolutionApiUrl || !globalSettings?.evolutionApiGlobalKey) {
        return res.status(400).json({ 
          message: "Evolution API não configurada",
          details: "Configure a Evolution API nas configurações do administrador primeiro"
        });
      }

      // Generate webhook URL for this instance
      const webhookUrl = generateWebhookUrl(req, instance.instanceName);

      // Update instance with global API details and webhook
      await storage.updateWhatsappInstance(parseInt(instanceId), {
        apiUrl: globalSettings.evolutionApiUrl,
        apiKey: globalSettings.evolutionApiGlobalKey,
        webhook: webhookUrl
      });

      // Configure webhook in Evolution API using global credentials
      try {
        const webhookResponse = await fetch(`${globalSettings.evolutionApiUrl}/webhook/set/${instance.instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': globalSettings.evolutionApiGlobalKey
          },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              base64: true,
              events: [
                "QRCODE_UPDATED",
                "MESSAGES_UPSERT",
                "CONNECTION_UPDATE"
              ]
            },
            webhook_by_events: false
          })
        });

        if (webhookResponse.ok) {
          res.json({ 
            message: "Webhook configurado com sucesso",
            webhookUrl,
            configured: true
          });
        } else {
          const errorText = await webhookResponse.text();
          console.error('Evolution API webhook error:', errorText);
          res.status(400).json({ 
            message: "Erro ao configurar webhook na Evolution API",
            error: errorText
          });
        }
      } catch (webhookError: any) {
        console.error('Webhook configuration error:', webhookError);
        res.status(500).json({ 
          message: "Erro ao conectar com a Evolution API",
          error: webhookError?.message || 'Erro desconhecido'
        });
      }
    } catch (error) {
      console.error('Configure webhook error:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Test AI agent with company's custom prompt
  app.post('/api/company/ai-agent/test', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { message } = req.body;
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }

      // Get company's AI agent prompt
      const company = await storage.getCompany(companyId);
      if (!company || !company.aiAgentPrompt) {
        return res.status(400).json({ message: "Nenhum prompt de agente IA configurado" });
      }

      // Get global OpenAI settings
      const globalSettings = await storage.getGlobalSettings();
      if (!globalSettings || !globalSettings.openaiApiKey) {
        return res.status(400).json({ message: "OpenAI não configurada pelo administrador" });
      }

      // Create OpenAI instance
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ 
        apiKey: globalSettings.openaiApiKey 
      });

      // Build system prompt with company's custom prompt
      const systemPrompt = `${company.aiAgentPrompt}

Importante: Você está representando a empresa "${company.fantasyName}". Mantenha suas respostas consistentes com o contexto da empresa e sempre seja profissional.`;

      // Make request to OpenAI
      const completion = await openai.chat.completions.create({
        model: globalSettings.openaiModel || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message.trim() }
        ],
        temperature: parseFloat(globalSettings.openaiTemperature?.toString() || '0.7'),
        max_tokens: Math.min(parseInt(globalSettings.openaiMaxTokens?.toString() || '1000'), 2000),
      });

      const response = completion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';

      res.json({
        response,
        usage: completion.usage,
        model: completion.model
      });

    } catch (error: any) {
      console.error("Error testing AI agent:", error);
      
      let errorMessage = "Erro interno do servidor";
      if (error.code === 'insufficient_quota') {
        errorMessage = "Cota da API OpenAI esgotada";
      } else if (error.code === 'invalid_api_key') {
        errorMessage = "Chave da API OpenAI inválida";
      } else if (error.message?.includes('API key')) {
        errorMessage = "Erro na autenticação com OpenAI";
      }

      res.status(500).json({ message: errorMessage });
    }
  });

  // WhatsApp instances routes
  app.get('/api/company/whatsapp/instances', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Create WhatsApp instances table if it doesn't exist
      try {
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
        console.log("WhatsApp instances table created/verified successfully");
      } catch (tableError: any) {
        console.log("Table creation error:", tableError.message);
        // Continue with temporary storage if table creation fails
      }

      try {
        const instances = await storage.getWhatsappInstancesByCompany(companyId);
        res.json(instances);
      } catch (dbError: any) {
        if (dbError.code === 'ER_NO_SUCH_TABLE') {
          // Table doesn't exist, use temporary storage
          const companyInstances = tempWhatsappInstances.filter(instance => instance.companyId === companyId);
          res.json(companyInstances);
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error("Error fetching WhatsApp instances:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post('/api/company/whatsapp/instances', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { instanceName } = req.body;
      
      if (!instanceName) {
        return res.status(400).json({ message: "Nome da instância é obrigatório" });
      }

      // Get Evolution API settings
      const settings = await storage.getGlobalSettings();
      if (!settings?.evolutionApiUrl || !settings?.evolutionApiGlobalKey) {
        return res.status(400).json({ message: "Evolution API não configurada no sistema" });
      }

      // Create instance in Evolution API
      const evolutionResponse = await fetch(`${settings.evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': settings.evolutionApiGlobalKey,
        },
        body: JSON.stringify({
          instanceName: instanceName,
          token: instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhookUrl: "",
          webhookByEvents: false,
          webhookBase64: false,
          chatwootAccountId: "",
          chatwootToken: "",
          chatwootUrl: "",
          chatwootSignMsg: false,
          chatwootReopenConversation: false,
          chatwootConversationPending: false
        }),
      });

      if (!evolutionResponse.ok) {
        const errorData = await evolutionResponse.text();
        console.error("Evolution API error:", errorData);
        return res.status(400).json({ message: "Erro ao criar instância na Evolution API" });
      }

      const evolutionData = await evolutionResponse.json();

      // Try to save instance to database
      try {
        const instance = await storage.createWhatsappInstance({
          companyId,
          instanceName,
          status: 'created',
          apiUrl: settings.evolutionApiUrl,
          apiKey: settings.evolutionApiGlobalKey
        });

        // Auto-configure webhook for the new instance
        try {
          console.log('🤖 Auto-configurando webhook para instância:', instanceName);
          
          const webhookUrl = generateWebhookUrl(req, instanceName);
          
          const webhookPayload = {
            webhook: {
              enabled: true,
              url: webhookUrl,
              base64: true,
              events: [
                "QRCODE_UPDATED",
                "MESSAGES_UPSERT",
                "CONNECTION_UPDATE"
              ]
            },
            webhook_by_events: false
          };

          const webhookResponse = await fetch(`${settings.evolutionApiUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': settings.evolutionApiGlobalKey
            },
            body: JSON.stringify(webhookPayload)
          });

          if (webhookResponse.ok) {
            // Update instance with webhook URL
            await storage.updateWhatsappInstance(instance.id, {
              webhook: webhookUrl
            });
            console.log('✅ Webhook configurado automaticamente para:', instanceName);
          } else {
            const errorText = await webhookResponse.text();
            console.log('⚠️ Falha ao configurar webhook automaticamente:', errorText);
          }
        } catch (webhookError) {
          console.error('⚠️ Erro ao configurar webhook automaticamente:', webhookError);
        }

        res.json({
          ...instance,
          evolutionData,
        });
      } catch (dbError: any) {
        if (dbError.code === 'ER_NO_SUCH_TABLE') {
          // Table doesn't exist, use temporary storage
          const newInstance = {
            id: Date.now(),
            companyId,
            instanceName,
            status: 'created',
            createdAt: new Date(),
            updatedAt: new Date(),
            apiUrl: settings.evolutionApiUrl,
            apiKey: settings.evolutionApiGlobalKey,
            webhook: null as string | null
          };
          
          tempWhatsappInstances.push(newInstance);
          
          // Auto-configure webhook for temporary instance too
          try {
            console.log('🤖 Auto-configurando webhook para instância temporária:', instanceName);
            
            const webhookUrl = generateWebhookUrl(req, instanceName);
            
            const webhookPayload = {
              webhook: {
                enabled: true,
                url: webhookUrl,
                base64: true,
                events: [
                  "QRCODE_UPDATED",
                  "MESSAGES_UPSERT",
                  "CONNECTION_UPDATE"
                ]
              },
              webhook_by_events: false
            };

            const webhookResponse = await fetch(`${settings.evolutionApiUrl}/webhook/set/${instanceName}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': settings.evolutionApiGlobalKey
              },
              body: JSON.stringify(webhookPayload)
            });

            if (webhookResponse.ok) {
              (newInstance as any).webhook = webhookUrl;
              console.log('✅ Webhook configurado automaticamente para instância temporária:', instanceName);
            } else {
              const errorText = await webhookResponse.text();
              console.log('⚠️ Falha ao configurar webhook automaticamente:', errorText);
            }
          } catch (webhookError) {
            console.error('⚠️ Erro ao configurar webhook automaticamente:', webhookError);
          }
          
          res.json({
            ...newInstance,
            evolutionData,
          });
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error("Error creating WhatsApp instance:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete('/api/company/whatsapp/instances/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const instanceId = parseInt(req.params.id);
      let instance;

      try {
        instance = await storage.getWhatsappInstance(instanceId);
      } catch (dbError: any) {
        if (dbError.code === 'ER_NO_SUCH_TABLE') {
          // Table doesn't exist, check temporary storage
          instance = tempWhatsappInstances.find(inst => 
            inst.id === instanceId && inst.companyId === companyId
          );
        } else {
          throw dbError;
        }
      }

      if (!instance || instance.companyId !== companyId) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }

      // Delete from Evolution API
      const settings = await storage.getGlobalSettings();
      if (settings?.evolutionApiUrl && settings?.evolutionApiGlobalKey) {
        try {
          await fetch(`${settings.evolutionApiUrl}/instance/delete/${instance.instanceName}`, {
            method: 'DELETE',
            headers: {
              'apikey': settings.evolutionApiGlobalKey,
            },
          });
        } catch (error) {
          console.error("Error deleting from Evolution API:", error);
        }
      }

      // Delete from database or temporary storage
      try {
        await storage.deleteWhatsappInstance(instanceId);
      } catch (dbError: any) {
        if (dbError.code === 'ER_NO_SUCH_TABLE') {
          // Table doesn't exist, remove from temporary storage
          const index = tempWhatsappInstances.findIndex(inst => 
            inst.id === instanceId && inst.companyId === companyId
          );
          if (index > -1) {
            tempWhatsappInstances.splice(index, 1);
          }
        } else {
          throw dbError;
        }
      }

      res.json({ message: "Instância excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting WhatsApp instance:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST route to trigger QR code generation for connecting instance
  app.post('/api/company/whatsapp/instances/:instanceName/connect', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { instanceName } = req.params;
      
      // Get instance by name and verify ownership
      const instance = await storage.getWhatsappInstanceByName(instanceName);
      if (!instance || instance.companyId !== companyId) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }

      // Get global Evolution API settings
      const settings = await storage.getGlobalSettings();
      if (!settings?.evolutionApiUrl || !settings?.evolutionApiGlobalKey) {
        return res.status(400).json({ message: "Evolution API não configurada" });
      }

      console.log(`🔗 Triggering connection for instance: ${instanceName}`);

      // Trigger QR code generation by requesting instance connection
      const evolutionResponse = await fetch(`${settings.evolutionApiUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': settings.evolutionApiGlobalKey,
        },
      });

      if (!evolutionResponse.ok) {
        const errorData = await evolutionResponse.text();
        console.error("Evolution API connect error:", errorData);
        return res.status(400).json({ message: "Erro ao conectar instância na Evolution API" });
      }

      console.log(`✅ Connection request sent for instance: ${instanceName}`);
      console.log(`📱 QR code will be received via webhook and saved to database`);

      // Return success - QR code will come via webhook
      res.json({
        message: "Solicitação de conexão enviada. QR code será gerado em breve.",
        instanceName,
        status: "connecting"
      });

    } catch (error: any) {
      console.error("Error connecting WhatsApp instance:", error);
      res.status(500).json({ message: "Erro interno do servidor", error: error.message });
    }
  });

  app.get('/api/company/whatsapp/instances/:instanceName/connect', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { instanceName } = req.params;

      // Get Evolution API settings
      let settings = await storage.getGlobalSettings();
      
      if (!settings?.evolutionApiUrl || !settings?.evolutionApiGlobalKey) {
        return res.status(400).json({ 
          message: "Evolution API não configurada. Configure a URL e chave da API nas configurações do sistema.",
          needsConfig: true 
        });
      }

      try {
        // Call the real Evolution API to get connection QR code
        const evolutionResponse = await fetch(`${settings.evolutionApiUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': settings.evolutionApiGlobalKey,
          },
        });

        if (!evolutionResponse.ok) {
          const errorText = await evolutionResponse.text();
          console.error("Evolution API connection error:", errorText);
          
          // If instance doesn't exist, suggest creating it first
          if (evolutionResponse.status === 404) {
            return res.status(404).json({ 
              message: "Instância não encontrada na Evolution API. Crie a instância primeiro.",
              needsCreate: true 
            });
          }
          
          return res.status(400).json({ 
            message: `Erro da Evolution API: ${evolutionResponse.status} - ${errorText}` 
          });
        }

        const evolutionData = await evolutionResponse.json();
        console.log(`🔍 Evolution API Response for ${instanceName}:`, JSON.stringify(evolutionData, null, 2));
        
        // Check for QR code in multiple possible fields
        const qrCodeData = evolutionData.base64 || evolutionData.qrcode || evolutionData.qr || 
                          evolutionData.data?.qrcode || evolutionData.data?.base64;
        
        console.log(`📱 QR code found: ${!!qrCodeData}, Length: ${qrCodeData?.length || 0}`);
        
        if (qrCodeData && qrCodeData.length > 50) {
          const qrCodeUrl = qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`;
          console.log(`✅ Returning QR code for ${instanceName}, Preview: ${qrCodeUrl.substring(0, 100)}...`);
          
          // Update instance status in database
          try {
            const instances = await storage.getWhatsappInstancesByCompany(companyId);
            const instance = instances.find(inst => inst.instanceName === instanceName);
            if (instance) {
              await storage.updateWhatsappInstance(instance.id, {
                status: 'connecting',
                qrCode: qrCodeUrl
              });
              console.log(`💾 QR code saved to database for instance ${instanceName}`);
            }
          } catch (dbError) {
            console.error("Error updating instance status:", dbError);
          }
          
          res.json({
            instanceName,
            status: 'connecting',
            qrcode: qrCodeUrl,
            base64: qrCodeUrl,
            qr: qrCodeUrl,
            message: "QR code obtido da Evolution API. Escaneie com seu WhatsApp para conectar.",
            evolutionData
          });
        } else {
          res.status(400).json({ 
            message: "QR code não encontrado na resposta da Evolution API",
            evolutionData 
          });
        }
      } catch (fetchError: any) {
        console.error("Error calling Evolution API:", fetchError);
        res.status(500).json({ 
          message: `Erro ao conectar com Evolution API: ${fetchError.message}` 
        });
      }
    } catch (error) {
      console.error("Error connecting WhatsApp instance:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Configure webhook for AI agent
  app.post('/api/company/whatsapp/instances/:id/configure-webhook', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const instanceId = parseInt(req.params.id);
      
      // Get instance from database
      const instance = await storage.getWhatsappInstance(instanceId);
      if (!instance || instance.companyId !== companyId) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }

      // Get global settings for Evolution API
      const settings = await storage.getGlobalSettings();
      if (!settings?.evolutionApiUrl || !settings?.evolutionApiGlobalKey) {
        return res.status(400).json({ 
          message: "Evolution API não configurada. Configure nas configurações do administrador primeiro."
        });
      }

      // Generate webhook URL
      const webhookUrl = generateWebhookUrl(req, instance.instanceName);
      
      // Configure webhook on Evolution API
      const webhookPayload = {
        webhook: {
          enabled: true,
          url: webhookUrl,
          base64: true,
          events: [
            "QRCODE_UPDATED",
            "MESSAGES_UPSERT",
            "CONNECTION_UPDATE"
          ]
        },
        webhook_by_events: false
      };

      const webhookResponse = await fetch(`${settings.evolutionApiUrl}/webhook/set/${instance.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': settings.evolutionApiGlobalKey
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error("Error configuring webhook:", errorText);
        return res.status(400).json({ 
          message: "Erro ao configurar webhook na Evolution API",
          error: errorText
        });
      }

      // Update instance with webhook URL
      await storage.updateWhatsappInstance(instanceId, {
        webhook: webhookUrl
      });

      const webhookData = await webhookResponse.json();
      
      res.json({
        message: "Webhook configurado com sucesso",
        webhookUrl,
        evolutionResponse: webhookData
      });

    } catch (error: any) {
      console.error("Error configuring webhook:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get instance details including API key
  app.get('/api/company/whatsapp/instances/:instanceName/details', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { instanceName } = req.params;
      
      // Get the instance from database
      const instance = await storage.getWhatsappInstanceByName(instanceName);
      if (!instance || instance.companyId !== companyId) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }

      // Get Evolution API settings
      const settings = await storage.getGlobalSettings();
      
      if (!settings?.evolutionApiUrl || !settings?.evolutionApiGlobalKey) {
        return res.status(400).json({ 
          message: "Evolution API não configurada.",
          needsConfig: true 
        });
      }

      try {
        // Get instance details from Evolution API
        const evolutionResponse = await fetch(`${settings.evolutionApiUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': settings.evolutionApiGlobalKey,
          }
        });

        let evolutionData = null;
        if (evolutionResponse.ok) {
          evolutionData = await evolutionResponse.json();
        }

        res.json({
          instance: {
            ...instance,
            apiUrl: settings.evolutionApiUrl,
            apiKey: settings.evolutionApiGlobalKey
          },
          evolutionDetails: evolutionData
        });
      } catch (error) {
        console.error('Error fetching Evolution API details:', error);
        res.json({
          instance: {
            ...instance,
            apiUrl: settings.evolutionApiUrl,
            apiKey: settings.evolutionApiGlobalKey
          },
          evolutionDetails: null,
          error: 'Não foi possível conectar com a Evolution API'
        });
      }
    } catch (error) {
      console.error('Error fetching instance details:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get WhatsApp instance connection status
  app.get('/api/company/whatsapp/instances/:instanceName/status', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { instanceName } = req.params;

      // Get Evolution API settings
      const settings = await storage.getGlobalSettings();
      
      if (!settings?.evolutionApiUrl || !settings?.evolutionApiGlobalKey) {
        return res.status(400).json({ 
          message: "Evolution API não configurada.",
          needsConfig: true 
        });
      }

      try {
        // Call Evolution API to get connection status
        const evolutionResponse = await fetch(`${settings.evolutionApiUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': settings.evolutionApiGlobalKey,
          },
        });

        if (!evolutionResponse.ok) {
          const errorText = await evolutionResponse.text();
          console.error("Evolution API status error:", errorText);
          
          if (evolutionResponse.status === 404) {
            return res.status(404).json({ 
              message: "Instância não encontrada na Evolution API.",
              status: "not_found"
            });
          }
          
          return res.status(400).json({ 
            message: `Erro da Evolution API: ${evolutionResponse.status}`,
            status: "error"
          });
        }

        const statusData = await evolutionResponse.json();
        console.log("Evolution API Status Response:", JSON.stringify(statusData, null, 2));
        
        // Extract status information from various possible response formats
        let connectionStatus = 'unknown';
        if (statusData.state) {
          connectionStatus = statusData.state;
        } else if (statusData.status) {
          connectionStatus = statusData.status;
        } else if (statusData.instance && statusData.instance.state) {
          connectionStatus = statusData.instance.state;
        } else if (statusData.connectionState) {
          connectionStatus = statusData.connectionState;
        }
        
        console.log("Extracted connection status:", connectionStatus);
        
        // Update instance status in database
        try {
          const instances = await storage.getWhatsappInstancesByCompany(companyId);
          const instance = instances.find(inst => inst.instanceName === instanceName);
          if (instance) {
            await storage.updateWhatsappInstance(instance.id, {
              status: connectionStatus
            });
            console.log(`Updated instance ${instanceName} status to: ${connectionStatus}`);
          }
        } catch (dbError) {
          console.error("Error updating instance status:", dbError);
        }
        
        res.json({
          instanceName,
          connectionStatus,
          instance: statusData.instance || {},
          message: `Status da instância: ${connectionStatus}`,
          rawResponse: statusData
        });
      } catch (fetchError: any) {
        console.error("Error calling Evolution API status:", fetchError);
        res.status(500).json({ 
          message: `Erro ao conectar com Evolution API: ${fetchError.message}`,
          status: "connection_error"
        });
      }
    } catch (error) {
      console.error("Error getting WhatsApp instance status:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Real-time status refresh endpoint
  app.get('/api/company/whatsapp/instances/:instanceName/refresh-status', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { instanceName } = req.params;
      
      // Get the instance from database
      const instance = await storage.getWhatsappInstanceByName(instanceName);
      if (!instance || instance.companyId !== companyId) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }

      // Get Evolution API settings to check live status
      const settings = await storage.getGlobalSettings();
      let liveStatus = instance.status || 'disconnected';
      
      if (settings?.evolutionApiUrl && settings?.evolutionApiGlobalKey) {
        try {
          // Check live status from Evolution API
          const statusResponse = await fetch(`${settings.evolutionApiUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'apikey': settings.evolutionApiGlobalKey,
            }
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log(`Live status check for ${instanceName}:`, statusData);
            
            // Map Evolution API states to our status
            if (statusData.instance?.state === 'open') {
              liveStatus = 'connected';
            } else if (statusData.instance?.state === 'connecting') {
              liveStatus = 'connecting';
            } else if (statusData.instance?.state === 'close') {
              liveStatus = 'disconnected';
            }
            
            // Update database if status changed
            if (liveStatus !== instance.status) {
              await storage.updateWhatsappInstance(instance.id, {
                status: liveStatus
              });
              console.log(`Updated ${instanceName} status from ${instance.status} to ${liveStatus}`);
            }
          }
        } catch (apiError) {
          console.error("Error checking live status:", apiError);
        }
      }

      // Return current status
      res.json({
        instanceName,
        status: liveStatus,
        qrCode: instance.qrCode,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error("Error refreshing WhatsApp instance status:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Disconnect WhatsApp instance
  app.post("/api/company/whatsapp/instances/:instanceName/disconnect", async (req: any, res) => {
    try {
      const { instanceName } = req.params;
      const companyId = req.session.companyId;
      
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Get global settings for Evolution API configuration
      const globalSettings = await storage.getGlobalSettings();
      
      if (!globalSettings?.evolutionApiUrl || !globalSettings?.evolutionApiGlobalKey) {
        return res.status(400).json({ 
          message: "Evolution API não configurada. Configure a URL e chave global nas configurações do administrador.",
          status: "not_configured"
        });
      }

      console.log(`Disconnecting WhatsApp instance: ${instanceName}`);

      // Call Evolution API to disconnect the instance
      const evolutionResponse = await fetch(
        `${globalSettings.evolutionApiUrl}/instance/logout/${instanceName}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'apikey': globalSettings.evolutionApiGlobalKey
          }
        }
      );

      if (!evolutionResponse.ok) {
        const errorText = await evolutionResponse.text();
        console.error("Evolution API disconnect error:", errorText);
        return res.status(evolutionResponse.status).json({ 
          message: `Erro da Evolution API: ${errorText}`,
          status: "error"
        });
      }

      const disconnectData = await evolutionResponse.json();
      console.log("Evolution API Disconnect Response:", JSON.stringify(disconnectData, null, 2));

      // Update instance status in database
      try {
        const instances = await storage.getWhatsappInstancesByCompany(companyId);
        const instance = instances.find(inst => inst.instanceName === instanceName);
        if (instance) {
          await storage.updateWhatsappInstance(instance.id, {
            status: 'disconnected'
          });
          console.log(`Updated instance ${instanceName} status to: disconnected`);
        }
      } catch (dbError) {
        console.error("Error updating instance status:", dbError);
      }

      res.json({
        instanceName,
        message: "Instância desconectada com sucesso",
        status: "disconnected",
        ...disconnectData
      });
    } catch (error: any) {
      console.error("Error disconnecting WhatsApp instance:", error);
      if (error.message && error.message.includes('fetch')) {
        res.status(500).json({ 
          message: `Erro ao conectar com Evolution API: ${error.message}`,
          status: "connection_error"
        });
      } else {
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  });

  // ChatGPT chat endpoint
  app.post('/api/chat', isAuthenticated, async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }

      const settings = await storage.getGlobalSettings();
      if (!settings?.openaiApiKey) {
        return res.status(400).json({ message: "Chave da API OpenAI não configurada nas configurações do sistema" });
      }

      // Prepare messages for OpenAI - filter out any messages with null/empty content
      const validMessages = conversationHistory.filter((msg: any) => 
        msg.content && msg.content.trim().length > 0
      );

      const messages = [
        {
          role: "system",
          content: "Você é um assistente virtual inteligente e prestativo. Responda sempre em português brasileiro de forma clara e útil."
        },
        ...validMessages.map((msg: any) => ({
          role: msg.role,
          content: msg.content.trim()
        })),
        {
          role: "user",
          content: message.trim()
        }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: settings.openaiModel || "gpt-4o",
          messages: messages,
          temperature: parseFloat(settings.openaiTemperature?.toString() || "0.7"),
          max_tokens: settings.openaiMaxTokens || 4000,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("OpenAI API error:", errorData);
        
        if (response.status === 401) {
          return res.status(401).json({ message: "Chave da API OpenAI inválida. Verifique as configurações." });
        } else if (response.status === 429) {
          return res.status(429).json({ message: "Limite de requisições atingido. Tente novamente em alguns minutos." });
        } else if (response.status === 402) {
          return res.status(402).json({ message: "Cota da API OpenAI esgotada. Verifique seu plano." });
        } else {
          const errorMessage = errorData?.error?.message || "Erro na API da OpenAI";
          return res.status(response.status).json({ message: errorMessage });
        }
      }

      const completion = await response.json();
      const aiResponse = completion.choices[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

      res.json({
        response: aiResponse,
        usage: completion.usage,
        model: settings.openaiModel || "gpt-4o"
      });

    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ message: "Erro interno do servidor ao processar chat" });
    }
  });

  // Professional Reviews API Routes
  app.get("/api/company/reviews", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const reviews = await storage.getProfessionalReviewsByCompany(companyId);
      res.json(reviews);
    } catch (error) {
      console.error("Error getting reviews:", error);
      res.status(500).json({ message: "Erro ao buscar avaliações" });
    }
  });

  app.get("/api/company/reviews/professional/:professionalId", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { professionalId } = req.params;
      const reviews = await storage.getProfessionalReviews(parseInt(professionalId));
      res.json(reviews);
    } catch (error) {
      console.error("Error getting professional reviews:", error);
      res.status(500).json({ message: "Erro ao buscar avaliações do profissional" });
    }
  });

  app.get("/api/company/review-invitations", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const invitations = await storage.getReviewInvitations(companyId);
      res.json(invitations);
    } catch (error) {
      console.error("Error getting review invitations:", error);
      res.status(500).json({ message: "Erro ao buscar convites de avaliação" });
    }
  });

  app.post("/api/company/send-review-invitation/:appointmentId", isAuthenticated, async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { appointmentId } = req.params;
      const result = await storage.sendReviewInvitation(parseInt(appointmentId));
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error sending review invitation:", error);
      res.status(500).json({ message: "Erro ao enviar convite de avaliação" });
    }
  });

  // Public review submission route (no authentication required)
  app.get("/api/public/review/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getReviewInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Convite de avaliação não encontrado" });
      }

      // Get professional and appointment details
      const professional = await storage.getProfessional(invitation.professionalId);
      const appointment = await storage.getAppointment(invitation.appointmentId);
      
      if (!professional || !appointment) {
        return res.status(404).json({ message: "Dados do agendamento não encontrados" });
      }

      res.json({
        invitation,
        professional: {
          id: professional.id,
          name: professional.name,
          specialties: professional.specialties
        },
        appointment: {
          id: appointment.id,
          clientName: appointment.clientName,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime
        }
      });
    } catch (error) {
      console.error("Error getting review data:", error);
      res.status(500).json({ message: "Erro ao buscar dados da avaliação" });
    }
  });

  app.post("/api/public/review/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Avaliação deve ser entre 1 e 5 estrelas" });
      }

      const invitation = await storage.getReviewInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Convite de avaliação não encontrado" });
      }

      if (invitation.reviewSubmittedAt) {
        return res.status(400).json({ message: "Avaliação já foi enviada para este agendamento" });
      }

      // Get appointment details
      const appointment = await storage.getAppointment(invitation.appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      // Create the review
      await storage.createProfessionalReview({
        professionalId: invitation.professionalId,
        appointmentId: invitation.appointmentId,
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        rating: parseInt(rating),
        comment: comment || null,
        isVisible: true
      });

      // Update invitation status using storage method
      await storage.updateReviewInvitation(invitation.id, {
        status: 'completed'
      });

      res.json({ message: "Avaliação enviada com sucesso! Obrigado pelo seu feedback." });
    } catch (error) {
      console.error("Error submitting review:", error);
      res.status(500).json({ message: "Erro ao enviar avaliação" });
    }
  });

  // Add the missing review invitation route
  app.post("/api/appointments/:id/send-review-invitation", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const appointmentId = parseInt(req.params.id);
      const result = await storage.sendReviewInvitation(appointmentId);
      
      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Error sending review invitation:", error);
      res.status(500).json({ message: "Erro ao enviar convite de avaliação" });
    }
  });

  // Tasks API
  app.get('/api/company/tasks', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const tasks = await storage.getTasks(companyId);
      res.json(tasks);
    } catch (error) {
      console.error("Error getting tasks:", error);
      res.status(500).json({ message: "Erro ao buscar tarefas" });
    }
  });

  app.get('/api/company/tasks/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task || task.companyId !== companyId) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error getting task:", error);
      res.status(500).json({ message: "Erro ao buscar tarefa" });
    }
  });

  app.post('/api/company/tasks', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Mapear campos do frontend para o backend
      const taskData = {
        name: req.body.name,
        description: req.body.description,
        dueDate: req.body.dueDate,
        recurrence: req.body.recurrence || 'none',
        whatsappNumber: req.body.whatsappNumber,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        companyId
      };

      console.log('Creating task with data:', taskData);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Erro ao criar tarefa", error: error.message });
    }
  });

  app.patch('/api/company/tasks/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const taskId = parseInt(req.params.id);
      
      // Verify task exists and belongs to company
      const existingTask = await storage.getTask(taskId);
      if (!existingTask || existingTask.companyId !== companyId) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }

      const updatedTask = await storage.updateTask(taskId, req.body);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Erro ao atualizar tarefa" });
    }
  });

  app.delete('/api/company/tasks/:id', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const taskId = parseInt(req.params.id);
      
      // Verify task exists and belongs to company
      const existingTask = await storage.getTask(taskId);
      if (!existingTask || existingTask.companyId !== companyId) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }

      await storage.deleteTask(taskId);
      res.json({ message: "Tarefa excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Erro ao excluir tarefa" });
    }
  });

  // Initialize tasks table
  app.post("/api/admin/init-tasks", async (req, res) => {
    try {
      // Drop and recreate tasks table to ensure correct structure
      await db.execute(`DROP TABLE IF EXISTS tasks`);
      
      // Create tasks table with correct structure
      await db.execute(`
        CREATE TABLE tasks (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          due_date DATE NOT NULL,
          recurrence VARCHAR(50) DEFAULT 'none',
          is_active BOOLEAN DEFAULT TRUE,
          whatsapp_number VARCHAR(50),
          company_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('✅ Tasks table created successfully');
      res.json({ message: "Tabela de tarefas criada com sucesso" });
    } catch (error: any) {
      console.error("Error creating tasks table:", error);
      res.status(500).json({ message: "Erro ao criar tabela de tarefas", error: error.message });
    }
  });

  // Update tasks table schema
  app.post("/api/admin/update-tasks-schema", async (req, res) => {
    try {
      // Check if column exists first
      const [columns] = await db.execute(`
        SHOW COLUMNS FROM tasks LIKE 'whatsapp_number'
      `) as any;
      
      if (columns.length === 0) {
        // Add whatsapp_number column if it doesn't exist
        await db.execute(`
          ALTER TABLE tasks 
          ADD COLUMN whatsapp_number VARCHAR(20)
        `);
        console.log('✅ WhatsApp column added to tasks table');
      } else {
        console.log('✅ WhatsApp column already exists in tasks table');
      }

      res.json({ message: "Schema da tabela de tarefas atualizado com sucesso" });
    } catch (error: any) {
      console.error("Error updating tasks table schema:", error);
      res.status(500).json({ message: "Erro ao atualizar schema da tabela", error: error.message });
    }
  });

  // Create task reminders table
  app.post("/api/admin/create-task-reminders-table", async (req, res) => {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS task_reminders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          task_id INT NOT NULL,
          whatsapp_number VARCHAR(20) NOT NULL,
          message TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('✅ Task reminders table created/verified');
      res.json({ message: "Tabela de lembretes de tarefas criada com sucesso" });
    } catch (error: any) {
      console.error("Error creating task reminders table:", error);
      res.status(500).json({ message: "Erro ao criar tabela de lembretes", error: error.message });
    }
  });

  // Task reminder functions
  async function checkTaskRecurrence(task: any): Promise<boolean> {
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    
    // Get the last reminder sent for this task
    const lastReminder = await storage.getLastTaskReminder(task.id);
    const lastReminderDate = lastReminder && lastReminder.sentAt ? new Date(lastReminder.sentAt) : null;
    
    switch (task.recurrence) {
      case 'daily':
        // Send if it's past due date and no reminder sent today
        if (now >= dueDate) {
          if (!lastReminderDate || !isSameDay(now, lastReminderDate)) {
            return true;
          }
        }
        break;
        
      case 'weekly':
        // Send if it's past due date and no reminder sent this week
        if (now >= dueDate) {
          if (!lastReminderDate || !isSameWeek(now, lastReminderDate)) {
            return true;
          }
        }
        break;
        
      case 'biweekly':
        // Send if it's past due date and no reminder sent in the last 2 weeks
        if (now >= dueDate) {
          if (!lastReminderDate || (now.getTime() - lastReminderDate.getTime()) >= (14 * 24 * 60 * 60 * 1000)) {
            return true;
          }
        }
        break;
        
      case 'monthly':
        // Send if it's past due date and no reminder sent this month
        if (now >= dueDate) {
          if (!lastReminderDate || !isSameMonth(now, lastReminderDate)) {
            return true;
          }
        }
        break;
    }
    
    return false;
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  function isSameWeek(date1: Date, date2: Date): boolean {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const startOfWeek1 = new Date(date1.getTime() - (date1.getDay() * 24 * 60 * 60 * 1000));
    const startOfWeek2 = new Date(date2.getTime() - (date2.getDay() * 24 * 60 * 60 * 1000));
    return Math.abs(startOfWeek1.getTime() - startOfWeek2.getTime()) < oneWeek;
  }

  function isSameMonth(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth();
  }

  async function sendTaskReminder(task: any, whatsappInstance: any): Promise<boolean> {
    try {
      if (!task.whatsappNumber || !whatsappInstance) {
        return false;
      }

      const message = `🔔 *Lembrete de Tarefa*\n\n📋 *${task.name}*\n\n📅 Vencimento: ${new Date(task.dueDate).toLocaleDateString('pt-BR')}\n🔄 Recorrência: ${getRecurrenceText(task.recurrence)}`;

      const response = await fetch(`${whatsappInstance.apiUrl}/message/sendText/${whatsappInstance.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': whatsappInstance.apiKey
        },
        body: JSON.stringify({
          number: task.whatsappNumber,
          text: message
        })
      });

      if (response.ok) {
        // Record the reminder sent (remove emojis for database compatibility)
        try {
          await storage.createTaskReminder({
            taskId: task.id,
            whatsappNumber: task.whatsappNumber,
            sentAt: new Date(),
            message: message.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[^\x00-\x7F]/g, '') // Remove emojis and non-ASCII chars
          });
        } catch (dbError) {
          console.log(`⚠️ Could not save reminder to database (message sent successfully)`);
        }
        console.log(`✅ Task reminder sent to ${task.whatsappNumber} for task: ${task.name}`);
        return true;
      } else {
        console.error(`❌ Failed to send task reminder: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('Error sending task reminder:', error);
      return false;
    }
  }

  function getRecurrenceText(recurrence: string): string {
    switch (recurrence) {
      case 'daily': return 'Diária';
      case 'weekly': return 'Semanal';
      case 'biweekly': return 'Quinzenal';
      case 'monthly': return 'Mensal';
      default: return recurrence;
    }
  }

  // Check and send task reminders
  app.post("/api/admin/check-task-reminders", async (req, res) => {
    try {
      console.log('🔍 Checking task reminders...');
      
      // Get all active tasks from all companies
      const companies = await storage.getCompanies();
      let totalReminders = 0;
      
      for (const company of companies) {
        try {
          // Get active tasks for this company
          const tasks = await storage.getTasksByCompany(company.id);
          const activeTasks = tasks.filter(task => task.isActive);
          
          if (activeTasks.length === 0) {
            continue;
          }
          
          // Get WhatsApp instance for this company
          const whatsappInstances = await storage.getWhatsAppInstancesByCompany(company.id);
          const whatsappInstance = whatsappInstances.find(instance => instance.status === 'connected');
          
          if (!whatsappInstance) {
            console.log(`⚠️ No connected WhatsApp instance for company: ${company.fantasyName}`);
            continue;
          }
          
          // Check each task
          for (const task of activeTasks) {
            if (task.whatsappNumber) {
              const shouldSendReminder = await checkTaskRecurrence(task);
              
              if (shouldSendReminder) {
                const sent = await sendTaskReminder(task, whatsappInstance);
                if (sent) {
                  totalReminders++;
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error processing tasks for company ${company.fantasyName}:`, error);
        }
      }
      
      console.log(`✅ Task reminder check completed. ${totalReminders} reminders sent.`);
      res.json({ 
        message: `Verificação de lembretes concluída. ${totalReminders} lembretes enviados.`,
        remindersSent: totalReminders
      });
    } catch (error: any) {
      console.error("Error checking task reminders:", error);
      res.status(500).json({ message: "Erro ao verificar lembretes de tarefas", error: error.message });
    }
  });

  // Manual task reminder trigger
  app.post("/api/company/tasks/:taskId/send-reminder", async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const companyId = req.session.companyId;
      
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Get task
      const task = await storage.getTask(parseInt(taskId));
      if (!task || task.companyId !== companyId) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }
      
      if (!task.whatsappNumber) {
        return res.status(400).json({ message: "Tarefa não possui número WhatsApp configurado" });
      }
      
      // Get WhatsApp instance
      const whatsappInstances = await storage.getWhatsAppInstancesByCompany(companyId);
      const whatsappInstance = whatsappInstances.find(instance => instance.status === 'connected');
      
      if (!whatsappInstance) {
        return res.status(400).json({ message: "Nenhuma instância WhatsApp conectada" });
      }
      
      const sent = await sendTaskReminder(task, whatsappInstance);
      
      if (sent) {
        res.json({ message: "Lembrete enviado com sucesso" });
      } else {
        res.status(500).json({ message: "Erro ao enviar lembrete" });
      }
    } catch (error: any) {
      console.error("Error sending manual task reminder:", error);
      res.status(500).json({ message: "Erro ao enviar lembrete", error: error.message });
    }
  });

  // Add color column to services table and update existing services
  app.post("/api/admin/add-service-colors", async (req, res) => {
    try {
      // Add color column to services table
      await db.execute(`
        ALTER TABLE services 
        ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6'
      `);

      // Update existing services with different colors
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
      
      await db.execute(`
        UPDATE services 
        SET color = CASE 
          WHEN id % 6 = 1 THEN '#3B82F6'
          WHEN id % 6 = 2 THEN '#10B981'
          WHEN id % 6 = 3 THEN '#F59E0B'
          WHEN id % 6 = 4 THEN '#EF4444'
          WHEN id % 6 = 5 THEN '#8B5CF6'
          ELSE '#06B6D4'
        END
        WHERE color IS NULL OR color = ''
      `);

      console.log('✅ Service colors added');
      res.json({ message: "Cores dos serviços adicionadas com sucesso" });
    } catch (error: any) {
      console.error("Error adding service colors:", error);
      res.status(500).json({ message: "Erro ao adicionar cores aos serviços", error: error.message });
    }
  });

  // Debug appointments query
  app.get("/api/admin/debug-appointments/:companyId", async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      const result = await db.execute(`SELECT * FROM appointments WHERE company_id = ${companyId} ORDER BY appointment_date DESC LIMIT 10`);
      res.json({ companyId, appointments: result });
    } catch (error: any) {
      console.error("Debug appointments error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create sample appointments for testing
  app.post("/api/admin/create-sample-appointments", async (req, res) => {
    try {
      await db.execute(`
        INSERT IGNORE INTO appointments (
          company_id, 
          professional_id, 
          service_id, 
          client_name, 
          client_phone, 
          client_email, 
          appointment_date, 
          appointment_time, 
          status, 
          notes,
          created_at,
          updated_at
        ) VALUES 
        (1, 5, 11, 'Carlos Silva', '5511999887766', 'carlos@email.com', '2025-06-11', '09:00', 'agendado', 'Primeiro corte do mês', NOW(), NOW()),
        (1, 5, 11, 'Maria Santos', '5511888776655', 'maria@email.com', '2025-06-11', '10:30', 'agendado', 'Cliente regular', NOW(), NOW()),
        (1, 5, 11, 'João Pedro', '5511777665544', 'joao@email.com', '2025-06-12', '14:00', 'confirmado', 'Corte especial', NOW(), NOW()),
        (1, 5, 11, 'Ana Costa', '5511666554433', 'ana@email.com', '2025-06-13', '15:30', 'agendado', 'Nova cliente', NOW(), NOW()),
        (1, 5, 11, 'Pedro Lima', '5511555443322', 'pedro@email.com', '2025-06-14', '11:00', 'agendado', 'Corte mensal', NOW(), NOW())
      `);

      console.log('✅ Sample appointments created for company 1');
      res.json({ message: "Agendamentos de exemplo criados com sucesso" });
    } catch (error: any) {
      console.error("Error creating sample appointments:", error);
      res.status(500).json({ message: "Erro ao criar agendamentos de exemplo", error: error.message });
    }
  });

  // Points System Routes
  app.get("/api/company/client-points", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const clientsWithPoints = await storage.getClientPointsByCompany(companyId);
      res.json(clientsWithPoints);
    } catch (error) {
      console.error("Error getting client points:", error);
      res.status(500).json({ message: "Erro ao buscar pontos dos clientes" });
    }
  });

  app.post("/api/company/client-points/:clientId", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { clientId } = req.params;
      const { pointsChange, description } = req.body;

      if (!pointsChange || !description) {
        return res.status(400).json({ message: "Alteração de pontos e descrição são obrigatórios" });
      }

      await storage.updateClientPoints(parseInt(clientId), pointsChange, description, companyId);
      res.json({ message: "Pontos atualizados com sucesso" });
    } catch (error) {
      console.error("Error updating client points:", error);
      res.status(500).json({ message: "Erro ao atualizar pontos do cliente" });
    }
  });

  // PATCH endpoint for updating client points
  app.patch("/api/company/client-points/:clientId", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { clientId } = req.params;
      const { pointsChange, description } = req.body;

      console.log('PATCH Points Update:', { clientId, pointsChange, description, companyId });

      if (pointsChange === undefined || pointsChange === null || !description) {
        return res.status(400).json({ message: "Alteração de pontos e descrição são obrigatórios" });
      }

      await storage.updateClientPoints(parseInt(clientId), pointsChange, description, companyId);
      res.json({ message: "Pontos atualizados com sucesso" });
    } catch (error) {
      console.error("Error updating client points:", error);
      res.status(500).json({ message: "Erro ao atualizar pontos do cliente" });
    }
  });

  app.get("/api/company/points-campaigns", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const campaigns = await storage.getPointsCampaignsByCompany(companyId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error getting points campaigns:", error);
      res.status(500).json({ message: "Erro ao buscar campanhas de pontos" });
    }
  });

  app.post("/api/company/points-campaigns", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { name, requiredPoints, rewardServiceId } = req.body;

      if (!name || !requiredPoints || !rewardServiceId) {
        return res.status(400).json({ message: "Nome, pontos necessários e serviço de recompensa são obrigatórios" });
      }

      const campaign = await storage.createPointsCampaign({
        companyId,
        name,
        requiredPoints: parseInt(requiredPoints),
        rewardServiceId: parseInt(rewardServiceId),
        active: true
      });

      res.json(campaign);
    } catch (error) {
      console.error("Error creating points campaign:", error);
      res.status(500).json({ message: "Erro ao criar campanha de pontos" });
    }
  });

  app.put("/api/company/points-campaigns/:campaignId", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { campaignId } = req.params;
      const { name, requiredPoints, rewardServiceId, active } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (requiredPoints !== undefined) updates.requiredPoints = parseInt(requiredPoints);
      if (rewardServiceId !== undefined) updates.rewardServiceId = parseInt(rewardServiceId);
      if (active !== undefined) updates.active = active;

      const updatedCampaign = await storage.updatePointsCampaign(parseInt(campaignId), updates);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating points campaign:", error);
      res.status(500).json({ message: "Erro ao atualizar campanha de pontos" });
    }
  });

  app.delete("/api/company/points-campaigns/:campaignId", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { campaignId } = req.params;
      await storage.deletePointsCampaign(parseInt(campaignId));
      res.json({ message: "Campanha removida com sucesso" });
    } catch (error) {
      console.error("Error deleting points campaign:", error);
      res.status(500).json({ message: "Erro ao remover campanha de pontos" });
    }
  });

  // Loyalty Campaigns Routes
  app.get("/api/loyalty-campaigns", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const campaigns = await getLoyaltyCampaignsByCompany(companyId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error getting loyalty campaigns:", error);
      res.status(500).json({ message: "Erro ao buscar campanhas de fidelidade" });
    }
  });

  app.post("/api/loyalty-campaigns", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const campaignData = {
        ...req.body,
        companyId
      };

      const campaign = await createLoyaltyCampaign(campaignData);
      res.json(campaign);
    } catch (error) {
      console.error("Error creating loyalty campaign:", error);
      res.status(500).json({ message: "Erro ao criar campanha de fidelidade" });
    }
  });

  app.patch("/api/loyalty-campaigns/:id", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const campaign = await updateLoyaltyCampaign(parseInt(id), req.body, companyId);
      res.json(campaign);
    } catch (error) {
      console.error("Error updating loyalty campaign:", error);
      res.status(500).json({ message: "Erro ao atualizar campanha de fidelidade" });
    }
  });

  app.patch("/api/loyalty-campaigns/:id/toggle", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { active } = req.body;
      await toggleLoyaltyCampaign(parseInt(id), active, companyId);
      res.json({ message: "Status da campanha atualizado" });
    } catch (error) {
      console.error("Error toggling loyalty campaign:", error);
      res.status(500).json({ message: "Erro ao atualizar status da campanha" });
    }
  });

  app.delete("/api/loyalty-campaigns/:id", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      await deleteLoyaltyCampaign(parseInt(id), companyId);
      res.json({ message: "Campanha de fidelidade removida" });
    } catch (error) {
      console.error("Error deleting loyalty campaign:", error);
      res.status(500).json({ message: "Erro ao remover campanha de fidelidade" });
    }
  });

  app.get("/api/loyalty-rewards-history", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const history = await getLoyaltyRewardsHistory(companyId);
      res.json(history);
    } catch (error) {
      console.error("Error getting loyalty rewards history:", error);
      res.status(500).json({ message: "Erro ao buscar histórico de recompensas" });
    }
  });

  // Products routes
  app.get("/api/products", async (req, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const products = await storage.getProducts(companyId);
      res.json(products);
    } catch (error) {
      console.error("Error getting products:", error);
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const productData = { ...req.body, companyId };
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Erro ao criar produto" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const productId = parseInt(req.params.id);
      
      // Verify product exists and belongs to company
      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct || existingProduct.companyId !== companyId) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      const product = await storage.updateProduct(productId, req.body);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Erro ao atualizar produto" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const productId = parseInt(req.params.id);
      
      // Verify product exists and belongs to company
      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct || existingProduct.companyId !== companyId) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      await storage.deleteProduct(productId);
      res.json({ message: "Produto excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Erro ao excluir produto" });
    }
  });

  // Message Campaigns Routes
  app.get("/api/company/campaigns", async (req, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const campaigns = await storage.getMessageCampaigns(companyId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Erro ao buscar campanhas" });
    }
  });

  app.post("/api/company/campaigns", async (req, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      console.log("Request body:", req.body);

      // Validate required fields
      if (!req.body.name || !req.body.message || !req.body.scheduledDate || !req.body.targetType) {
        return res.status(400).json({ message: "Campos obrigatórios: name, message, scheduledDate, targetType" });
      }

      // Parse the date as received from frontend (already in local timezone)
      const scheduledDate = new Date(req.body.scheduledDate);
      
      const campaignData = {
        name: req.body.name,
        message: req.body.message,
        scheduledDate: scheduledDate,
        targetType: req.body.targetType,
        selectedClients: req.body.selectedClients || null,
        companyId,
        status: 'pending',
        sentCount: 0,
        totalTargets: req.body.targetType === 'all' ? 0 : (req.body.selectedClients ? req.body.selectedClients.length : 0),
      };

      console.log("Campaign data:", campaignData);

      const campaign = await storage.createMessageCampaign(campaignData);
      res.json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Erro ao criar campanha" });
    }
  });

  app.delete("/api/company/campaigns/:id", async (req, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      await storage.deleteMessageCampaign(parseInt(id), companyId);
      res.json({ message: "Campanha excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Erro ao excluir campanha" });
    }
  });

  app.get("/api/company/clients", async (req, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const clients = await storage.getClientsByCompany(companyId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  // Coupon routes
  app.get("/api/company/coupons", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const coupons = await storage.getCoupons(companyId);
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ message: "Erro ao buscar cupons" });
    }
  });

  app.post("/api/company/coupons", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const couponData = {
        ...req.body,
        companyId,
        code: req.body.code || req.body.name.toUpperCase().replace(/\s+/g, '').substring(0, 10),
        usedCount: 0
      };

      const coupon = await storage.createCoupon(couponData);
      res.status(201).json(coupon);
    } catch (error) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ message: "Erro ao criar cupom" });
    }
  });

  app.put("/api/company/coupons/:id", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const couponId = parseInt(req.params.id);
      const coupon = await storage.updateCoupon(couponId, req.body);
      res.json(coupon);
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ message: "Erro ao atualizar cupom" });
    }
  });

  app.delete("/api/company/coupons/:id", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const couponId = parseInt(req.params.id);
      await storage.deleteCoupon(couponId, companyId);
      res.json({ message: "Cupom excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ message: "Erro ao excluir cupom" });
    }
  });

  app.get("/api/company/coupons/validate/:code", async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { code } = req.params;
      const coupon = await storage.getCouponByCode(code, companyId);
      
      if (!coupon) {
        return res.status(404).json({ message: "Cupom não encontrado" });
      }

      const now = new Date();
      const validUntil = new Date(coupon.validUntil);
      
      if (validUntil < now) {
        return res.status(400).json({ message: "Cupom expirado" });
      }

      if (!coupon.isActive) {
        return res.status(400).json({ message: "Cupom inativo" });
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({ message: "Cupom esgotado" });
      }

      res.json(coupon);
    } catch (error) {
      console.error("Error validating coupon:", error);
      res.status(500).json({ message: "Erro ao validar cupom" });
    }
  });

  // Create coupons table
  app.post("/api/admin/init-coupons", async (req, res) => {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS coupons (
          id INT PRIMARY KEY AUTO_INCREMENT,
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

      console.log('✅ Coupons table created');
      res.json({ message: "Tabela de cupons criada com sucesso" });
    } catch (error: any) {
      console.error("Error creating coupons table:", error);
      res.status(500).json({ message: "Erro ao criar tabela de cupons", error: error.message });
    }
  });

  // Financial middleware
  const requireCompanyAuth = (req: any, res: any, next: any) => {
    if (!req.session.companyId) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    next();
  };

  // Financial routes
  
  // Get financial categories
  app.get("/api/company/financial/categories", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      const categories = await db.select()
        .from(financialCategories)
        .where(eq(financialCategories.companyId, companyId))
        .orderBy(desc(financialCategories.createdAt));
      
      console.log("Financial categories fetched:", categories);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching financial categories:", error);
      res.status(500).json({ message: "Erro ao buscar categorias financeiras" });
    }
  });

  // Create financial category
  app.post("/api/company/financial/categories", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      const { name, description, type, color } = req.body;

      console.log("Creating financial category with data:", { companyId, name, description, type, color });

      if (!name || !type || !color) {
        return res.status(400).json({ message: "Nome, tipo e cor são obrigatórios" });
      }

      const result = await db.insert(financialCategories).values({
        companyId,
        name,
        description: description || null,
        type,
        color
      });

      console.log("Insert result:", result);

      // Buscar a categoria criada usando o insertId correto
      const insertId = result.insertId || result[0]?.insertId;
      
      if (!insertId) {
        // Se não conseguir o ID, buscar pela última categoria criada
        const [createdCategory] = await db.select()
          .from(financialCategories)
          .where(and(eq(financialCategories.companyId, companyId), eq(financialCategories.name, name)))
          .orderBy(desc(financialCategories.id))
          .limit(1);
        
        console.log("Category created successfully:", createdCategory);
        return res.json(createdCategory);
      }

      const [createdCategory] = await db.select()
        .from(financialCategories)
        .where(eq(financialCategories.id, insertId))
        .limit(1);

      console.log("Category created successfully:", createdCategory);
      res.json(createdCategory);
    } catch (error) {
      console.error("Error creating financial category:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      res.status(500).json({ message: "Erro ao criar categoria financeira" });
    }
  });

  // Update financial category
  app.put("/api/company/financial/categories/:id", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      const categoryId = parseInt(req.params.id);
      const { name, description, type, color } = req.body;

      await db.execute(sql`
        UPDATE financial_categories 
        SET name = ${name}, description = ${description || null}, type = ${type}, color = ${color}, updated_at = NOW()
        WHERE id = ${categoryId} AND company_id = ${companyId}
      `);

      const category = await db.execute(sql`
        SELECT * FROM financial_categories WHERE id = ${categoryId}
      `);

      res.json(category[0]);
    } catch (error) {
      console.error("Error updating financial category:", error);
      res.status(500).json({ message: "Erro ao atualizar categoria financeira" });
    }
  });

  // Delete financial category
  app.delete("/api/company/financial/categories/:id", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      const categoryId = parseInt(req.params.id);

      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "ID da categoria inválido" });
      }

      await db.delete(financialCategories)
        .where(and(eq(financialCategories.id, categoryId), eq(financialCategories.companyId, companyId)));

      res.json({ message: "Categoria removida com sucesso" });
    } catch (error) {
      console.error("Error deleting financial category:", error);
      res.status(500).json({ message: "Erro ao remover categoria financeira" });
    }
  });

  // Get payment methods
  app.get("/api/company/financial/payment-methods", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      const methods = await db.select()
        .from(paymentMethods)
        .where(eq(paymentMethods.companyId, companyId))
        .orderBy(desc(paymentMethods.createdAt));
      
      console.log("Payment methods fetched:", methods);
      res.json(methods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: "Erro ao buscar métodos de pagamento" });
    }
  });

  // Create payment method
  app.post("/api/company/financial/payment-methods", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      const { name, description, type, isActive } = req.body;

      if (!name || !type) {
        return res.status(400).json({ message: "Nome e tipo são obrigatórios" });
      }

      const result = await db.insert(paymentMethods).values({
        companyId,
        name,
        description: description || null,
        type,
        isActive: isActive !== undefined ? isActive : true
      });

      // Buscar o método criado
      const insertId = result.insertId || result[0]?.insertId;
      
      if (!insertId) {
        const [createdMethod] = await db.select()
          .from(paymentMethods)
          .where(and(eq(paymentMethods.companyId, companyId), eq(paymentMethods.name, name)))
          .orderBy(desc(paymentMethods.id))
          .limit(1);
        
        return res.json(createdMethod);
      }

      const [createdMethod] = await db.select()
        .from(paymentMethods)
        .where(eq(paymentMethods.id, insertId))
        .limit(1);

      res.json(createdMethod);
    } catch (error) {
      console.error("Error creating payment method:", error);
      res.status(500).json({ message: "Erro ao criar método de pagamento" });
    }
  });

  // Update payment method
  app.put("/api/company/financial/payment-methods/:id", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      const paymentMethodId = parseInt(req.params.id);
      const { name, description, type, isActive } = req.body;

      await db.execute(sql`
        UPDATE payment_methods 
        SET name = ${name}, description = ${description || null}, type = ${type}, is_active = ${isActive}, updated_at = NOW()
        WHERE id = ${paymentMethodId} AND company_id = ${companyId}
      `);

      const paymentMethod = await db.execute(sql`
        SELECT * FROM payment_methods WHERE id = ${paymentMethodId}
      `);

      res.json(paymentMethod[0]);
    } catch (error) {
      console.error("Error updating payment method:", error);
      res.status(500).json({ message: "Erro ao atualizar método de pagamento" });
    }
  });

  // Delete payment method
  app.delete("/api/company/financial/payment-methods/:id", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      const paymentMethodId = parseInt(req.params.id);

      if (!paymentMethodId || isNaN(paymentMethodId)) {
        return res.status(400).json({ message: "ID do método de pagamento inválido" });
      }

      await db.delete(paymentMethods)
        .where(and(eq(paymentMethods.id, paymentMethodId), eq(paymentMethods.companyId, companyId)));

      res.json({ message: "Método de pagamento removido com sucesso" });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ message: "Erro ao remover método de pagamento" });
    }
  });

  // Get financial transactions
  app.get("/api/company/financial/transactions", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      
      const transactions = await db.select()
        .from(financialTransactions)
        .where(eq(financialTransactions.companyId, companyId))
        .orderBy(desc(financialTransactions.date), desc(financialTransactions.createdAt));

      // Buscar categorias e métodos de pagamento relacionados
      const formattedTransactions = await Promise.all(transactions.map(async (transaction) => {
        const [category] = transaction.categoryId ? await db.select().from(financialCategories).where(eq(financialCategories.id, transaction.categoryId)) : [null];
        const [paymentMethod] = transaction.paymentMethodId ? await db.select().from(paymentMethods).where(eq(paymentMethods.id, transaction.paymentMethodId)) : [null];

        return {
          ...transaction,
          category: category || null,
          paymentMethod: paymentMethod || null
        };
      }));

      console.log("Financial transactions fetched:", formattedTransactions);
      res.json(formattedTransactions);
    } catch (error) {
      console.error("Error fetching financial transactions:", error);
      res.status(500).json({ message: "Erro ao buscar transações financeiras" });
    }
  });

  // Create financial transaction
  app.post("/api/company/financial/transactions", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      const { description, amount, type, categoryId, paymentMethodId, date, notes } = req.body;

      if (!description || !amount || !type || !categoryId || !paymentMethodId || !date) {
        return res.status(400).json({ message: "Todos os campos obrigatórios devem ser preenchidos" });
      }

      const result = await db.insert(financialTransactions).values({
        companyId,
        description,
        amount: parseFloat(amount),
        type,
        categoryId: parseInt(categoryId),
        paymentMethodId: parseInt(paymentMethodId),
        date: new Date(date),
        notes: notes || null
      });

      // Buscar a transação criada com relacionamentos
      const insertId = result.insertId || result[0]?.insertId;
      
      if (!insertId) {
        const [createdTransaction] = await db.select()
          .from(financialTransactions)
          .where(and(eq(financialTransactions.companyId, companyId), eq(financialTransactions.description, description)))
          .orderBy(desc(financialTransactions.id))
          .limit(1);
        
        const [category] = await db.select().from(financialCategories).where(eq(financialCategories.id, categoryId));
        const [paymentMethod] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, paymentMethodId));
        
        const formattedTransaction = {
          ...createdTransaction,
          category: category || null,
          paymentMethod: paymentMethod || null
        };
        
        return res.json(formattedTransaction);
      }

      const [transaction] = await db.select()
        .from(financialTransactions)
        .where(eq(financialTransactions.id, insertId))
        .limit(1);

      const [category] = await db.select().from(financialCategories).where(eq(financialCategories.id, categoryId));
      const [paymentMethod] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, paymentMethodId));

      const formattedTransaction = {
        ...transaction,
        category: category || null,
        paymentMethod: paymentMethod || null
      };

      res.json(formattedTransaction);
    } catch (error) {
      console.error("Error creating financial transaction:", error);
      res.status(500).json({ message: "Erro ao criar transação financeira" });
    }
  });

  // Update financial transaction
  app.put("/api/company/financial/transactions/:id", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      const transactionId = parseInt(req.params.id);
      const { description, amount, type, categoryId, paymentMethodId, date, notes } = req.body;

      await db.execute(sql`
        UPDATE financial_transactions 
        SET description = ${description}, amount = ${amount}, type = ${type}, 
            category_id = ${categoryId}, payment_method_id = ${paymentMethodId}, 
            date = ${date}, notes = ${notes || null}, updated_at = NOW()
        WHERE id = ${transactionId} AND company_id = ${companyId}
      `);

      const transaction = await db.execute(sql`
        SELECT 
          t.*,
          c.name as category_name,
          c.color as category_color,
          c.type as category_type,
          p.name as payment_method_name,
          p.type as payment_method_type
        FROM financial_transactions t
        LEFT JOIN financial_categories c ON t.category_id = c.id
        LEFT JOIN payment_methods p ON t.payment_method_id = p.id
        WHERE t.id = ${transactionId}
      `);

      const formattedTransaction = {
        id: transaction[0].id,
        description: transaction[0].description,
        amount: parseFloat(transaction[0].amount),
        type: transaction[0].type,
        categoryId: transaction[0].category_id,
        paymentMethodId: transaction[0].payment_method_id,
        date: transaction[0].date,
        notes: transaction[0].notes,
        createdAt: transaction[0].created_at,
        category: {
          id: transaction[0].category_id,
          name: transaction[0].category_name,
          color: transaction[0].category_color,
          type: transaction[0].category_type,
        },
        paymentMethod: {
          id: transaction[0].payment_method_id,
          name: transaction[0].payment_method_name,
          type: transaction[0].payment_method_type,
        },
      };

      res.json(formattedTransaction);
    } catch (error) {
      console.error("Error updating financial transaction:", error);
      res.status(500).json({ message: "Erro ao atualizar transação financeira" });
    }
  });

  // Delete financial transaction
  app.delete("/api/company/financial/transactions/:id", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      const transactionId = parseInt(req.params.id);

      await db.execute(sql`
        DELETE FROM financial_transactions 
        WHERE id = ${transactionId} AND company_id = ${companyId}
      `);

      res.json({ message: "Transação removida com sucesso" });
    } catch (error) {
      console.error("Error deleting financial transaction:", error);
      res.status(500).json({ message: "Erro ao remover transação financeira" });
    }
  });

  // Get financial dashboard data
  app.get("/api/company/financial/dashboard", requireCompanyAuth, async (req, res) => {
    try {
      const companyId = req.session.companyId!;
      
      // Get current month's income and expenses
      const filterMonth = req.query.month as string || new Date().toISOString().slice(0, 7); // YYYY-MM format
      const currentMonth = filterMonth;
      const previousMonth = new Date(new Date(`${filterMonth}-01`).setMonth(new Date(`${filterMonth}-01`).getMonth() - 1)).toISOString().slice(0, 7);

      // Receitas: Serviços concluídos + transações de receita no mês atual
      const appointmentIncome = await db.execute(sql`
        SELECT COALESCE(SUM(a.total_price), 0) as total
        FROM appointments a
        WHERE a.company_id = ${companyId} 
        AND a.status = 'Concluído'
        AND DATE_FORMAT(a.appointment_date, '%Y-%m') = ${currentMonth}
      `);

      const transactionIncome = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM financial_transactions 
        WHERE company_id = ${companyId} 
        AND type = 'income' 
        AND DATE_FORMAT(date, '%Y-%m') = ${currentMonth}
      `);

      // Despesas: Transações de despesa no mês atual
      const currentMonthExpenses = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM financial_transactions 
        WHERE company_id = ${companyId} 
        AND type = 'expense' 
        AND DATE_FORMAT(date, '%Y-%m') = ${currentMonth}
      `);

      // Receitas do mês anterior (serviços + transações)
      const previousAppointmentIncome = await db.execute(sql`
        SELECT COALESCE(SUM(a.total_price), 0) as total
        FROM appointments a
        WHERE a.company_id = ${companyId} 
        AND a.status = 'Concluído'
        AND DATE_FORMAT(a.appointment_date, '%Y-%m') = ${previousMonth}
      `);

      const previousTransactionIncome = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM financial_transactions 
        WHERE company_id = ${companyId} 
        AND type = 'income' 
        AND DATE_FORMAT(date, '%Y-%m') = ${previousMonth}
      `);

      // Despesas do mês anterior
      const previousMonthExpenses = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM financial_transactions 
        WHERE company_id = ${companyId} 
        AND type = 'expense' 
        AND DATE_FORMAT(date, '%Y-%m') = ${previousMonth}
      `);

      // Total transactions count for current month
      const totalTransactions = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM financial_transactions 
        WHERE company_id = ${companyId} 
        AND DATE_FORMAT(date, '%Y-%m') = ${currentMonth}
      `);

      // Debug - log dos valores retornados pelas consultas
      console.log('🔍 Debug dashboard queries:');
      console.log('Appointment income result:', appointmentIncome);
      console.log('Transaction income result:', transactionIncome);
      console.log('Current expenses result:', currentMonthExpenses);
      console.log('Current month filter:', currentMonth);
      
      // Combinar receitas de agendamentos e transações manuais
      // O Drizzle com MySQL retorna [resultados, metadados] - precisamos acessar [0][0]
      const appointmentIncomeValue = parseFloat((appointmentIncome as any)[0][0]?.total || '0');
      const transactionIncomeValue = parseFloat((transactionIncome as any)[0][0]?.total || '0');
      const monthlyIncome = appointmentIncomeValue + transactionIncomeValue;
      
      const monthlyExpenses = parseFloat((currentMonthExpenses as any)[0][0]?.total || '0');
      
      // Receitas do mês anterior (agendamentos + transações)
      const prevAppointmentIncomeValue = parseFloat((previousAppointmentIncome as any)[0][0]?.total || '0');
      const prevTransactionIncomeValue = parseFloat((previousTransactionIncome as any)[0][0]?.total || '0');
      const prevIncome = prevAppointmentIncomeValue + prevTransactionIncomeValue;
      
      const prevExpenses = parseFloat((previousMonthExpenses as any)[0][0]?.total || '0');
      
      console.log('💰 Calculated values:');
      console.log('Monthly income:', monthlyIncome, '(appointments:', appointmentIncomeValue, '+ transactions:', transactionIncomeValue, ')');
      console.log('Monthly expenses:', monthlyExpenses);

      // Calculate growth percentages
      const incomeGrowth = prevIncome > 0 ? ((monthlyIncome - prevIncome) / prevIncome * 100).toFixed(1) : "0";
      const expenseGrowth = prevExpenses > 0 ? ((monthlyExpenses - prevExpenses) / prevExpenses * 100).toFixed(1) : "0";

      const dashboardData = {
        monthlyIncome,
        monthlyExpenses,
        incomeGrowth: parseFloat(incomeGrowth),
        expenseGrowth: parseFloat(expenseGrowth),
        totalTransactions: (totalTransactions as any)[0][0]?.count || 0,
      };

      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching financial dashboard:", error);
      res.status(500).json({ message: "Erro ao buscar dados do dashboard financeiro" });
    }
  });

  const httpServer = createServer(app);
  // Admin management routes
  app.get("/api/admins", isAuthenticated, async (req, res) => {
    try {
      const admins = await storage.getAdmins();
      // Remove passwords from response
      const safeAdmins = admins.map(admin => ({
        ...admin,
        password: undefined
      }));
      res.json(safeAdmins);
    } catch (error) {
      console.error("Error getting admins:", error);
      res.status(500).json({ message: "Erro ao buscar administradores" });
    }
  });

  app.post("/api/admins", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAdminSchema.parse(req.body);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const adminData = {
        ...validatedData,
        password: hashedPassword,
      };

      const admin = await storage.createAdmin(adminData);
      // Remove password from response
      const { password, ...safeAdmin } = admin;
      res.status(201).json(safeAdmin);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('username')) {
          return res.status(400).json({ message: "Nome de usuário já existe" });
        }
        if (error.message.includes('email')) {
          return res.status(400).json({ message: "E-mail já existe" });
        }
      }
      console.error("Error creating admin:", error);
      res.status(500).json({ message: "Erro ao criar administrador" });
    }
  });

  app.put("/api/admins/:id", isAuthenticated, async (req, res) => {
    try {
      const adminId = parseInt(req.params.id);
      const updateData = { ...req.body };
      
      // Hash password if provided
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      } else {
        // Remove password field if empty
        delete updateData.password;
      }

      const admin = await storage.updateAdmin(adminId, updateData);
      // Remove password from response
      const { password, ...safeAdmin } = admin;
      res.json(safeAdmin);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('username')) {
          return res.status(400).json({ message: "Nome de usuário já existe" });
        }
        if (error.message.includes('email')) {
          return res.status(400).json({ message: "E-mail já existe" });
        }
      }
      console.error("Error updating admin:", error);
      res.status(500).json({ message: "Erro ao atualizar administrador" });
    }
  });

  app.delete("/api/admins/:id", isAuthenticated, async (req, res) => {
    try {
      const adminId = parseInt(req.params.id);
      
      // Prevent deleting the last admin
      const admins = await storage.getAdmins();
      if (admins.length <= 1) {
        return res.status(400).json({ message: "Não é possível excluir o último administrador" });
      }

      await storage.deleteAdmin(adminId);
      res.json({ message: "Administrador removido com sucesso" });
    } catch (error) {
      console.error("Error deleting admin:", error);
      res.status(500).json({ message: "Erro ao remover administrador" });
    }
  });

  // Password reset routes
  app.post("/api/company/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email é obrigatório" });
      }

      // Check if company exists with this email
      const company = await storage.getCompanyByEmail(email);
      if (!company) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "Se o email existir em nosso sistema, você receberá instruções para recuperação de senha." });
      }

      // Generate reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      
      // Save token to database
      await storage.createPasswordResetToken(email, resetToken);

      // For now, just return success - in production, this would send an email
      // TODO: Implement email sending when SMTP is configured
      console.log(`Password reset token for ${email}: ${resetToken}`);
      console.log(`Reset URL: ${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/company/reset-password?token=${resetToken}`);

      res.json({ 
        message: "Se o email existir em nosso sistema, você receberá instruções para recuperação de senha.",
        // In development, include the token for testing
        ...(process.env.NODE_ENV === 'development' && { resetToken, resetUrl: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/company/reset-password?token=${resetToken}` })
      });
    } catch (error) {
      console.error("Error processing password reset:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/company/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token e nova senha são obrigatórios" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
      }

      // Validate token
      const tokenValidation = await storage.validatePasswordResetToken(token);
      if (!tokenValidation.valid) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      // Get company by email
      const company = await storage.getCompanyByEmail(tokenValidation.email);
      if (!company) {
        return res.status(400).json({ message: "Empresa não encontrada" });
      }

      // Hash new password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update company password
      await storage.updateCompany(company.id, { password: hashedPassword });

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token);

      res.json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/company/validate-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ message: "Token é obrigatório" });
      }

      const tokenValidation = await storage.validatePasswordResetToken(token);
      
      if (!tokenValidation.valid) {
        return res.status(400).json({ message: "Token inválido ou expirado", valid: false });
      }

      res.json({ message: "Token válido", valid: true, email: tokenValidation.email });
    } catch (error) {
      console.error("Error validating reset token:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  return httpServer;
}
