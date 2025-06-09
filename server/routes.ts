import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertCompanySchema, insertPlanSchema, insertGlobalSettingsSchema, insertAdminSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";

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

  const httpServer = createServer(app);
  return httpServer;
}
