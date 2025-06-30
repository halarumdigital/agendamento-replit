import type { Express } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { z } from "zod";

// JWT Secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || "mobile-api-secret-key";

// Middleware para autenticação JWT
const authenticateJWT = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Token não fornecido"
      }
    });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token inválido"
      }
    });
  }
};

// Helper para respostas padronizadas
const apiResponse = (success: boolean, data?: any, message?: string, error?: any) => {
  if (success) {
    return {
      success: true,
      data,
      message: message || "Operação realizada com sucesso"
    };
  } else {
    return {
      success: false,
      error: error || {
        code: "UNKNOWN_ERROR",
        message: message || "Erro desconhecido"
      }
    };
  }
};

// Schemas de validação
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

const createAppointmentSchema = z.object({
  clientName: z.string().min(1, "Nome do cliente é obrigatório"),
  clientPhone: z.string().min(10, "Telefone inválido"),
  clientEmail: z.string().email("Email inválido").optional(),
  professionalId: z.number(),
  serviceId: z.number(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:MM)"),
  notes: z.string().optional()
});

const updateAppointmentSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").optional(),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida").optional()
});

const createClientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("Email inválido").optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").optional(),
  address: z.string().optional()
});

export function setupMobileRoutes(app: Express) {
  
  // ========== AUTENTICAÇÃO ==========
  
  // Login de Empresa
  app.post('/api/mobile/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const company = await storage.getCompanyByEmail(email);
      if (!company) {
        return res.status(401).json(apiResponse(false, null, null, {
          code: "INVALID_CREDENTIALS",
          message: "Email ou senha incorretos"
        }));
      }

      const isValidPassword = await bcrypt.compare(password, company.password);
      if (!isValidPassword) {
        return res.status(401).json(apiResponse(false, null, null, {
          code: "INVALID_CREDENTIALS", 
          message: "Email ou senha incorretos"
        }));
      }

      if (company.isActive !== 1) {
        return res.status(403).json(apiResponse(false, null, null, {
          code: "ACCOUNT_DISABLED",
          message: "Conta desativada"
        }));
      }

      // Buscar plano e permissões
      const plan = await storage.getPlan(company.planId);
      let permissions = {};
      
      if (plan && plan.permissions) {
        try {
          permissions = typeof plan.permissions === 'string' 
            ? JSON.parse(plan.permissions) 
            : plan.permissions;
        } catch (e) {
          permissions = {
            dashboard: true,
            appointments: true,
            services: true,
            professionals: true,
            clients: true,
            mercadopagoPayments: false
          };
        }
      }

      // Gerar JWT token
      const token = jwt.sign({
        id: company.id,
        type: 'company',
        email: company.email,
        permissions
      }, JWT_SECRET, { expiresIn: '24h' });

      res.json(apiResponse(true, {
        company: {
          id: company.id,
          fantasyName: company.fantasyName,
          email: company.email,
          phone: company.phone,
          address: company.address
        },
        token,
        permissions
      }));

    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(apiResponse(false, null, null, {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos",
          details: error.errors
        }));
      }
      res.status(500).json(apiResponse(false, null, "Erro interno do servidor"));
    }
  });

  // Login de Profissional
  app.post('/api/mobile/auth/professional-login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const professional = await storage.getProfessionalByEmail(email);
      if (!professional) {
        return res.status(401).json(apiResponse(false, null, null, {
          code: "INVALID_CREDENTIALS",
          message: "Email ou senha incorretos"
        }));
      }

      const isValidPassword = await bcrypt.compare(password, professional.password);
      if (!isValidPassword) {
        return res.status(401).json(apiResponse(false, null, null, {
          code: "INVALID_CREDENTIALS",
          message: "Email ou senha incorretos"
        }));
      }

      // Gerar JWT token
      const token = jwt.sign({
        id: professional.id,
        type: 'professional',
        companyId: professional.companyId,
        email: professional.email
      }, JWT_SECRET, { expiresIn: '24h' });

      res.json(apiResponse(true, {
        professional: {
          id: professional.id,
          name: professional.name,
          email: professional.email,
          specialization: professional.specialization,
          companyId: professional.companyId
        },
        token
      }));

    } catch (error) {
      console.error('Professional login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(apiResponse(false, null, null, {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos",
          details: error.errors
        }));
      }
      res.status(500).json(apiResponse(false, null, "Erro interno do servidor"));
    }
  });

  // Logout
  app.post('/api/mobile/auth/logout', authenticateJWT, (req, res) => {
    // Em uma implementação completa, você pode adicionar o token a uma blacklist
    res.json(apiResponse(true, null, "Logout realizado com sucesso"));
  });

  // ========== AGENDAMENTOS ==========

  // Listar Agendamentos
  app.get('/api/mobile/appointments', authenticateJWT, async (req: any, res) => {
    try {
      const { date, professionalId, status, page = 1, limit = 50 } = req.query;
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;
      
      const appointments = await storage.getAppointments(companyId, {
        date,
        professionalId: professionalId ? parseInt(professionalId) : undefined,
        status,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      // Enriquecer dados com informações do profissional e serviço
      const enrichedAppointments = await Promise.all(
        appointments.map(async (appointment: any) => {
          const [professional, service] = await Promise.all([
            storage.getProfessional(appointment.professionalId),
            storage.getService(appointment.serviceId)
          ]);

          return {
            ...appointment,
            professional: professional ? {
              id: professional.id,
              name: professional.name,
              specialization: professional.specialization
            } : null,
            service: service ? {
              id: service.id,
              name: service.name,
              price: service.price,
              duration: service.duration
            } : null
          };
        })
      );

      res.json(apiResponse(true, {
        appointments: enrichedAppointments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: enrichedAppointments.length,
          pages: Math.ceil(enrichedAppointments.length / parseInt(limit))
        }
      }));

    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar agendamentos"));
    }
  });

  // Criar Agendamento
  app.post('/api/mobile/appointments', authenticateJWT, async (req: any, res) => {
    try {
      const data = createAppointmentSchema.parse(req.body);
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      // Verificar se o profissional e serviço pertencem à empresa
      const [professional, service] = await Promise.all([
        storage.getProfessional(data.professionalId),
        storage.getService(data.serviceId)
      ]);

      if (!professional || professional.companyId !== companyId) {
        return res.status(400).json(apiResponse(false, null, null, {
          code: "INVALID_PROFESSIONAL",
          message: "Profissional não encontrado ou não pertence à empresa"
        }));
      }

      if (!service || service.companyId !== companyId) {
        return res.status(400).json(apiResponse(false, null, null, {
          code: "INVALID_SERVICE",
          message: "Serviço não encontrado ou não pertence à empresa"
        }));
      }

      const appointment = await storage.createAppointment({
        companyId,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        appointmentDate: new Date(data.appointmentDate),
        appointmentTime: data.appointmentTime,
        duration: service.duration || 60,
        status: 'agendado',
        totalPrice: service.price,
        notes: data.notes || '',
        reminderSent: 0
      });

      res.status(201).json(apiResponse(true, appointment, "Agendamento criado com sucesso"));

    } catch (error) {
      console.error('Create appointment error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(apiResponse(false, null, null, {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos",
          details: error.errors
        }));
      }
      res.status(500).json(apiResponse(false, null, "Erro ao criar agendamento"));
    }
  });

  // Atualizar Agendamento
  app.put('/api/mobile/appointments/:id', authenticateJWT, async (req: any, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const data = updateAppointmentSchema.parse(req.body);
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      // Verificar se o agendamento existe e pertence à empresa
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "APPOINTMENT_NOT_FOUND",
          message: "Agendamento não encontrado"
        }));
      }

      const updatedAppointment = await storage.updateAppointment(appointmentId, {
        ...(data.status && { status: data.status }),
        ...(data.notes && { notes: data.notes }),
        ...(data.appointmentDate && { appointmentDate: new Date(data.appointmentDate) }),
        ...(data.appointmentTime && { appointmentTime: data.appointmentTime })
      });

      res.json(apiResponse(true, updatedAppointment, "Agendamento atualizado com sucesso"));

    } catch (error) {
      console.error('Update appointment error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(apiResponse(false, null, null, {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos",
          details: error.errors
        }));
      }
      res.status(500).json(apiResponse(false, null, "Erro ao atualizar agendamento"));
    }
  });

  // Cancelar Agendamento
  app.delete('/api/mobile/appointments/:id', authenticateJWT, async (req: any, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "APPOINTMENT_NOT_FOUND",
          message: "Agendamento não encontrado"
        }));
      }

      await storage.updateAppointment(appointmentId, { status: 'cancelado' });
      res.json(apiResponse(true, null, "Agendamento cancelado com sucesso"));

    } catch (error) {
      console.error('Cancel appointment error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao cancelar agendamento"));
    }
  });

  // ========== PROFISSIONAIS ==========

  // Listar Profissionais
  app.get('/api/mobile/professionals', authenticateJWT, async (req: any, res) => {
    try {
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;
      const professionals = await storage.getProfessionals(companyId);

      res.json(apiResponse(true, { professionals }));
    } catch (error) {
      console.error('Get professionals error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar profissionais"));
    }
  });

  // Obter Profissional por ID
  app.get('/api/mobile/professionals/:id', authenticateJWT, async (req: any, res) => {
    try {
      const professionalId = parseInt(req.params.id);
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;
      
      const professional = await storage.getProfessional(professionalId);
      if (!professional || professional.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "PROFESSIONAL_NOT_FOUND",
          message: "Profissional não encontrado"
        }));
      }

      res.json(apiResponse(true, { professional }));
    } catch (error) {
      console.error('Get professional error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar profissional"));
    }
  });

  // Agenda do Profissional
  app.get('/api/mobile/professionals/:id/schedule', authenticateJWT, async (req: any, res) => {
    try {
      const professionalId = parseInt(req.params.id);
      const { date } = req.query;
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      const professional = await storage.getProfessional(professionalId);
      if (!professional || professional.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "PROFESSIONAL_NOT_FOUND",
          message: "Profissional não encontrado"
        }));
      }

      const appointments = await storage.getAppointments(companyId, {
        professionalId,
        date
      });

      res.json(apiResponse(true, { 
        professional: {
          id: professional.id,
          name: professional.name
        },
        date,
        appointments 
      }));
    } catch (error) {
      console.error('Get professional schedule error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar agenda"));
    }
  });

  // ========== SERVIÇOS ==========

  // Listar Serviços
  app.get('/api/mobile/services', authenticateJWT, async (req: any, res) => {
    try {
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;
      const services = await storage.getServices(companyId);

      res.json(apiResponse(true, { services }));
    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar serviços"));
    }
  });

  // Serviços por Profissional
  app.get('/api/mobile/professionals/:id/services', authenticateJWT, async (req: any, res) => {
    try {
      const professionalId = parseInt(req.params.id);
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      const professional = await storage.getProfessional(professionalId);
      if (!professional || professional.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "PROFESSIONAL_NOT_FOUND",
          message: "Profissional não encontrado"
        }));
      }

      // Por simplicidade, retornamos todos os serviços da empresa
      // Em uma implementação mais avançada, haveria uma relação profissional-serviço
      const services = await storage.getServices(companyId);

      res.json(apiResponse(true, { services }));
    } catch (error) {
      console.error('Get professional services error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar serviços"));
    }
  });

  // ========== CLIENTES ==========

  // Listar Clientes
  app.get('/api/mobile/clients', authenticateJWT, async (req: any, res) => {
    try {
      const { search, page = 1, limit = 20 } = req.query;
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      const clients = await storage.getClients(companyId, {
        search,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json(apiResponse(true, {
        clients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: clients.length
        }
      }));
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar clientes"));
    }
  });

  // Criar Cliente
  app.post('/api/mobile/clients', authenticateJWT, async (req: any, res) => {
    try {
      const data = createClientSchema.parse(req.body);
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      const client = await storage.createClient({
        companyId,
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : null
      });

      res.status(201).json(apiResponse(true, client, "Cliente criado com sucesso"));
    } catch (error) {
      console.error('Create client error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(apiResponse(false, null, null, {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos",
          details: error.errors
        }));
      }
      res.status(500).json(apiResponse(false, null, "Erro ao criar cliente"));
    }
  });

  // Histórico de Agendamentos do Cliente
  app.get('/api/mobile/clients/:id/appointments', authenticateJWT, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      const client = await storage.getClient(clientId);
      if (!client || client.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "CLIENT_NOT_FOUND",
          message: "Cliente não encontrado"
        }));
      }

      const appointments = await storage.getAppointmentsByClient(clientId);
      res.json(apiResponse(true, { appointments }));
    } catch (error) {
      console.error('Get client appointments error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar histórico"));
    }
  });

  // ========== DASHBOARD ==========

  // Resumo do Dashboard
  app.get('/api/mobile/dashboard', authenticateJWT, async (req: any, res) => {
    try {
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;
      
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = await storage.getAppointments(companyId, { date: today });
      
      const todayRevenue = todayAppointments.reduce((total, apt) => {
        return total + parseFloat(apt.totalPrice || '0');
      }, 0);

      const confirmedToday = todayAppointments.filter(apt => apt.status === 'confirmado').length;
      const pendingToday = todayAppointments.filter(apt => apt.status === 'agendado').length;

      // Próximos agendamentos (hoje)
      const nextAppointments = todayAppointments
        .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
        .slice(0, 5)
        .map(apt => ({
          id: apt.id,
          clientName: apt.clientName,
          time: apt.appointmentTime,
          service: apt.service || 'Serviço'
        }));

      res.json(apiResponse(true, {
        today: {
          appointments: todayAppointments.length,
          revenue: todayRevenue.toFixed(2),
          confirmed: confirmedToday,
          pending: pendingToday
        },
        nextAppointments
      }));

    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao carregar dashboard"));
    }
  });

  // ========== GESTÃO AVANÇADA DE AGENDA ==========

  // Horários disponíveis para agendamento
  app.get('/api/mobile/schedule/available-slots', authenticateJWT, async (req: any, res) => {
    try {
      const { professionalId, serviceId, date } = req.query;
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      if (!professionalId || !serviceId || !date) {
        return res.status(400).json(apiResponse(false, null, null, {
          code: "MISSING_PARAMETERS",
          message: "Parâmetros obrigatórios: professionalId, serviceId, date"
        }));
      }

      // Verificar se o profissional e serviço existem
      const [professional, service] = await Promise.all([
        storage.getProfessional(parseInt(professionalId)),
        storage.getService(parseInt(serviceId))
      ]);

      if (!professional || professional.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "PROFESSIONAL_NOT_FOUND",
          message: "Profissional não encontrado"
        }));
      }

      if (!service || service.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "SERVICE_NOT_FOUND",
          message: "Serviço não encontrado"
        }));
      }

      // Buscar agendamentos existentes na data
      const existingAppointments = await storage.getAppointments(companyId, {
        professionalId: parseInt(professionalId),
        date
      });

      // Gerar horários disponíveis (8h às 18h, intervalos de 30min)
      const availableSlots = [];
      const startHour = 8;
      const endHour = 18;
      const serviceDuration = service.duration || 60;

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          // Verificar se o horário está ocupado
          const isOccupied = existingAppointments.some((apt: any) => {
            const aptTime = apt.appointmentTime;
            const aptDuration = apt.duration || 60;
            const aptStartMinutes = parseInt(aptTime.split(':')[0]) * 60 + parseInt(aptTime.split(':')[1]);
            const aptEndMinutes = aptStartMinutes + aptDuration;
            const slotStartMinutes = hour * 60 + minute;
            const slotEndMinutes = slotStartMinutes + serviceDuration;
            
            return (slotStartMinutes < aptEndMinutes && slotEndMinutes > aptStartMinutes);
          });

          if (!isOccupied) {
            availableSlots.push({
              time: timeSlot,
              duration: serviceDuration,
              available: true
            });
          }
        }
      }

      res.json(apiResponse(true, {
        date,
        professional: {
          id: professional.id,
          name: professional.name
        },
        service: {
          id: service.id,
          name: service.name,
          duration: service.duration
        },
        availableSlots
      }));

    } catch (error) {
      console.error('Get available slots error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar horários disponíveis"));
    }
  });

  // Reagendar um agendamento
  app.put('/api/mobile/appointments/:id/reschedule', authenticateJWT, async (req: any, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { newDate, newTime, reason } = req.body;
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      if (!newDate || !newTime) {
        return res.status(400).json(apiResponse(false, null, null, {
          code: "MISSING_PARAMETERS",
          message: "Nova data e horário são obrigatórios"
        }));
      }

      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "APPOINTMENT_NOT_FOUND",
          message: "Agendamento não encontrado"
        }));
      }

      // Verificar se o novo horário está disponível
      const conflictingAppointments = await storage.getAppointments(companyId, {
        professionalId: appointment.professionalId,
        date: newDate
      });

      const hasConflict = conflictingAppointments.some((apt: any) => 
        apt.id !== appointmentId && apt.appointmentTime === newTime
      );

      if (hasConflict) {
        return res.status(409).json(apiResponse(false, null, null, {
          code: "TIME_CONFLICT",
          message: "Horário já ocupado"
        }));
      }

      const updatedAppointment = await storage.updateAppointment(appointmentId, {
        appointmentDate: new Date(newDate),
        appointmentTime: newTime,
        notes: appointment.notes + (reason ? `\n\nReagendado: ${reason}` : '\n\nReagendado via app mobile')
      });

      res.json(apiResponse(true, updatedAppointment, "Agendamento reagendado com sucesso"));

    } catch (error) {
      console.error('Reschedule appointment error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao reagendar agendamento"));
    }
  });

  // Agenda resumida (visão mensal)
  app.get('/api/mobile/schedule/calendar', authenticateJWT, async (req: any, res) => {
    try {
      const { year, month, professionalId } = req.query;
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || (new Date().getMonth() + 1);

      // Buscar todos os agendamentos do mês
      const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

      const appointments = await storage.getAppointmentsByDateRange(companyId, startDate, endDate, professionalId ? parseInt(professionalId) : undefined);

      // Agrupar por dia
      const calendarData = appointments.reduce((acc: any, apt: any) => {
        const date = apt.appointmentDate.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            appointmentCount: 0,
            revenue: 0,
            appointments: []
          };
        }
        acc[date].appointmentCount++;
        acc[date].revenue += parseFloat(apt.totalPrice || '0');
        acc[date].appointments.push({
          id: apt.id,
          time: apt.appointmentTime,
          clientName: apt.clientName,
          status: apt.status,
          service: apt.service || 'Serviço'
        });
        return acc;
      }, {});

      res.json(apiResponse(true, {
        year: currentYear,
        month: currentMonth,
        calendarData
      }));

    } catch (error) {
      console.error('Get calendar error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao carregar calendário"));
    }
  });

  // ========== GESTÃO COMPLETA DE CLIENTES ==========

  // Buscar cliente por telefone
  app.get('/api/mobile/clients/search', authenticateJWT, async (req: any, res) => {
    try {
      const { phone, name, email } = req.query;
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      if (!phone && !name && !email) {
        return res.status(400).json(apiResponse(false, null, null, {
          code: "MISSING_SEARCH_PARAMETER",
          message: "Forneça pelo menos um parâmetro de busca: phone, name ou email"
        }));
      }

      const clients = await storage.searchClients(companyId, { phone, name, email });

      res.json(apiResponse(true, { clients }));
    } catch (error) {
      console.error('Search clients error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar clientes"));
    }
  });

  // Atualizar dados do cliente
  app.put('/api/mobile/clients/:id', authenticateJWT, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const updateData = req.body;
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      const client = await storage.getClient(clientId);
      if (!client || client.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "CLIENT_NOT_FOUND",
          message: "Cliente não encontrado"
        }));
      }

      const updatedClient = await storage.updateClient(clientId, {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.phone && { phone: updateData.phone }),
        ...(updateData.email && { email: updateData.email }),
        ...(updateData.birthDate && { birthDate: new Date(updateData.birthDate) }),
        ...(updateData.address && { address: updateData.address })
      });

      res.json(apiResponse(true, updatedClient, "Cliente atualizado com sucesso"));
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao atualizar cliente"));
    }
  });

  // Estatísticas do cliente
  app.get('/api/mobile/clients/:id/stats', authenticateJWT, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      const client = await storage.getClient(clientId);
      if (!client || client.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "CLIENT_NOT_FOUND",
          message: "Cliente não encontrado"
        }));
      }

      const appointments = await storage.getAppointmentsByClient(clientId);
      
      const stats = {
        totalAppointments: appointments.length,
        totalSpent: appointments.reduce((sum: number, apt: any) => sum + parseFloat(apt.totalPrice || '0'), 0),
        lastAppointment: appointments.sort((a: any, b: any) => 
          new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
        )[0] || null,
        favoriteServices: {} as any,
        averageInterval: 0
      };

      // Calcular serviços favoritos
      appointments.forEach((apt: any) => {
        const serviceName = apt.service || 'Serviço Desconhecido';
        stats.favoriteServices[serviceName] = (stats.favoriteServices[serviceName] || 0) + 1;
      });

      // Calcular intervalo médio entre consultas
      if (appointments.length > 1) {
        const sortedAppointments = appointments.sort((a: any, b: any) => 
          new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
        );
        
        let totalDays = 0;
        for (let i = 1; i < sortedAppointments.length; i++) {
          const diff = new Date(sortedAppointments[i].appointmentDate).getTime() - 
                      new Date(sortedAppointments[i-1].appointmentDate).getTime();
          totalDays += diff / (1000 * 60 * 60 * 24);
        }
        stats.averageInterval = Math.round(totalDays / (sortedAppointments.length - 1));
      }

      res.json(apiResponse(true, { client, stats }));
    } catch (error) {
      console.error('Get client stats error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar estatísticas do cliente"));
    }
  });

  // ========== RELATÓRIOS E ANALYTICS ==========

  // Relatório de performance
  app.get('/api/mobile/reports/performance', authenticateJWT, async (req: any, res) => {
    try {
      const { period = 'month', year, month, startDate, endDate } = req.query;
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      let start: string, end: string;

      if (period === 'custom' && startDate && endDate) {
        start = startDate;
        end = endDate;
      } else if (period === 'month') {
        const currentYear = year || new Date().getFullYear();
        const currentMonth = month || (new Date().getMonth() + 1);
        start = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
        end = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
      } else {
        // período padrão: últimos 30 dias
        end = new Date().toISOString().split('T')[0];
        const startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - 30);
        start = startDateObj.toISOString().split('T')[0];
      }

      const appointments = await storage.getAppointmentsByDateRange(companyId, start, end);

      const performance = {
        period: { start, end },
        totals: {
          appointments: appointments.length,
          revenue: appointments.reduce((sum: number, apt: any) => sum + parseFloat(apt.totalPrice || '0'), 0),
          clients: new Set(appointments.map((apt: any) => apt.clientPhone)).size
        },
        byStatus: {} as any,
        byProfessional: {} as any,
        byService: {} as any,
        dailyBreakdown: {} as any
      };

      // Análise por status
      appointments.forEach((apt: any) => {
        performance.byStatus[apt.status] = (performance.byStatus[apt.status] || 0) + 1;
      });

      // Análise por profissional (precisaria buscar dados do profissional)
      appointments.forEach((apt: any) => {
        const profId = apt.professionalId;
        if (!performance.byProfessional[profId]) {
          performance.byProfessional[profId] = { count: 0, revenue: 0 };
        }
        performance.byProfessional[profId].count++;
        performance.byProfessional[profId].revenue += parseFloat(apt.totalPrice || '0');
      });

      // Análise por serviço
      appointments.forEach((apt: any) => {
        const serviceName = apt.service || 'Serviço Desconhecido';
        if (!performance.byService[serviceName]) {
          performance.byService[serviceName] = { count: 0, revenue: 0 };
        }
        performance.byService[serviceName].count++;
        performance.byService[serviceName].revenue += parseFloat(apt.totalPrice || '0');
      });

      // Breakdown diário
      appointments.forEach((apt: any) => {
        const date = apt.appointmentDate.toISOString().split('T')[0];
        if (!performance.dailyBreakdown[date]) {
          performance.dailyBreakdown[date] = { count: 0, revenue: 0 };
        }
        performance.dailyBreakdown[date].count++;
        performance.dailyBreakdown[date].revenue += parseFloat(apt.totalPrice || '0');
      });

      res.json(apiResponse(true, performance));
    } catch (error) {
      console.error('Get performance report error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao gerar relatório de performance"));
    }
  });

  // ========== PAGAMENTOS MERCADO PAGO ==========

  // Gerar link de pagamento
  app.post('/api/mobile/payments/generate-link', authenticateJWT, async (req: any, res) => {
    try {
      const { appointmentId, amount, description } = req.body;
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      if (!appointmentId || !amount) {
        return res.status(400).json(apiResponse(false, null, null, {
          code: "MISSING_PARAMETERS",
          message: "appointmentId e amount são obrigatórios"
        }));
      }

      // Verificar permissões e configuração do Mercado Pago
      const company = await storage.getCompany(companyId);
      if (!company || company.mercadopagoEnabled !== 1) {
        return res.status(403).json(apiResponse(false, null, null, {
          code: "MERCADOPAGO_DISABLED",
          message: "Mercado Pago não está habilitado para esta empresa"
        }));
      }

      // Verificar se o agendamento existe
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.companyId !== companyId) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "APPOINTMENT_NOT_FOUND",
          message: "Agendamento não encontrado"
        }));
      }

      // Simular geração de link do Mercado Pago
      const paymentLink = `https://mercadopago.com.br/checkout/v1/redirect?pref_id=payment_${appointmentId}_${Date.now()}`;

      res.json(apiResponse(true, {
        paymentLink,
        amount: parseFloat(amount),
        description: description || `Pagamento - ${appointment.clientName}`,
        appointmentId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
      }, "Link de pagamento gerado com sucesso"));

    } catch (error) {
      console.error('Generate payment link error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao gerar link de pagamento"));
    }
  });

  // ========== NOTIFICAÇÕES ==========

  // Listar notificações
  app.get('/api/mobile/notifications', authenticateJWT, async (req: any, res) => {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;

      // Simular notificações baseadas em agendamentos recentes
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = await storage.getAppointments(companyId, { date: today });

      const notifications = todayAppointments.map((apt: any, index: number) => ({
        id: `notif_${apt.id}_${index}`,
        type: 'appointment_reminder',
        title: 'Lembrete de Agendamento',
        message: `${apt.clientName} tem agendamento hoje às ${apt.appointmentTime}`,
        read: index > 2, // primeiras 3 não lidas
        createdAt: new Date().toISOString(),
        data: {
          appointmentId: apt.id,
          clientName: apt.clientName,
          time: apt.appointmentTime
        }
      }));

      const filteredNotifications = unreadOnly === 'true' 
        ? notifications.filter(n => !n.read)
        : notifications;

      const paginatedNotifications = filteredNotifications.slice(
        (parseInt(page) - 1) * parseInt(limit),
        parseInt(page) * parseInt(limit)
      );

      res.json(apiResponse(true, {
        notifications: paginatedNotifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredNotifications.length,
          unreadCount: notifications.filter(n => !n.read).length
        }
      }));

    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar notificações"));
    }
  });

  // Marcar notificação como lida
  app.put('/api/mobile/notifications/:id/read', authenticateJWT, async (req: any, res) => {
    try {
      const notificationId = req.params.id;
      
      // Em uma implementação real, você salvaria o status no banco
      res.json(apiResponse(true, { notificationId, read: true }, "Notificação marcada como lida"));
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao marcar notificação"));
    }
  });

  // ========== CONFIGURAÇÕES ==========

  // Configurações da Empresa
  app.get('/api/mobile/settings/company', authenticateJWT, async (req: any, res) => {
    try {
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;
      const company = await storage.getCompany(companyId);

      if (!company) {
        return res.status(404).json(apiResponse(false, null, null, {
          code: "COMPANY_NOT_FOUND",
          message: "Empresa não encontrada"
        }));
      }

      res.json(apiResponse(true, {
        company: {
          id: company.id,
          fantasyName: company.fantasyName,
          email: company.email,
          phone: company.phone,
          address: company.address,
          mercadopagoEnabled: company.mercadopagoEnabled === 1
        }
      }));
    } catch (error) {
      console.error('Get company settings error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao buscar configurações"));
    }
  });

  // Atualizar configurações da empresa
  app.put('/api/mobile/settings/company', authenticateJWT, async (req: any, res) => {
    try {
      const companyId = req.user.type === 'company' ? req.user.id : req.user.companyId;
      const updateData = req.body;

      if (req.user.type !== 'company') {
        return res.status(403).json(apiResponse(false, null, null, {
          code: "FORBIDDEN",
          message: "Apenas empresas podem alterar configurações"
        }));
      }

      const updatedCompany = await storage.updateCompany(companyId, {
        ...(updateData.fantasyName && { fantasyName: updateData.fantasyName }),
        ...(updateData.phone && { phone: updateData.phone }),
        ...(updateData.address && { address: updateData.address }),
        ...(typeof updateData.mercadopagoEnabled === 'boolean' && { 
          mercadopagoEnabled: updateData.mercadopagoEnabled ? 1 : 0 
        })
      });

      res.json(apiResponse(true, updatedCompany, "Configurações atualizadas com sucesso"));
    } catch (error) {
      console.error('Update company settings error:', error);
      res.status(500).json(apiResponse(false, null, "Erro ao atualizar configurações"));
    }
  });

  // ========== STATUS DA API ==========

  // Endpoint de status/health check
  app.get('/api/mobile/status', (req, res) => {
    res.json(apiResponse(true, {
      status: 'online',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }));
  });

}