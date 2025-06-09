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
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Falha ao atualizar configurações" });
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
        });

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
          };
          
          tempWhatsappInstances.push(newInstance);
          
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

  const httpServer = createServer(app);
  return httpServer;
}
