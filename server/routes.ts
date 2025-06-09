import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { db } from "./db";
import { insertCompanySchema, insertPlanSchema, insertGlobalSettingsSchema, insertAdminSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import QRCode from "qrcode";

// Temporary in-memory storage for WhatsApp instances
const tempWhatsappInstances: any[] = [];

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
      // Convert string values to numbers for OpenAI fields
      const processedData = { ...req.body };
      if (processedData.openaiTemperature) {
        processedData.openaiTemperature = parseFloat(processedData.openaiTemperature);
      }
      if (processedData.openaiMaxTokens) {
        processedData.openaiMaxTokens = parseInt(processedData.openaiMaxTokens);
      }

      const validatedData = insertGlobalSettingsSchema.partial().parse(processedData);
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

  app.post('/api/company/auth/logout', (req: any, res) => {
    req.session.companyId = null;
    res.json({ message: "Logout realizado com sucesso" });
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
      console.log('WhatsApp webhook received:', JSON.stringify(webhookData, null, 2));

      // Check if it's a message event
      if (webhookData.event === 'messages.upsert' && webhookData.data?.messages?.length > 0) {
        const message = webhookData.data.messages[0];
        
        // Only process text messages from users (not from the bot itself)
        if (message.messageType === 'textMessage' && !message.key.fromMe) {
          const phoneNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');
          const messageText = message.message.conversation || message.message.extendedTextMessage?.text;
          
          if (messageText) {
            // Find company by instance name
            const whatsappInstance = await storage.getWhatsappInstanceByName(instanceName);
            if (!whatsappInstance) {
              console.log(`WhatsApp instance ${instanceName} not found`);
              return res.status(404).json({ error: 'Instance not found' });
            }

            const company = await storage.getCompany(whatsappInstance.companyId);
            if (!company || !company.aiAgentPrompt) {
              console.log(`Company or AI prompt not found for instance ${instanceName}`);
              return res.status(404).json({ error: 'Company or AI prompt not configured' });
            }

            // Get global OpenAI settings
            const globalSettings = await storage.getGlobalSettings();
            if (!globalSettings || !globalSettings.openaiApiKey) {
              console.log('OpenAI not configured');
              return res.status(400).json({ error: 'OpenAI not configured' });
            }

            try {
              // Generate AI response
              const OpenAI = (await import('openai')).default;
              const openai = new OpenAI({ apiKey: globalSettings.openaiApiKey });

              const systemPrompt = `${company.aiAgentPrompt}

Importante: Você está representando a empresa "${company.fantasyName}" via WhatsApp. 
- Mantenha respostas concisas e adequadas para mensagens de texto
- Seja profissional mas amigável
- Se necessário, peça informações de contato para seguimento
- Limite respostas a no máximo 200 palavras por mensagem`;

              const completion = await openai.chat.completions.create({
                model: globalSettings.openaiModel || 'gpt-4o',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: messageText }
                ],
                temperature: parseFloat(globalSettings.openaiTemperature?.toString() || '0.7'),
                max_tokens: Math.min(parseInt(globalSettings.openaiMaxTokens?.toString() || '300'), 300),
              });

              const aiResponse = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

              // Send response back via Evolution API
              if (whatsappInstance.apiUrl && whatsappInstance.apiKey) {
                const evolutionResponse = await fetch(`${whatsappInstance.apiUrl}/message/sendText/${instanceName}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': whatsappInstance.apiKey
                  },
                  body: JSON.stringify({
                    number: phoneNumber,
                    text: aiResponse
                  })
                });

                if (evolutionResponse.ok) {
                  console.log(`AI response sent to ${phoneNumber}: ${aiResponse}`);
                } else {
                  console.error('Failed to send message via Evolution API:', await evolutionResponse.text());
                }
              } else {
                console.error('API URL or API key not configured for instance:', instanceName);
              }

            } catch (aiError) {
              console.error('Error generating AI response:', aiError);
            }
          }
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
      const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhook/whatsapp/${instance.instanceName}`;

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
      const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhook/whatsapp/${instance.instanceName}`;

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
              url: webhookUrl,
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
                "TYPEBOT_CHANGE_STATUS",
                "NEW_JWT_TOKEN"
              ]
            },
            webhook_by_events: false,
            webhook_base64: false
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
          
          const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhook/whatsapp/${instanceName}`;
          
          const webhookPayload = {
            webhook: {
              url: webhookUrl,
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
                "CALL",
                "NEW_JWT_TOKEN"
              ]
            },
            webhook_by_events: false,
            webhook_base64: false
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
            
            const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhook/whatsapp/${instanceName}`;
            
            const webhookPayload = {
              webhook: {
                url: webhookUrl,
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
                  "CALL",
                  "NEW_JWT_TOKEN"
                ]
              },
              webhook_by_events: false,
              webhook_base64: false
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
        
        // The Evolution API should return the QR code data
        if (evolutionData.base64 || evolutionData.qrcode) {
          const qrCodeData = evolutionData.base64 || evolutionData.qrcode;
          const qrCodeUrl = qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`;
          
          // Update instance status in database
          try {
            const instances = await storage.getWhatsappInstancesByCompany(companyId);
            const instance = instances.find(inst => inst.instanceName === instanceName);
            if (instance) {
              await storage.updateWhatsappInstance(instance.id, {
                status: 'connecting',
                qrCode: qrCodeUrl
              });
            }
          } catch (dbError) {
            console.error("Error updating instance status:", dbError);
          }
          
          res.json({
            instanceName,
            status: 'connecting',
            qrcode: qrCodeUrl,
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

  const httpServer = createServer(app);
  return httpServer;
}
