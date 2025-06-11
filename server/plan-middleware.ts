import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

interface CompanySession {
  companyId: number;
  user?: any;
}

export interface RequestWithPlan extends Request {
  companyPlan?: {
    id: number;
    name: string;
    maxProfessionals: number;
    permissions: {
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
    };
  };
}

// Middleware para carregar informações do plano da empresa
export const loadCompanyPlan = async (req: RequestWithPlan, res: Response, next: NextFunction) => {
  try {
    const session = req.session as CompanySession;
    
    if (!session.companyId) {
      return next(); // Não é uma sessão de empresa, continua
    }

    // Buscar empresa e seu plano
    const company = await storage.getCompany(session.companyId);
    if (!company || !company.planId) {
      return next();
    }

    // Buscar detalhes do plano
    const plan = await storage.getPlan(company.planId);
    if (!plan) {
      return next();
    }

    // Adicionar informações do plano à request
    req.companyPlan = {
      id: plan.id,
      name: plan.name,
      maxProfessionals: plan.maxProfessionals || 1,
      permissions: plan.permissions || {
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
      }
    };

    next();
  } catch (error) {
    console.error('Error loading company plan:', error);
    next(); // Continua mesmo com erro
  }
};

// Middleware para verificar permissão específica
export const requirePermission = (permission: keyof RequestWithPlan['companyPlan']['permissions']) => {
  return (req: RequestWithPlan, res: Response, next: NextFunction) => {
    if (!req.companyPlan) {
      return res.status(403).json({ message: 'Acesso negado - plano não encontrado' });
    }

    if (!req.companyPlan.permissions[permission]) {
      return res.status(403).json({ 
        message: `Acesso negado - seu plano não inclui acesso a ${getPermissionName(permission)}`,
        missingPermission: permission
      });
    }

    next();
  };
};

// Middleware para verificar limite de profissionais
export const checkProfessionalsLimit = async (req: RequestWithPlan, res: Response, next: NextFunction) => {
  try {
    if (!req.companyPlan) {
      return res.status(403).json({ message: 'Acesso negado - plano não encontrado' });
    }

    const session = req.session as CompanySession;
    const currentCount = await storage.getProfessionalsCount(session.companyId);
    
    if (currentCount >= req.companyPlan.maxProfessionals) {
      return res.status(403).json({ 
        message: `Limite de profissionais atingido. Seu plano permite no máximo ${req.companyPlan.maxProfessionals} profissionais.`,
        limit: req.companyPlan.maxProfessionals,
        current: currentCount
      });
    }

    next();
  } catch (error) {
    console.error('Error checking professionals limit:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

function getPermissionName(permission: string): string {
  const names: Record<string, string> = {
    dashboard: 'Dashboard',
    appointments: 'Agendamentos',
    services: 'Serviços',
    professionals: 'Profissionais',
    clients: 'Clientes',
    reviews: 'Avaliações',
    tasks: 'Tarefas',
    pointsProgram: 'Programa de Pontos',
    loyalty: 'Fidelidade',
    inventory: 'Inventário',
    messages: 'Mensagens',
    coupons: 'Cupons',
    financial: 'Financeiro',
    reports: 'Relatórios',
    settings: 'Configurações'
  };
  return names[permission] || permission;
}