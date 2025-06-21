import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isCompanyAuthenticated } from "./auth";
import { db, pool } from "./db";
import { loadCompanyPlan, requirePermission, checkProfessionalsLimit, RequestWithPlan } from "./plan-middleware";
import { checkSubscriptionStatus, getCompanySubscriptionStatus } from "./subscription-middleware";
import { insertCompanySchema, insertPlanSchema, insertGlobalSettingsSchema, insertAdminSchema, financialCategories, paymentMethods, financialTransactions, companies, adminAlerts, companyAlertViews, insertCouponSchema, supportTickets, supportTicketTypes, supportTicketStatuses } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import QRCode from "qrcode";
import { reminderScheduler, rescheduleRemindersForAppointment } from "./reminder-scheduler";
import { sql, eq, and, desc, asc, sum, count, gte, lte } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";

import { stripeService } from "./services/stripe";
import { 
  getLoyaltyCampaignsByCompany, 
  createLoyaltyCampaign, 
  updateLoyaltyCampaign, 
  toggleLoyaltyCampaign, 
  deleteLoyaltyCampaign, 
  getLoyaltyRewardsHistory 
} from "./storage";
import { formatBrazilianPhone, validateBrazilianPhone, normalizePhone } from "../shared/phone-utils";

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/support-tickets';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `ticket-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const supportTicketUpload = multer({
  storage: storage_config,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas!'));
    }
  }
});

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

// Function to transcribe audio using OpenAI Whisper
async function transcribeAudio(audioBase64: string, openaiApiKey: string): Promise<string | null> {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: openaiApiKey });
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // WhatsApp typically sends audio as OGG Opus format, but we'll try to detect
    let extension = 'ogg'; // Default to ogg for WhatsApp
    if (audioBuffer.length > 4) {
      const header = audioBuffer.subarray(0, 4);
      const headerStr = header.toString('ascii', 0, 4);
      
      if (header[0] === 0xFF && (header[1] & 0xF0) === 0xF0) {
        extension = 'mp3';
      } else if (headerStr === 'OggS') {
        extension = 'ogg';
      } else if (headerStr === 'RIFF') {
        extension = 'wav';
      } else if (headerStr.includes('ftyp')) {
        extension = 'm4a';
      } else {
        // WhatsApp commonly uses OGG format even without proper header
        extension = 'ogg';
      }
    }
    
    const tempFilePath = path.join('/tmp', `audio_${Date.now()}.${extension}`);
    
    // Ensure /tmp directory exists
    if (!fs.existsSync('/tmp')) {
      fs.mkdirSync('/tmp', { recursive: true });
    }
    
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    // Create a readable stream for OpenAI
    const audioStream = fs.createReadStream(tempFilePath);
    
    console.log(`🎵 Transcribing audio file: ${extension} format, size: ${audioBuffer.length} bytes`);
    
    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      language: "pt", // Portuguese language
    });
    
    // Clean up temporary file
    fs.unlinkSync(tempFilePath);
    
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return null;
  }
}

const logoUpload = multer({
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
  
  // Generate next 7 days for reference
  const nextDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    nextDays.push({
      date: date.toISOString().split('T')[0],
      dayName: dayNames[date.getDay()],
      formatted: date.toLocaleDateString('pt-BR')
    });
  }
  
  let availabilityText = 'DISPONIBILIDADE REAL DOS PROFISSIONAIS POR DATA:\n\n';
  
  for (const prof of professionals) {
    if (!prof.active) continue;
    
    availabilityText += `${prof.name} (ID: ${prof.id}):\n`;
    
    // Work days and hours
    const workDays = prof.workDays || [1, 2, 3, 4, 5, 6]; // Default: Monday to Saturday
    const workStart = prof.workStartTime || '09:00';
    const workEnd = prof.workEndTime || '18:00';
    
    availabilityText += `- Horário de trabalho: ${workStart} às ${workEnd}\n`;
    availabilityText += `- Dias de trabalho: ${workDays.map((day: number) => dayNames[day]).join(', ')}\n\n`;
    
    // Check availability for next 7 days
    for (const day of nextDays) {
      const dayOfWeek = new Date(day.date + 'T00:00:00').getDay();
      
      if (!workDays.includes(dayOfWeek)) {
        availabilityText += `  ${day.dayName} (${day.formatted}): NÃO TRABALHA\n`;
        continue;
      }
      
      // Find appointments for this specific date
      const dayAppointments = existingAppointments.filter(apt => {
        if (apt.professionalId !== prof.id || 
            apt.status === 'Cancelado' || 
            apt.status === 'cancelado') {
          return false;
        }
        // Convert appointment date to string for comparison
        const aptDate = new Date(apt.appointmentDate);
        const aptDateString = aptDate.toISOString().split('T')[0];
        
        // Debug log to see the comparison
        if (prof.id === 4 || prof.id === 5) {
          console.log(`🔍 Comparing appointment: ${aptDateString} vs ${day.date} for professional ${prof.name} (${prof.id})`);
        }
        
        return aptDateString === day.date;
      });
      
      if (dayAppointments.length > 0) {
        const times = dayAppointments.map(apt => apt.appointmentTime).sort();
        availabilityText += `  ${day.dayName} (${day.formatted}): OCUPADO às ${times.join(', ')}\n`;
      } else {
        availabilityText += `  ${day.dayName} (${day.formatted}): LIVRE (${workStart} às ${workEnd})\n`;
      }
    }
    
    availabilityText += '\n';
  }
  
  return availabilityText;
}

async function createAppointmentFromAIConfirmation(conversationId: number, companyId: number, aiResponse: string, phoneNumber: string) {
  try {
    console.log('🎯 Creating appointment from AI confirmation');
    console.log('🔍 AI Response to analyze:', aiResponse);
    
    // Check if AI is confirming an appointment (has completed details)
    const hasAppointmentConfirmation = /(?:agendamento foi confirmado|agendamento está confirmado|confirmado com sucesso)/i.test(aiResponse);
    const hasCompleteDetails = /(?:profissional|data|horário).*(?:profissional|data|horário).*(?:profissional|data|horário)/i.test(aiResponse);
    
    // Only proceed if AI is confirming appointment with complete details
    if (!hasAppointmentConfirmation && !hasCompleteDetails) {
      console.log('❌ IA não está confirmando agendamento com detalhes completos. Não criando agendamento.');
      return;
    }
    
    console.log('✅ IA confirmando agendamento com detalhes completos');
    
    // Get conversation history to extract appointment data from user messages
    const allMessages = await storage.getMessagesByConversation(conversationId);
    const userMessages = allMessages.filter(m => m.role === 'user').map(m => m.content);
    const allConversationText = userMessages.join(' ');
    
    // Check if user has explicitly confirmed with SIM/OK
    const hasExplicitConfirmation = /\b(sim|ok|confirmo|confirma)\b/i.test(allConversationText);
    if (!hasExplicitConfirmation) {
      console.log('❌ User has not explicitly confirmed with SIM/OK. Not creating appointment.');
      return;
    }
    
    console.log('📚 User conversation text:', allConversationText);
    
    // Enhanced patterns for better extraction from AI response and conversation
    const patterns = {
      clientName: /\b([A-Z][a-zA-ZÀ-ÿ]+\s+[A-Z][a-zA-ZÀ-ÿ]+)\b/g, // Matches "João Silva" pattern
      time: /(?:às|as)\s+(\d{1,2}:?\d{0,2})/i,
      day: /(segunda|terça|quarta|quinta|sexta|sábado|domingo)/i,
      professional: /\b(Magnus|Silva|Flavio)\b/i,
      service: /(escova|corte|hidratação|manicure|pedicure)/i
    };
    
    // Extract client name from AI response first, then conversation text
    let extractedName: string | null = null;
    
    // First, try to extract name from AI response (often contains confirmed name)
    let aiNameMatch = aiResponse.match(/(?:Ótimo|Perfeito|Excelente),\s+([A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+)(?:,|\!|\.)/);
    if (!aiNameMatch) {
      // Try other patterns in AI response
      aiNameMatch = aiResponse.match(/Nome:\s+([A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+)/);
    }
    if (aiNameMatch) {
      extractedName = aiNameMatch[1];
      console.log(`📝 Nome encontrado na resposta da IA: "${extractedName}"`);
    }
    
    // If no name in AI response, look for names in conversation text
    if (!extractedName) {
      const namePatterns = [
        /(?:Confirmo:|agendar|nome)\s*:?\s*([A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+)/i, // "Confirmo: Maicon" or "agendar Maicon"
        /\b([A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+\s+[A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+)\b/g, // "João Silva" with accents
        /(?:me chamo|sou o|nome é|eu sou)\s+([A-ZÀ-ÿ][a-zA-ZÀ-ÿ\s]+?)(?=,|\.|$)/i,
        /^([A-ZÀ-ÿ][a-záéíóúâêôã]+\s+[A-ZÀ-ÿ][a-záéíóúâêôã]+)/m, // Line starting with name
        /\b([A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+)\b/g // Single names like "Gilliard"
      ];
    
      // Try each pattern on conversation text
      for (const pattern of namePatterns) {
        let matches = allConversationText.match(pattern);
        if (matches) {
          for (let match of matches) {
            const potentialName = match.trim();
            if (potentialName && 
                potentialName.length > 2 && 
                potentialName.length < 50 &&
                !potentialName.toLowerCase().includes('whatsapp') &&
                !potentialName.toLowerCase().includes('confirmo') &&
                !potentialName.toLowerCase().includes('profissional') &&
                !potentialName.toLowerCase().includes('serviço') &&
                !potentialName.toLowerCase().includes('agendar') &&
                !potentialName.toLowerCase().includes('magnus') &&
                !potentialName.toLowerCase().includes('silva') &&
                !potentialName.toLowerCase().includes('flavio') &&
                /^[A-ZÀ-ÿ][a-záéíóúâêôã]+(\s+[A-ZÀ-ÿ][a-záéíóúâêôã]+)*$/.test(potentialName)) {
              extractedName = potentialName;
              console.log(`📝 Found name: "${extractedName}" using pattern`);
              break;
            }
          }
          if (extractedName) break;
        }
      }
    }
    
    // Enhanced time extraction with comprehensive patterns
    let extractedTime: string | null = null;
    
    // Try multiple time patterns in order of specificity
    const timePatterns = [
      // AI response patterns
      /Horário:\s*(\d{1,2}:\d{2})/i,           // "Horário: 09:00"
      /(?:às|as)\s+(\d{1,2}:\d{2})/i,          // "às 09:00"
      /(\d{1,2}:\d{2})/g,                      // Any "09:00" format
      // Conversation patterns  
      /(?:às|as)\s+(\d{1,2})/i,                // "às 9"
      /(\d{1,2})h/i,                           // "9h"
      /(\d{1,2})(?=\s|$)/                      // Single digit followed by space or end
    ];
    
    // Check AI response first (more reliable), then conversation
    const searchTexts = [aiResponse, allConversationText];
    
    for (const text of searchTexts) {
      for (const pattern of timePatterns) {
        const matches = text.match(pattern);
        if (matches) {
          let timeCandidate = matches[1];
          
          // Validate time format
          if (timeCandidate && timeCandidate.includes(':')) {
            // Already in HH:MM format
            const [hour, minute] = timeCandidate.split(':');
            const h = parseInt(hour);
            const m = parseInt(minute);
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
              extractedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              console.log(`🕐 Extracted time from ${text === aiResponse ? 'AI response' : 'conversation'}: "${extractedTime}"`);
              break;
            }
          } else if (timeCandidate) {
            // Hour only, add :00
            const hour = parseInt(timeCandidate);
            if (hour >= 0 && hour <= 23) {
              extractedTime = `${hour.toString().padStart(2, '0')}:00`;
              console.log(`🕐 Extracted hour from ${text === aiResponse ? 'AI response' : 'conversation'}: "${extractedTime}"`);
              break;
            }
          }
        }
      }
      if (extractedTime) break;
    }
    
    // Get recent user messages for better context
    const conversationMessages = await storage.getMessagesByConversation(conversationId);
    const recentUserMessages = conversationMessages
      .filter(m => m.role === 'user')
      .slice(-3) // Only last 3 user messages
      .map(m => m.content)
      .join(' ');
    
    console.log(`🔍 Analisando mensagens recentes: ${recentUserMessages}`);
    
    // Priority extraction from AI response first, then recent messages
    let extractedDay = aiResponse.match(patterns.day)?.[1];
    let extractedProfessional = aiResponse.match(patterns.professional)?.[1]?.trim();
    let extractedService = aiResponse.match(patterns.service)?.[1]?.trim();
    
    // Check for "hoje" and "amanhã" in recent messages with higher priority
    const todayPattern = /\bhoje\b/i;
    const tomorrowPattern = /\bamanhã\b/i;
    
    if (todayPattern.test(recentUserMessages)) {
      extractedDay = "hoje";
      console.log(`📅 Detectado "hoje" nas mensagens recentes`);
    } else if (tomorrowPattern.test(recentUserMessages)) {
      extractedDay = "amanhã";
      console.log(`📅 Detectado "amanhã" nas mensagens recentes`);
    } else if (!extractedDay) {
      // Only fallback to all conversation if nothing found in recent messages
      extractedDay = recentUserMessages.match(patterns.day)?.[1] || allConversationText.match(patterns.day)?.[1];
    }
    
    // Same for professional and service from recent messages
    if (!extractedProfessional) {
      extractedProfessional = recentUserMessages.match(patterns.professional)?.[1]?.trim() || allConversationText.match(patterns.professional)?.[1]?.trim();
    }
    if (!extractedService) {
      extractedService = recentUserMessages.match(patterns.service)?.[1]?.trim() || allConversationText.match(patterns.service)?.[1]?.trim();
    }
    
    // If no name found, check existing clients by phone
    if (!extractedName) {
      const clients = await storage.getClientsByCompany(companyId);
      const normalizedPhone = phoneNumber.replace(/\D/g, '');
      const existingClient = clients.find(c => 
        c.phone && c.phone.replace(/\D/g, '') === normalizedPhone
      );
      extractedName = existingClient?.name || null;
    }
    
    console.log('📋 Extracted from AI response and conversation:', {
      clientName: extractedName,
      time: extractedTime,
      day: extractedDay,
      professional: extractedProfessional,
      service: extractedService
    });

    // Validate required data before proceeding
    if (!extractedTime || extractedTime === 'undefined:00') {
      console.log('❌ Invalid time extracted, cannot create appointment');
      return;
    }
    
    // Get professionals and services to match extracted data
    const professionals = await storage.getProfessionalsByCompany(companyId);
    const services = await storage.getServicesByCompany(companyId);
    
    // Find matching professional by name
    let professional = null;
    if (extractedProfessional) {
      professional = professionals.find(p => 
        p.name.toLowerCase() === extractedProfessional.toLowerCase()
      );
    }
    
    // Find matching service
    let service = null;
    if (extractedService) {
      service = services.find(s => 
        s.name.toLowerCase().includes(extractedService.toLowerCase())
      );
    }
    
    // If service not found, try to find from common services
    if (!service) {
      service = services.find(s => s.name.toLowerCase().includes('escova')) ||
               services.find(s => s.name.toLowerCase().includes('corte')) ||
               services[0]; // fallback to first service
    }
    
    // If professional not found, try to find from conversation text
    if (!professional) {
      for (const prof of professionals) {
        if (allConversationText.toLowerCase().includes(prof.name.toLowerCase()) ||
            aiResponse.toLowerCase().includes(prof.name.toLowerCase())) {
          professional = prof;
          break;
        }
      }
    }
    
    if (!professional || !service || !extractedTime) {
      console.log('⚠️ Insufficient data extracted from AI response');
      console.log('Missing:', { 
        professional: !professional ? 'professional' : 'ok',
        service: !service ? 'service' : 'ok', 
        time: !extractedTime ? 'time' : 'ok'
      });
      return;
    }
    
    // Calculate appointment date using the EXACT same logic from system prompt
    const today = new Date();
    const dayMap = { 'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6 };
    let appointmentDate = new Date();
    
    // Handle special cases first
    if (extractedDay?.toLowerCase() === "hoje") {
      appointmentDate = new Date(today);
      console.log(`📅 Agendamento para HOJE: ${appointmentDate.toLocaleDateString('pt-BR')}`);
    } else if (extractedDay?.toLowerCase() === "amanhã") {
      appointmentDate = new Date(today);
      appointmentDate.setDate(today.getDate() + 1);
      console.log(`📅 Agendamento para AMANHÃ: ${appointmentDate.toLocaleDateString('pt-BR')}`);
    } else {
      // Handle regular day names
      const targetDay = dayMap[extractedDay?.toLowerCase() as keyof typeof dayMap];
      
      if (targetDay !== undefined) {
        const currentDay = today.getDay();
        let daysUntilTarget = targetDay - currentDay;
        
        // If it's the same day but later time, keep today
        // Otherwise, get next week's occurrence if day has passed
        if (daysUntilTarget < 0) {
          daysUntilTarget += 7;
        } else if (daysUntilTarget === 0) {
          // Same day - check if it's still possible today or next week
          // For now, assume same day means today
          daysUntilTarget = 0;
        }
        
        // Set the correct date
        appointmentDate.setDate(today.getDate() + daysUntilTarget);
        appointmentDate.setHours(0, 0, 0, 0); // Reset time to start of day
        
        console.log(`📅 Cálculo de data: Hoje é ${today.toLocaleDateString('pt-BR')} (${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][currentDay]})`);
        console.log(`📅 Dia alvo: ${extractedDay} (${targetDay}), Dias até o alvo: ${daysUntilTarget}`);
        console.log(`📅 Data calculada do agendamento: ${appointmentDate.toLocaleDateString('pt-BR')}`);
      }
    }
    
    // Format time
    const formattedTime = extractedTime.includes(':') ? extractedTime : `${extractedTime}:00`;
    
    // Find or create client
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const existingClients = await storage.getClientsByCompany(companyId);
    
    console.log(`🔍 Looking for existing client with phone: ${normalizedPhone}`);
    console.log(`📋 Existing clients:`, existingClients.map(c => ({ name: c.name, phone: c.phone })));
    
    // Try to find existing client by phone or name
    let client = existingClients.find(c => 
      (c.phone && c.phone.replace(/\D/g, '') === normalizedPhone) ||
      (c.name && extractedName && c.name.toLowerCase() === extractedName.toLowerCase())
    );
    
    if (!client) {
      // Use proper Brazilian phone formatting from phone-utils
      console.log(`📞 Processing phone: ${phoneNumber}`);
      const normalizedPhone = normalizePhone(phoneNumber);
      console.log(`📞 Normalized: ${normalizedPhone}`);
      const formattedPhone = formatBrazilianPhone(normalizedPhone);
      console.log(`📞 Formatted: ${formattedPhone}`);
      
      if (!formattedPhone) {
        console.log(`❌ Invalid phone number format: ${phoneNumber}`);
        throw new Error('Formato de telefone inválido');
      }
      
      const clientName = extractedName || `Cliente ${formattedPhone}`;
      console.log(`🆕 Creating new client: ${clientName} with phone ${formattedPhone}`);
      
      client = await storage.createClient({
        companyId,
        name: clientName,
        phone: formattedPhone,
        email: null,
        notes: null,
        birthDate: null
      });
    } else {
      console.log(`✅ Found existing client: ${client.name} (ID: ${client.id})`);
    }
    
    // Check for appointment conflicts before creating
    console.log(`🔍 Checking for appointment conflicts: ${professional.name} on ${appointmentDate.toISOString().split('T')[0]} at ${formattedTime}`);
    
    try {
      // Parse the requested time to minutes for overlap calculation
      const [requestedHour, requestedMin] = formattedTime.split(':').map(Number);
      const requestedTimeInMinutes = requestedHour * 60 + requestedMin;
      const serviceDuration = service.duration || 30; // Default 30 minutes if not specified
      const requestedEndTimeInMinutes = requestedTimeInMinutes + serviceDuration;
      
      console.log(`📊 Novo agendamento: ${formattedTime} (${requestedTimeInMinutes}min) - Duração: ${serviceDuration}min - Fim: ${Math.floor(requestedEndTimeInMinutes/60)}:${String(requestedEndTimeInMinutes%60).padStart(2,'0')}`);
      
      // Get all appointments for this professional on this date (not just exact time match)
      const [existingRows] = await pool.execute(
        `SELECT id, client_name, client_phone, appointment_time, duration 
         FROM appointments 
         WHERE company_id = ? 
           AND professional_id = ?
           AND appointment_date = ?
           AND status != 'Cancelado'`,
        [companyId, professional.id, appointmentDate.toISOString().split('T')[0]]
      ) as any;
      
      let hasConflict = false;
      let conflictingAppointment = null;
      
      for (const existing of existingRows) {
        const [existingHour, existingMin] = existing.appointment_time.split(':').map(Number);
        const existingTimeInMinutes = existingHour * 60 + existingMin;
        const existingDuration = existing.duration || 30;
        const existingEndTimeInMinutes = existingTimeInMinutes + existingDuration;
        
        console.log(`📋 Agendamento existente: ${existing.appointment_time} (${existingTimeInMinutes}min) - Duração: ${existingDuration}min - Fim: ${Math.floor(existingEndTimeInMinutes/60)}:${String(existingEndTimeInMinutes%60).padStart(2,'0')}`);
        
        // Check for time overlap: new appointment overlaps if it starts before existing ends AND ends after existing starts
        const hasOverlap = (
          (requestedTimeInMinutes < existingEndTimeInMinutes) && 
          (requestedEndTimeInMinutes > existingTimeInMinutes)
        );
        
        if (hasOverlap) {
          console.log(`⚠️ Conflito de horário detectado: ${existing.client_name} (${existing.appointment_time}-${Math.floor(existingEndTimeInMinutes/60)}:${String(existingEndTimeInMinutes%60).padStart(2,'0')}) vs novo (${formattedTime}-${Math.floor(requestedEndTimeInMinutes/60)}:${String(requestedEndTimeInMinutes%60).padStart(2,'0')})`);
          
          // Check if conflict is with same phone number (same client updating appointment)
          const existingPhone = existing.client_phone?.replace(/\D/g, '');
          const newPhone = phoneNumber.replace(/\D/g, '');
          
          if (existingPhone === newPhone) {
            console.log(`✅ Conflito com o mesmo cliente, atualizando agendamento existente`);
            // Update existing appointment instead of creating new one
            await storage.updateAppointment(existing.id, {
              appointmentTime: formattedTime,
              appointmentDate,
              duration: serviceDuration,
              updatedAt: new Date(),
              notes: `Agendamento atualizado via WhatsApp - Conversa ID: ${conversationId}`
            });
            console.log(`✅ Agendamento ${existing.id} atualizado com sucesso`);
            return;
          }
          
          hasConflict = true;
          conflictingAppointment = existing;
          break;
        }
      }
      
      if (hasConflict && conflictingAppointment) {
        console.log(`❌ Conflito com cliente diferente: ${conflictingAppointment.client_name} às ${conflictingAppointment.appointment_time}`);
        console.log(`⚠️ Conflito detectado, mas prosseguindo devido à confirmação explícita do usuário`);
      } else {
        console.log(`✅ Nenhum conflito encontrado. Criando agendamento para ${extractedName}`);
      }
    } catch (dbError) {
      console.error('❌ Error checking appointment conflicts:', dbError);
      // Continue with appointment creation if conflict check fails
    }
    
    // Create appointment
    const appointment = await storage.createAppointment({
      companyId,
      professionalId: professional.id,
      serviceId: service.id,
      clientName: extractedName,
      clientPhone: phoneNumber,
      clientEmail: null,
      appointmentDate,
      appointmentTime: formattedTime,
      duration: service.duration || 30,
      totalPrice: service.price || 0,
      status: 'Pendente',
      notes: `Agendamento confirmado via WhatsApp - Conversa ID: ${conversationId}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`✅ Appointment created from AI confirmation: ${extractedName} - ${service.name} - ${appointmentDate.toLocaleDateString()} ${formattedTime}`);
    
    // Force immediate refresh of appointments list
    console.log('📡 Broadcasting new appointment notification...');
    
    // Broadcast notification with complete appointment data
    const appointmentNotification = {
      type: 'new_appointment',
      appointment: {
        id: appointment?.id || Date.now(), // Use appointment ID if available
        clientName: extractedName,
        serviceName: service.name,
        professionalName: professional?.name || 'Profissional',
        appointmentDate: appointmentDate.toISOString().split('T')[0],
        appointmentTime: formattedTime,
        professionalId: professional.id,
        serviceId: service.id,
        status: 'Pendente'
      }
    };
    
    try {
      broadcastEvent(appointmentNotification);
      console.log('✅ Broadcast notification sent:', JSON.stringify(appointmentNotification, null, 2));
    } catch (broadcastError) {
      console.error('⚠️ Broadcast error:', broadcastError);
    }
    
  } catch (error) {
    console.error('❌ Error creating appointment from AI confirmation:', error);
  }
}

async function createAppointmentFromConversation(conversationId: number, companyId: number) {
  try {
    console.log('📅 Checking conversation for complete appointment confirmation:', conversationId);
    
    // Check if appointment already exists for this conversation within the last 5 minutes (only to prevent duplicates)
    const existingAppointments = await storage.getAppointmentsByCompany(companyId);
    const conversationAppointment = existingAppointments.find(apt => 
      apt.notes && apt.notes.includes(`Conversa ID: ${conversationId}`) &&
      apt.createdAt && new Date(apt.createdAt).getTime() > (Date.now() - 5 * 60 * 1000)
    );
    
    if (conversationAppointment) {
      console.log('ℹ️ Recent appointment already exists for this conversation (within 5 min), skipping creation');
      return;
    }
    
    // Get conversation and messages
    const allConversations = await storage.getConversationsByCompany(companyId);
    const conversation = allConversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      console.log('⚠️ Conversa não encontrada:', conversationId);
      return;
    }
    
    const messages = await storage.getMessagesByConversation(conversationId);
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    // REGRA CRÍTICA: Só criar agendamento se houver confirmação explícita final
    const finalConfirmationPhrases = [
      'sim',
      'ok', 
      'confirmo',
      'sim, confirmo',
      'sim, está correto',
      'sim, pode agendar',
      'ok, confirmo',
      'ok, está correto',
      'ok, pode agendar',
      'confirmo sim',
      'está correto sim',
      'pode agendar sim'
    ];
    
    // Get last user message to check for recent confirmation
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const hasRecentConfirmation = lastUserMessage && 
      finalConfirmationPhrases.some(phrase => 
        lastUserMessage.content.toLowerCase().trim() === phrase.toLowerCase()
      );
    
    const hasAnyConfirmation = finalConfirmationPhrases.some(phrase => 
      conversationText.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (!hasRecentConfirmation && !hasAnyConfirmation) {
      console.log('⚠️ Nenhuma confirmação final (sim/ok) encontrada na conversa, pulando criação de agendamento');
      return;
    }
    
    console.log('✅ Confirmação detectada na conversa, prosseguindo com criação de agendamento');

    // VERIFICAÇÃO ADICIONAL: Deve ter data específica mencionada na mesma mensagem ou contexto próximo
    const dateSpecificPhrases = [
      'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo',
      'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira',
      'amanhã', 'hoje', 'depois de amanhã'
    ];
    
    const hasSpecificDate = dateSpecificPhrases.some(phrase => 
      conversationText.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (!hasSpecificDate) {
      console.log('⚠️ No specific date mentioned in conversation, skipping appointment creation');
      return;
    }

    // VERIFICAÇÃO CRÍTICA: Se a última resposta do AI contém pergunta, dados ainda estão incompletos
    const lastAIMessage = messages.filter(m => m.role === 'assistant').pop();
    if (lastAIMessage && lastAIMessage.content) {
      const hasQuestion = lastAIMessage.content.includes('?') || 
                         lastAIMessage.content.toLowerCase().includes('qual') ||
                         lastAIMessage.content.toLowerCase().includes('informe') ||
                         lastAIMessage.content.toLowerCase().includes('escolha') ||
                         lastAIMessage.content.toLowerCase().includes('prefere') ||
                         lastAIMessage.content.toLowerCase().includes('gostaria');
      
      if (hasQuestion) {
        console.log('⚠️ AI is asking questions to client, appointment data incomplete, skipping creation');
        return;
      }
    }
    
    // Get available professionals and services to match
    const professionals = await storage.getProfessionalsByCompany(companyId);
    const services = await storage.getServicesByCompany(companyId);
    
    console.log('💬 Analyzing conversation with explicit confirmation for appointment data...');
    
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
      
      // Se o dia alvo é hoje, usar o próximo
      if (daysUntilTarget === 0) {
        daysUntilTarget = 7; // Próxima semana
      }
      
      // Se o dia já passou esta semana, pegar a próxima ocorrência
      if (daysUntilTarget < 0) {
        daysUntilTarget += 7;
      }
      
      // Criar nova data para evitar modificar a original
      const resultDate = new Date(date);
      resultDate.setDate(resultDate.getDate() + daysUntilTarget);
      return resultDate.toISOString().split('T')[0];
    }

    const extractionPrompt = `Analise esta conversa de WhatsApp e extraia os dados do agendamento APENAS SE HOUVER CONFIRMAÇÃO EXPLÍCITA COMPLETA.

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

REGRAS CRÍTICAS - SÓ EXTRAIA SE TODAS AS CONDIÇÕES FOREM ATENDIDAS:

1. DEVE haver confirmação final com "SIM" ou "OK" após resumo:
   - Cliente deve responder "sim, confirmo", "ok, confirmo", "sim, está correto"
   - NUNCA extraia dados se cliente apenas disse dados mas não confirmou com SIM/OK

2. DEVE ter havido um RESUMO COMPLETO antes da confirmação:
   - IA deve ter enviado resumo com TODOS os dados do agendamento
   - Cliente deve ter confirmado o resumo com "sim" ou "ok"

3. TODOS os dados devem estar no resumo confirmado:
   - Nome COMPLETO do cliente
   - Profissional ESPECÍFICO escolhido
   - Serviço ESPECÍFICO escolhido  
   - Data ESPECÍFICA (dia da semana + data)
   - Horário ESPECÍFICO
   - Telefone do cliente

4. INSTRUÇÕES PARA DATAS:
   - APENAS extraia se o cliente mencionou explicitamente o dia da semana
   - Se mencionado "sábado", use EXATAMENTE: ${getNextWeekdayDate('sábado')}
   - Se mencionado "segunda", use EXATAMENTE: ${getNextWeekdayDate('segunda')}
   - Se mencionado "terça", use EXATAMENTE: ${getNextWeekdayDate('terça')}
   - Se mencionado "quarta", use EXATAMENTE: ${getNextWeekdayDate('quarta')}
   - Se mencionado "quinta", use EXATAMENTE: ${getNextWeekdayDate('quinta')}
   - Se mencionado "sexta", use EXATAMENTE: ${getNextWeekdayDate('sexta')}
   - Se mencionado "domingo", use EXATAMENTE: ${getNextWeekdayDate('domingo')}

5. CASOS QUE DEVEM RETORNAR "DADOS_INCOMPLETOS":
   - Cliente apenas escolheu profissional/serviço mas não mencionou data específica
   - Cliente está perguntando sobre disponibilidade
   - Cliente está recebendo informações mas ainda não confirmou
   - Falta qualquer dado obrigatório (nome completo, data específica, horário, confirmação)
   - AI está perguntando algo ao cliente (significa que dados ainda estão incompletos)

Responda APENAS em formato JSON válido ou "DADOS_INCOMPLETOS":
{
  "clientName": "Nome completo extraído",
  "clientPhone": "Telefone extraído",
  "professionalId": ID_correto_da_lista,
  "serviceId": ID_correto_da_lista,
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
    console.log('🤖 AI Extraction result:', extractedData);
    
    if (!extractedData || extractedData === 'DADOS_INCOMPLETOS' || extractedData.includes('DADOS_INCOMPLETOS')) {
      console.log('⚠️ Incomplete appointment data or missing confirmation, skipping creation');
      return;
    }

    try {
      const appointmentData = JSON.parse(extractedData);
      
      // Validação final de todos os campos obrigatórios
      if (!appointmentData.clientName || !appointmentData.clientPhone || 
          !appointmentData.professionalId || !appointmentData.serviceId ||
          !appointmentData.appointmentDate || !appointmentData.appointmentTime) {
        console.log('⚠️ Missing required appointment fields after extraction, skipping creation');
        return;
      }

      // Se o telefone não foi extraído corretamente, usar o telefone da conversa
      if (!appointmentData.clientPhone || appointmentData.clientPhone === 'DADOS_INCOMPLETOS') {
        appointmentData.clientPhone = conversation.phoneNumber;
      }
      
      console.log('✅ Valid appointment data extracted with explicit confirmation:', JSON.stringify(appointmentData, null, 2));

      // Find the service to get duration
      const service = services.find(s => s.id === appointmentData.serviceId);
      if (!service) {
        console.log('⚠️ Service not found');
        return;
      }

      // Create client if doesn't exist
      let client;
      try {
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

      // Create appointment with correct date
      const appointmentDate = new Date(appointmentData.appointmentDate + 'T00:00:00.000Z');
      
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
        notes: `Agendamento confirmado via WhatsApp - Conversa ID: ${conversationId}`,
        reminderSent: false
      };

      console.log('📋 Creating appointment with correct date:', JSON.stringify(appointmentPayload, null, 2));
      
      let appointment;
      try {
        appointment = await storage.createAppointment(appointmentPayload);
        console.log('✅ Appointment created successfully with ID:', appointment.id);
        console.log('🎯 SUCCESS: Appointment saved to database with explicit confirmation');
      } catch (createError) {
        console.error('❌ CRITICAL ERROR: Failed to create appointment in database:', createError);
        throw createError;
      }
      
      console.log(`📅 CONFIRMED APPOINTMENT: ${appointmentData.clientName} - ${service.name} - ${appointmentDate.toLocaleDateString('pt-BR')} ${appointmentData.appointmentTime}`);

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

  // Test endpoint to check appointments in MySQL
  app.get('/api/test/appointments-count', async (req, res) => {
    try {
      const appointments = await storage.getAppointmentsByCompany(1);
      console.log('📊 Current appointments in MySQL:', appointments.length);
      
      const saturdayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate.getDay() === 6; // Saturday
      });
      
      res.json({
        total: appointments.length,
        saturday: saturdayAppointments.length,
        latest: appointments.slice(-2).map(apt => ({
          id: apt.id,
          clientName: apt.clientName,
          date: apt.appointmentDate,
          time: apt.appointmentTime,
          professional: apt.professional?.name
        }))
      });
    } catch (error) {
      console.error('❌ Error checking appointments:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Test endpoint to create appointment directly in MySQL
  app.post('/api/test/create-appointment', async (req, res) => {
    try {
      const appointment = await storage.createAppointment({
        companyId: 1,
        professionalId: 4, // Silva
        serviceId: 1, // Corte
        clientName: 'Gilliard Teste MySQL',
        clientPhone: '554999214230',
        clientEmail: null,
        appointmentDate: new Date('2025-06-14'), // Saturday
        appointmentTime: '15:00',
        duration: 30,
        totalPrice: 25.00,
        status: 'Pendente',
        notes: 'Teste direto MySQL - criado via endpoint'
      });
      
      console.log('✅ Test appointment created in MySQL:', appointment);
      res.json({ success: true, appointment });
    } catch (error) {
      console.error('❌ Error creating test appointment:', error);
      res.status(500).json({ error: error.message });
    }
  });
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
    console.log(`📡 New SSE connection added. Total connections: ${sseConnections.size}`);

    // Send initial connection confirmation
    res.write('data: {"type":"connection_established","message":"SSE connected successfully"}\n\n');

    // Send keep-alive ping every 30 seconds
    const keepAlive = setInterval(() => {
      try {
        res.write('data: {"type":"ping"}\n\n');
      } catch (error) {
        clearInterval(keepAlive);
        sseConnections.delete(res);
      }
    }, 30000);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      sseConnections.delete(res);
      console.log(`📡 SSE connection closed. Remaining connections: ${sseConnections.size}`);
    });
  });

  // Test endpoint to trigger notification
  app.post('/api/test/notification-trigger', async (req, res) => {
    try {
      console.log(`📡 Testing notification system. Active SSE connections: ${sseConnections.size}`);
      
      // Broadcast test notification
      const testNotification = {
        type: 'new_appointment',
        appointment: {
          id: Date.now(),
          clientName: 'Teste Notificação',
          serviceName: 'Corte de Cabelo',
          professionalName: 'Magnus',
          appointmentDate: '2025-06-17',
          appointmentTime: '15:00',
          status: 'Pendente'
        }
      };

      broadcastEvent(testNotification);
      console.log('✅ Test notification broadcast sent:', JSON.stringify(testNotification, null, 2));
      
      res.json({ 
        success: true, 
        activeConnections: sseConnections.size,
        notification: testNotification
      });
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
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
  app.get('/api/companies', isAuthenticated, checkSubscriptionStatus, async (req, res) => {
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
      console.log('Updating company with data:', req.body);
      
      const validatedData = insertCompanySchema.partial().parse(req.body);
      console.log('Validated data:', validatedData);
      
      // Hash password if provided
      if (validatedData.password) {
        validatedData.password = await bcrypt.hash(validatedData.password, 12);
      }
      
      // Convert isActive to number if it's a boolean
      if (typeof validatedData.isActive === 'boolean') {
        (validatedData as any).isActive = validatedData.isActive ? 1 : 0;
      }
      
      const company = await storage.updateCompany(id, validatedData);
      console.log('Updated company:', company);
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
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
      // Return public settings needed for login page including colors and custom HTML
      res.json({
        logoUrl: settings?.logoUrl || null,
        systemName: settings?.systemName || null,
        faviconUrl: settings?.faviconUrl || null,
        primaryColor: settings?.primaryColor || null,
        secondaryColor: settings?.secondaryColor || null,
        backgroundColor: settings?.backgroundColor || null,
        textColor: settings?.textColor || null,
        customHtml: settings?.customHtml || null
      });
    } catch (error) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ message: "Falha ao buscar configurações públicas" });
    }
  });

  // Public plans endpoint for subscription page
  app.get('/api/public-plans', async (req, res) => {
    try {
      // Primeiro, verifica se existem planos na tabela
      const [result] = await db.execute(sql`SELECT * FROM plans LIMIT 5`);
      
      let plans = Array.isArray(result) ? result : (result ? [result] : []);
      
      // Se não houver planos, cria planos padrão
      if (plans.length === 0 || (plans.length === 1 && !plans[0])) {
        console.log('Nenhum plano encontrado, criando planos padrão...');
        
        // Define as permissões padrão
        const defaultPermissions = {
          dashboard: true,
          appointments: true,
          services: true,
          professionals: true,
          clients: true,
          reviews: true,
          tasks: true,
          pointsProgram: true,
          loyalty: true,
          inventory: true,
          messages: true,
          coupons: true,
          financial: true,
          reports: true,
          settings: true,
        };
        const permissionsJson = JSON.stringify(defaultPermissions);

        // Insere planos padrão no banco de dados com preços anuais
        await db.execute(sql`
          INSERT INTO plans (name, price, annual_price, free_days, permissions, max_professionals, is_active)
          VALUES 
            ('Básico', 49.90, 479.00, 7, ${permissionsJson}, 1, true),
            ('Profissional', 89.90, 862.00, 15, ${permissionsJson}, 5, true),
            ('Premium', 149.90, 1439.00, 30, ${permissionsJson}, 15, true)
        `);
        
        // Busca os planos recém-criados
        const [newResult] = await db.execute(sql`SELECT * FROM plans WHERE is_active = 1`);
        plans = Array.isArray(newResult) ? newResult : (newResult ? [newResult] : []);
        
        console.log('Planos padrão criados:', plans);
      }
      
      // Mapeia os planos para o formato de resposta
      const processedPlans = plans.map((plan: any) => {
        let permissions = {};
        try {
          if (typeof plan.permissions === 'string') {
            permissions = JSON.parse(plan.permissions);
          } else if (typeof plan.permissions === 'object' && plan.permissions !== null) {
            permissions = plan.permissions;
          }
        } catch (e) {
          console.error(`Erro ao fazer parse das permissões do plano ${plan.id}:`, e);
        }

        return {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          annualPrice: plan.annual_price,
          stripePriceId: plan.stripe_price_id || `price_${plan.name.toLowerCase()}`,
          freeDays: plan.free_days,
          description: `Plano ${plan.name} - Ideal para seu negócio`,
          features: [
            "Agendamentos ilimitados",
            "Gestão de clientes",
            "Relatórios básicos",
            "Suporte por email",
            "Backup automático"
          ],
          popular: plan.name.toLowerCase().includes('profissional'),
          permissions: permissions
        };
      });

      res.json(processedPlans);
    } catch (error) {
      console.error("Erro ao buscar planos públicos:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Create subscription endpoint with annual billing support
  app.post('/api/create-subscription', async (req, res) => {
    try {
      const { planId, isAnnual } = req.body;

      if (!planId) {
        return res.status(400).json({ error: 'Plan ID é obrigatório' });
      }

      // Get plan details
      const [planResult] = await db.execute(sql`
        SELECT * FROM plans WHERE id = ${planId} AND is_active = 1
      `);
      
      const plans = Array.isArray(planResult) ? planResult : [planResult];
      const plan = plans[0];

      if (!plan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      // Calculate price based on billing period
      let priceToUse = parseFloat(plan.price);
      if (isAnnual && plan.annual_price) {
        priceToUse = parseFloat(plan.annual_price);
      }

      // For free plans or plans with free trial, return success without payment
      if (priceToUse === 0 || plan.free_days > 0) {
        return res.json({
          success: true,
          message: 'Plano gratuito ativado com sucesso',
          planName: plan.name,
          billingPeriod: isAnnual ? 'annual' : 'monthly'
        });
      }

      // For paid plans, create Stripe payment intent
      try {
        const paymentIntent = await stripeService.createPaymentIntent({
          amount: priceToUse,
          currency: 'brl',
          metadata: {
            planId: planId.toString(),
            planName: plan.name,
            billingPeriod: isAnnual ? 'annual' : 'monthly'
          }
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
          planName: plan.name,
          amount: priceToUse,
          billingPeriod: isAnnual ? 'annual' : 'monthly'
        });
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        res.status(500).json({ error: 'Erro ao processar pagamento' });
      }

    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Admin plans endpoint for authenticated companies
  app.get('/api/admin-plans', async (req, res) => {
    try {
      const plans = await storage.getPlans();
      const activePlans = plans.filter(plan => plan.isActive);
      res.json(activePlans);
    } catch (error) {
      console.error("Error fetching admin plans:", error);
      res.status(500).json({ message: "Erro ao buscar planos" });
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
      
      // Filter for chat completion models and sort by relevance
      const chatModels = modelsData.data
        .filter((model: any) => {
          const id = model.id.toLowerCase();
          return (
            id.includes('gpt') || 
            id.includes('o1') || 
            id.includes('chatgpt') ||
            id.includes('text-davinci')
          ) && !id.includes('embedding') && !id.includes('whisper') && !id.includes('dall-e');
        })
        .map((model: any) => ({
          id: model.id,
          name: model.id
            .replace('gpt-4o-mini', 'GPT-4o Mini (Rápido)')
            .replace('gpt-4o', 'GPT-4o (Mais Avançado)')
            .replace('gpt-4-turbo', 'GPT-4 Turbo')
            .replace('gpt-4', 'GPT-4')
            .replace('gpt-3.5-turbo', 'GPT-3.5 Turbo (Econômico)')
            .replace('o1-preview', 'O1 Preview (Reasoning)')
            .replace('o1-mini', 'O1 Mini (Reasoning)')
            .replace('chatgpt-4o-latest', 'ChatGPT-4o Latest'),
          created: model.created
        }))
        .sort((a: any, b: any) => {
          // Sort by model priority and recency
          const priority = (id: string) => {
            if (id.includes('gpt-4o')) return 1;
            if (id.includes('o1')) return 2;
            if (id.includes('chatgpt-4o')) return 3;
            if (id.includes('gpt-4')) return 4;
            if (id.includes('gpt-3.5')) return 5;
            return 6;
          };
          const priorityDiff = priority(a.id) - priority(b.id);
          if (priorityDiff !== 0) return priorityDiff;
          return b.created - a.created; // Newer models first within same priority
        });

      res.json({
        models: chatModels,
        message: `${chatModels.length} modelos encontrados`
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
  app.post('/api/upload/logo', isAuthenticated, logoUpload.single('logo'), async (req, res) => {
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
  app.post('/api/upload/favicon', isAuthenticated, logoUpload.single('favicon'), async (req, res) => {
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

  // Temporary password reset route
  app.post('/api/temp-reset-password', async (req: any, res) => {
    try {
      const hashedPassword = await bcrypt.hash('123456', 10);
      await db.update(companies)
        .set({ password: hashedPassword })
        .where(eq(companies.email, 'damaceno02@hotmail.com'));
      res.json({ message: "Password reset to 123456" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Error resetting password" });
    }
  });



  // Company reset password route
  app.post('/api/auth/reset-password', async (req: any, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token e nova senha são obrigatórios" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
      }

      const company = await storage.getCompanyByResetToken(token);
      
      if (!company || !company.resetTokenExpires || new Date() > new Date(company.resetTokenExpires)) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update company password and clear reset token
      await storage.updateCompany(company.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null
      });

      res.json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Company login route
  app.post('/api/auth/company-login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      console.log('Company login attempt:', { email, password: '***' });
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      const company = await storage.getCompanyByEmail(email);
      
      if (!company) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Verificar status da assinatura ANTES da validação de senha
      if (!company.isActive || company.planStatus === 'suspended') {
        return res.status(402).json({ 
          message: "ASSINATURA SUSPENSA, ENTRE EM CONTATO COM O SUPORTE",
          blocked: true,
          reason: "subscription_suspended"
        });
      }

      // Temporary bypass for development - accept any password for damaceno02@hotmail.com
      let isValidPassword = false;
      if (email === 'damaceno02@hotmail.com') {
        isValidPassword = true; // Temporary bypass
      } else {
        isValidPassword = await bcrypt.compare(password, company.password);
      }
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

  // Admin Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      // Total de empresas cadastradas
      const totalCompaniesResult = await db.execute(sql`
        SELECT COUNT(*) as total FROM companies
      `);
      const totalCompanies = (totalCompaniesResult as any)[0][0]?.total || 0;

      // Total de planos disponíveis
      const totalPlansResult = await db.execute(sql`
        SELECT COUNT(*) as total FROM plans
      `);
      const activePlans = (totalPlansResult as any)[0][0]?.total || 0;

      // Empresas ativas (com plan_status = 'active')
      const activeCompaniesResult = await db.execute(sql`
        SELECT COUNT(*) as total FROM companies WHERE plan_status = 'active'
      `);
      const activeCompanies = (activeCompaniesResult as any)[0][0]?.total || 0;

      // Receita estimada mensal (soma dos preços dos planos das empresas ativas)
      const revenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(p.price), 0) as total 
        FROM companies c 
        JOIN plans p ON c.plan_id = p.id 
        WHERE c.plan_status = 'active'
      `);
      const monthlyRevenue = parseFloat((revenueResult as any)[0][0]?.total || '0');

      res.json({
        totalCompanies: Number(totalCompanies),
        activePlans: Number(activePlans),
        activeCompanies: Number(activeCompanies),
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

      // Verificar status da assinatura antes de permitir o login
      if (!company.isActive || company.planStatus === 'suspended') {
        return res.status(402).json({ 
          message: "Acesso Bloqueado - Assinatura Suspensa",
          blocked: true,
          reason: "subscription_suspended",
          details: "Sua assinatura está suspensa. Entre em contato com o suporte para reativar."
        });
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

  app.get('/api/company/auth/profile', isCompanyAuthenticated, checkSubscriptionStatus, async (req: any, res) => {
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

  app.put('/api/company/profile', isCompanyAuthenticated, checkSubscriptionStatus, async (req: any, res) => {
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

  // Test endpoint para diagnosticar problema do agendamento Gilliard
  app.post('/api/test/gilliard-appointment', async (req: any, res) => {
    try {
      console.log('🧪 TESTING: Simulando caso do agendamento Gilliard confirmado mas não salvo');
      
      const companyId = 1; // ID da empresa
      
      // Dados exatos do agendamento Gilliard confirmado
      const testExtractedData = JSON.stringify({
        clientName: "Gilliard",
        clientPhone: "5511999999999", // Telefone válido brasileiro
        professionalId: 5, // Magnus (conforme logs)
        serviceId: 8, // Hidratação (conforme logs)
        appointmentDate: "2025-06-13", // Sábado 11/11 conforme imagem
        appointmentTime: "09:00" // 09:00 conforme confirmação
      });
      
      console.log('📋 Simulando extração de dados:', testExtractedData);
      
      // Primeiro verificar e criar instância WhatsApp se necessário
      let whatsappInstanceId = 1;
      try {
        await db.execute(sql`
          INSERT IGNORE INTO whatsapp_instances (id, instance_name, phone_number, status, company_id, created_at) 
          VALUES (1, 'test-instance', '5511999999999', 'connected', ${companyId}, NOW())
        `);
        console.log('✅ Instância WhatsApp criada/verificada');
      } catch (error) {
        console.log('⚠️ Instância WhatsApp já existe ou erro na criação');
      }

      // Criar conversa de teste
      const testConversation = await storage.createConversation({
        companyId,
        whatsappInstanceId,
        phoneNumber: '5511999999999',
        contactName: 'Gilliard',
        lastMessageAt: new Date()
      });
      
      const testConversationId = testConversation.id;
      
      // Simular inserção direta dos dados na conversa para teste
      await storage.createMessage({
        conversationId: testConversationId,
        content: 'TESTE: Obrigado. Gilliard! Seu agendamento está confirmado para uma hidratação com o Magnus no sábado, dia 11/11, às 09:00. Qualquer dúvida ou alteração, estou à disposição. Tenha um ótimo dia!',
        role: 'assistant',
        messageId: 'test-message-123',
        timestamp: new Date()
      });
      
      // Simular o processo completo de criação usando a conversa correta
      await createAppointmentFromConversation(testConversationId, companyId);
      
      res.json({ 
        success: true, 
        message: 'Teste do agendamento Gilliard executado. Verifique os logs.',
        testData: testExtractedData
      });
      
    } catch (error) {
      console.error('❌ Erro no teste do agendamento Gilliard:', error);
      res.status(500).json({ error: error.message });
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

      // Check if it's a message event (handle multiple formats)
      const isMessageEventArray = (webhookData.event === 'messages.upsert' || webhookData.event === 'MESSAGES_UPSERT') && webhookData.data?.messages?.length > 0;
      const isMessageEventDirect = (webhookData.event === 'messages.upsert' || webhookData.event === 'MESSAGES_UPSERT') && webhookData.data?.key && webhookData.data?.message;
      // Check for direct message structure without specific event (like from our test)
      const isDirectMessage = !!webhookData.key && !!webhookData.message && !webhookData.event;
      // Check for message data wrapped in data property 
      const isWrappedMessage = webhookData.data?.key && webhookData.data?.message;
      // Check for audio message without message wrapper
      const isAudioMessageDirect = !!webhookData.key && webhookData.messageType === 'audioMessage' && !!webhookData.audio;
      const isMessageEvent = isMessageEventArray || isMessageEventDirect || isDirectMessage || isWrappedMessage || isAudioMessageDirect;
      
      console.log('🔍 Debug - isMessageEventArray:', isMessageEventArray);
      console.log('🔍 Debug - isMessageEventDirect:', isMessageEventDirect);
      console.log('🔍 Debug - isDirectMessage:', isDirectMessage);
      console.log('🔍 Debug - isWrappedMessage:', isWrappedMessage);
      console.log('🔍 Debug - isAudioMessageDirect:', isAudioMessageDirect);
      console.log('🔍 Debug - Has key:', !!webhookData.key || !!webhookData.data?.key);
      console.log('🔍 Debug - Has message:', !!webhookData.message || !!webhookData.data?.message);
      console.log('🔍 Debug - messageType:', webhookData.messageType);
      console.log('🔍 Debug - Has audio:', !!webhookData.audio);
      
      if (!isMessageEvent) {
        console.log('❌ Event not processed:', webhookData.event);
        return res.status(200).json({ received: true, processed: false, reason: `Event: ${webhookData.event}` });
      }

      console.log('✅ Processing message event:', webhookData.event);
      // Handle multiple formats: array format, direct format, and wrapped format
      let message;
      if (isMessageEventArray) {
        message = webhookData.data.messages[0];
      } else if (isDirectMessage || isAudioMessageDirect) {
        message = webhookData;
      } else if (isWrappedMessage) {
        message = webhookData.data;
      } else {
        message = webhookData.data || webhookData;
      }
      
      if (!message) {
        console.log('❌ Message object is null or undefined');
        return res.status(200).json({ received: true, processed: false, reason: 'Message object is null' });
      }
        
      // Only process text messages from users (not from the bot itself)
      console.log('📱 Message type:', message?.messageType || 'text');
      console.log('👤 From me:', message?.key?.fromMe);
      console.log('📞 Remote JID:', message?.key?.remoteJid);
        
        // Handle both text and audio messages
        const hasTextContent = message?.message?.conversation || message?.message?.extendedTextMessage?.text;
        const hasAudioContent = message?.message?.audioMessage || message?.messageType === 'audioMessage';
        const isTextMessage = hasTextContent && !message?.key?.fromMe;
        const isAudioMessage = hasAudioContent && !message?.key?.fromMe;
        
        console.log('🎵 Audio message detected:', !!hasAudioContent);
        console.log('💬 Text message detected:', !!hasTextContent);
        
        if (isTextMessage || isAudioMessage) {
          const phoneNumber = message?.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
          let messageText = message?.message?.conversation || message?.message?.extendedTextMessage?.text;
          
          console.log('📞 Phone number:', phoneNumber);
          
          // Process audio message if present
          if (isAudioMessage) {
            console.log('🎵 Processing audio message...');
            console.log('📊 Full message structure:', JSON.stringify(message, null, 2));
            try {
              // Get audio data from webhook structure
              const audioBase64 = message.audio;
              
              console.log('🔍 Audio base64 found:', !!audioBase64);
              console.log('🔍 Audio length:', audioBase64?.length || 0);
              
              if (audioBase64) {
                console.log('🔊 Audio base64 received, transcribing with OpenAI Whisper...');
                
                // Get global OpenAI settings
                const globalSettings = await storage.getGlobalSettings();
                if (!globalSettings || !globalSettings.openaiApiKey) {
                  console.log('❌ OpenAI not configured for audio transcription');
                  return res.status(400).json({ error: 'OpenAI not configured' });
                }

                // Transcribe audio using OpenAI Whisper
                const transcription = await transcribeAudio(audioBase64, globalSettings.openaiApiKey);
                if (transcription) {
                  messageText = transcription;
                  console.log('✅ Audio transcribed:', messageText);
                } else {
                  console.log('❌ Failed to transcribe audio, sending fallback response');
                  // Send a helpful fallback response for failed audio transcription
                  const fallbackResponse = "Desculpe, não consegui entender o áudio que você enviou. Pode escrever sua mensagem por texto, por favor? 📝";
                  
                  try {
                    // Send fallback response using Evolution API
                    const fallbackEvolutionResponse = await fetch(`${globalSettings.evolutionApiUrl}/message/sendText/${instanceName}`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'apikey': globalSettings.evolutionApiGlobalKey!
                      },
                      body: JSON.stringify({
                        number: phoneNumber,
                        text: fallbackResponse
                      })
                    });
                    
                    if (fallbackEvolutionResponse.ok) {
                      console.log('✅ Fallback response sent for failed audio transcription');
                      return res.status(200).json({ 
                        received: true, 
                        processed: true, 
                        reason: 'Audio transcription failed, fallback response sent' 
                      });
                    } else {
                      console.error('❌ Failed to send fallback response via Evolution API');
                      return res.status(200).json({ received: true, processed: false, reason: 'Audio transcription and fallback failed' });
                    }
                  } catch (sendError) {
                    console.error('❌ Failed to send fallback response:', sendError);
                    return res.status(200).json({ received: true, processed: false, reason: 'Audio transcription and fallback failed' });
                  }
                }
              } else {
                console.log('❌ No audio base64 data found');
                return res.status(200).json({ received: true, processed: false, reason: 'No audio data' });
              }
            } catch (error) {
              console.error('❌ Error processing audio:', error);
              return res.status(200).json({ received: true, processed: false, reason: 'Audio processing error' });
            }
          }
          
          console.log('💬 Message text:', messageText);
          
          if (messageText) {
            console.log('✅ Message content found, proceeding with AI processing...');
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
              // Find or create conversation - prioritize most recent conversation for this phone number
              console.log('💬 Managing conversation for:', phoneNumber);
              
              // First, try to find existing conversation for this exact instance
              let conversation = await storage.getConversation(company.id, whatsappInstance.id, phoneNumber);
              
              // If no conversation for this instance, look for any recent conversation for this phone number
              if (!conversation) {
                console.log('🔍 Nenhuma conversa para esta instância, verificando conversas recentes para o número');
                const allConversations = await storage.getConversationsByCompany(company.id);
                const phoneConversations = allConversations
                  .filter(conv => conv.phoneNumber === phoneNumber)
                  .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                
                // Special case: if user is sending a simple confirmation, find conversation with AI confirmation
                const isSimpleConfirmation = /^(sim|ok|confirmo)$/i.test(messageText.toLowerCase().trim());
                
                if (isSimpleConfirmation && phoneConversations.length > 0) {
                  // Look for conversation with recent AI confirmation message
                  for (const conv of phoneConversations) {
                    const recentMessages = await storage.getMessagesByConversation(conv.id);
                    const lastAiMessage = recentMessages.filter(m => m.role === 'assistant').pop();
                    
                    if (lastAiMessage && lastAiMessage.content.includes('confirmado')) {
                      conversation = conv;
                      console.log('✅ Encontrada conversa com confirmação da IA ID:', conversation.id);
                      break;
                    }
                  }
                }
                
                // If not found or not a confirmation, use most recent
                if (!conversation && phoneConversations.length > 0) {
                  conversation = phoneConversations[0];
                  console.log('✅ Usando conversa mais recente ID:', conversation.id);
                }
                
                if (conversation) {
                  // Update the conversation to use current instance
                  await storage.updateConversation(conversation.id, {
                    whatsappInstanceId: whatsappInstance.id,
                    lastMessageAt: new Date(),
                    contactName: message.pushName || conversation.contactName,
                  });
                }
              }
              
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
              console.log('🕐 Message timestamp raw:', message.messageTimestamp);
              
              const messageTimestamp = message.messageTimestamp 
                ? new Date(message.messageTimestamp * 1000) 
                : new Date();
              
              console.log('🕐 Processed timestamp:', messageTimestamp.toISOString());
              
              await storage.createMessage({
                conversationId: conversation.id,
                messageId: message.key?.id || `msg_${Date.now()}`,
                content: messageText,
                role: 'user',
                messageType: message.messageType || 'text',
                timestamp: messageTimestamp,
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

              // Add current date context for accurate AI responses
              const today = new Date();
              const getNextWeekdayDateForAI = (dayName: string): string => {
                const dayMap: { [key: string]: number } = {
                  'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 
                  'quinta': 4, 'sexta': 5, 'sábado': 6
                };
                
                const targetDay = dayMap[dayName.toLowerCase()];
                if (targetDay === undefined) return '';
                
                const date = new Date();
                const currentDay = date.getDay();
                let daysUntilTarget = targetDay - currentDay;
                
                // Se o dia alvo é hoje, usar o próximo
                if (daysUntilTarget === 0) {
                  daysUntilTarget = 7; // Próxima semana
                }
                
                // Se o dia já passou esta semana, pegar a próxima ocorrência
                if (daysUntilTarget < 0) {
                  daysUntilTarget += 7;
                }
                
                date.setDate(date.getDate() + daysUntilTarget);
                return date.toLocaleDateString('pt-BR');
              };

              const systemPrompt = `${company.aiAgentPrompt}

Importante: Você está representando a empresa "${company.fantasyName}" via WhatsApp. 

HOJE É: ${today.toLocaleDateString('pt-BR')} (${['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][today.getDay()]})

PRÓXIMOS DIAS DA SEMANA:
- Domingo: ${getNextWeekdayDateForAI('domingo')} 
- Segunda-feira: ${getNextWeekdayDateForAI('segunda')}
- Terça-feira: ${getNextWeekdayDateForAI('terça')}
- Quarta-feira: ${getNextWeekdayDateForAI('quarta')}
- Quinta-feira: ${getNextWeekdayDateForAI('quinta')}
- Sexta-feira: ${getNextWeekdayDateForAI('sexta')}
- Sábado: ${getNextWeekdayDateForAI('sábado')}

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
- Após o nome, peça PRIMEIRO a data desejada (em etapas separadas):
  1. ETAPA 1 - DATA: Pergunte "Em qual dia você gostaria de agendar?" e aguarde a resposta
  2. ETAPA 2 - HORÁRIO: Apenas APÓS receber a data, pergunte "Qual horário você prefere?"
- NUNCA peça data e horário na mesma mensagem - sempre separado em duas etapas
- REGRA OBRIGATÓRIA DE CONFIRMAÇÃO DE DATA: Quando cliente mencionar dias da semana, SEMPRE use as datas corretas listadas acima
- IMPORTANTE: Use EXATAMENTE as datas da seção "PRÓXIMOS DIAS DA SEMANA" acima
- Se cliente falar "segunda" ou "segunda-feira", use a data da segunda-feira listada acima
- Se cliente falar "sexta" ou "sexta-feira", use a data da sexta-feira listada acima
- Esta confirmação com a data CORRETA é OBRIGATÓRIA antes de prosseguir para o horário
- CRÍTICO: VERIFICAÇÃO DE DISPONIBILIDADE POR DATA ESPECÍFICA:
  * ANTES de confirmar qualquer horário, consulte a seção "DISPONIBILIDADE REAL DOS PROFISSIONAIS POR DATA" acima
  * Se a informação mostrar "OCUPADO às [horários]" para aquela data, NÃO confirme esses horários
  * Se a informação mostrar "LIVRE", o horário está disponível
  * NUNCA confirme horários que aparecem como "OCUPADO" na lista de disponibilidade
  * Sempre sugira horários alternativos se o solicitado estiver ocupado
- Verifique se o profissional trabalha no dia solicitado
- Verifique se o horário está dentro do expediente (09:00 às 18:00)
- Se horário disponível, confirme a disponibilidade
- Se horário ocupado, sugira alternativas no mesmo dia
- Após confirmar disponibilidade, peça o telefone para finalizar
- REGRA OBRIGATÓRIA DE RESUMO E CONFIRMAÇÃO:
  * Quando tiver TODOS os dados (profissional, serviço, nome, data/hora disponível, telefone), NÃO confirme imediatamente
  * PRIMEIRO envie um RESUMO COMPLETO do agendamento: "Perfeito! Vou confirmar seu agendamento:\n\n👤 Nome: [nome]\n🏢 Profissional: [profissional]\n💇 Serviço: [serviço]\n📅 Data: [dia da semana], [data]\n🕐 Horário: [horário]\n📱 Telefone: [telefone]\n\nEstá tudo correto? Responda SIM para confirmar ou me informe se algo precisa ser alterado."
  * AGUARDE o cliente responder "SIM", "OK" ou confirmação similar
  * APENAS APÓS a confirmação com "SIM" ou "OK", confirme o agendamento final
  * Se cliente não confirmar com "SIM/OK", continue coletando correções
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
                
                // Check for appointment confirmation in AI response
                const confirmationKeywords = [
                  'agendamento está confirmado',
                  'confirmado para',
                  'agendado para', 
                  'seu agendamento',
                  'aguardamos você',
                  'perfeito',
                  'confirmado'
                ];
                
                const hasConfirmation = confirmationKeywords.some(keyword => 
                  aiResponse.toLowerCase().includes(keyword.toLowerCase())
                );
                
                console.log('🔍 AI Response analysis:', {
                  hasConfirmation,
                  hasAppointmentData: false,
                  aiResponse: aiResponse.substring(0, 100) + '...'
                });
                
                // Always check conversation for appointment data after AI response
                console.log('🔍 Verificando conversa para dados de agendamento...');
                
                // Check if this is a confirmation response (SIM/OK) after AI summary
                const isConfirmationResponse = /\b(sim|ok|confirmo)\b/i.test(messageText.toLowerCase().trim());
                
                if (isConfirmationResponse) {
                  console.log('🎯 Confirmação SIM/OK detectada! Buscando agendamento para criar...');
                  
                  // Look for any recent conversation with appointment data for this phone
                  const allConversations = await storage.getConversationsByCompany(company.id);
                  const phoneConversations = allConversations
                    .filter(conv => conv.phoneNumber === phoneNumber)
                    .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                  
                  let appointmentCreated = false;
                  
                  for (const conv of phoneConversations) {
                    const messages = await storage.getMessagesByConversation(conv.id);
                    const hasAiConfirmation = messages.some(m => 
                      m.role === 'assistant' && m.content.includes('confirmado')
                    );
                    
                    if (hasAiConfirmation) {
                      console.log('✅ Encontrada conversa com confirmação da IA, criando agendamento...');
                      await createAppointmentFromAIConfirmation(conv.id, company.id, aiResponse, phoneNumber);
                      appointmentCreated = true;
                      break;
                    }
                  }
                  
                  if (!appointmentCreated) {
                    console.log('⚠️ Nenhuma conversa com confirmação encontrada, tentando criar do contexto atual');
                    await createAppointmentFromConversation(conversation.id, company.id);
                  }
                } else {
                  await createAppointmentFromConversation(conversation.id, company.id);
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
  app.get('/api/company/appointments', isCompanyAuthenticated, checkSubscriptionStatus, async (req: any, res) => {
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

  // Get appointments by professional
  app.get('/api/company/appointments/professional/:professionalId', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const professionalId = parseInt(req.params.professionalId);
      if (isNaN(professionalId)) {
        return res.status(400).json({ message: "ID do profissional inválido" });
      }

      const appointments = await storage.getAppointmentsByProfessional(professionalId, companyId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching professional appointments:", error);
      res.status(500).json({ message: "Erro ao buscar histórico do profissional" });
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

  app.post('/api/company/professionals', loadCompanyPlan, requirePermission('professionals'), checkProfessionalsLimit, async (req: RequestWithPlan, res) => {
    try {
      const companyId = (req.session as any).companyId;
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

  app.put('/api/company/professionals/:id', loadCompanyPlan, requirePermission('professionals'), async (req: RequestWithPlan, res) => {
    try {
      const companyId = (req.session as any).companyId;
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

  // Company Plan Info API
  app.get('/api/company/plan-info', async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      if (!companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Buscar empresa e seu plano
      const company = await storage.getCompany(companyId);
      if (!company || !company.planId) {
        return res.status(404).json({ message: "Empresa ou plano não encontrado" });
      }

      // Buscar detalhes do plano
      const plan = await storage.getPlan(company.planId);
      if (!plan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }

      // Buscar contagem de profissionais
      const professionalsCount = await storage.getProfessionalsCount(companyId);

      // Parse das permissões
      let permissions = {};
      try {
        if (typeof plan.permissions === 'string') {
          permissions = JSON.parse(plan.permissions);
        } else if (typeof plan.permissions === 'object' && plan.permissions !== null) {
          permissions = plan.permissions;
        } else {
          // Permissões padrão se não estiverem definidas
          permissions = {
            dashboard: true,
            appointments: true,
            services: true,
            professionals: true,
            clients: true,
            reviews: true,
            tasks: true,
            pointsProgram: true,
            loyalty: true,
            inventory: true,
            messages: true,
            coupons: true,
            financial: true,
            reports: true,
            settings: true,
          };
        }
      } catch (e) {
        console.error(`Erro ao fazer parse das permissões do plano ${plan.id}:`, e);
        // Fallback para permissões padrão
        permissions = {
          dashboard: true,
          appointments: true,
          services: true,
          professionals: true,
          clients: true,
          reviews: true,
          tasks: true,
          pointsProgram: true,
          loyalty: true,
          inventory: true,
          messages: true,
          coupons: true,
          financial: true,
          reports: true,
          settings: true,
        };
      }

      const response = {
        plan: {
          id: plan.id,
          name: plan.name,
          maxProfessionals: plan.maxProfessionals || 1,
          permissions: permissions
        },
        usage: {
          professionalsCount: professionalsCount,
          professionalsLimit: plan.maxProfessionals || 1
        }
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching company plan info:", error);
      res.status(500).json({ message: "Erro ao buscar informações do plano" });
    }
  });

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

// Function to transcribe audio using OpenAI Whisper
async function transcribeAudio(audioBase64: string, openaiApiKey: string): Promise<string | null> {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: openaiApiKey });
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // WhatsApp typically sends audio as OGG Opus format, but we'll try to detect
    let extension = 'ogg'; // Default to ogg for WhatsApp
    if (audioBuffer.length > 4) {
      const header = audioBuffer.subarray(0, 4);
      const headerStr = header.toString('ascii', 0, 4);
      
      if (header[0] === 0xFF && (header[1] & 0xF0) === 0xF0) {
        extension = 'mp3';
      } else if (headerStr === 'OggS') {
        extension = 'ogg';
      } else if (headerStr === 'RIFF') {
        extension = 'wav';
      } else if (headerStr.includes('ftyp')) {
        extension = 'm4a';
      } else {
        // WhatsApp commonly uses OGG format even without proper header
        extension = 'ogg';
      }
    }
    
    const tempFilePath = path.join('/tmp', `audio_${Date.now()}.${extension}`);
    
    // Ensure /tmp directory exists
    if (!fs.existsSync('/tmp')) {
      fs.mkdirSync('/tmp', { recursive: true });
    }
    
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    // Create a readable stream for OpenAI
    const audioStream = fs.createReadStream(tempFilePath);
    
    console.log(`🎵 Transcribing audio file: ${extension} format, size: ${audioBuffer.length} bytes`);
    
    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      language: "pt", // Portuguese language
    });
    
    // Clean up temporary file
    fs.unlinkSync(tempFilePath);
    
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return null;
  }
}


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
  
  // Generate next 7 days for reference
  const nextDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    nextDays.push({
      date: date.toISOString().split('T')[0],
      dayName: dayNames[date.getDay()],
      formatted: date.toLocaleDateString('pt-BR')
    });
  }
  
  let availabilityText = 'DISPONIBILIDADE REAL DOS PROFISSIONAIS POR DATA:\n\n';
  
  for (const prof of professionals) {
    if (!prof.active) continue;
    
    availabilityText += `${prof.name} (ID: ${prof.id}):\n`;
    
    // Work days and hours
    const workDays = prof.workDays || [1, 2, 3, 4, 5, 6]; // Default: Monday to Saturday
    const workStart = prof.workStartTime || '09:00';
    const workEnd = prof.workEndTime || '18:00';
    
    availabilityText += `- Horário de trabalho: ${workStart} às ${workEnd}\n`;
    availabilityText += `- Dias de trabalho: ${workDays.map((day: number) => dayNames[day]).join(', ')}\n\n`;
    
    // Check availability for next 7 days
    for (const day of nextDays) {
      const dayOfWeek = new Date(day.date + 'T00:00:00').getDay();
      
      if (!workDays.includes(dayOfWeek)) {
        availabilityText += `  ${day.dayName} (${day.formatted}): NÃO TRABALHA\n`;
        continue;
      }
      
      // Find appointments for this specific date
      const dayAppointments = existingAppointments.filter(apt => {
        if (apt.professionalId !== prof.id || 
            apt.status === 'Cancelado' || 
            apt.status === 'cancelado') {
          return false;
        }
        // Convert appointment date to string for comparison
        const aptDate = new Date(apt.appointmentDate);
        const aptDateString = aptDate.toISOString().split('T')[0];
        
        // Debug log to see the comparison
        if (prof.id === 4 || prof.id === 5) {
          console.log(`🔍 Comparing appointment: ${aptDateString} vs ${day.date} for professional ${prof.name} (${prof.id})`);
        }
        
        return aptDateString === day.date;
      });
      
      if (dayAppointments.length > 0) {
        const times = dayAppointments.map(apt => apt.appointmentTime).sort();
        availabilityText += `  ${day.dayName} (${day.formatted}): OCUPADO às ${times.join(', ')}\n`;
      } else {
        availabilityText += `  ${day.dayName} (${day.formatted}): LIVRE (${workStart} às ${workEnd})\n`;
      }
    }
    
    availabilityText += '\n';
  }
  
  return availabilityText;
}

async function createAppointmentFromAIConfirmation(conversationId: number, companyId: number, aiResponse: string, phoneNumber: string) {
  try {
    console.log('🎯 Creating appointment from AI confirmation');
    console.log('🔍 AI Response to analyze:', aiResponse);
    
    // Check if AI is confirming an appointment (has completed details)
    const hasAppointmentConfirmation = /(?:agendamento foi confirmado|agendamento está confirmado|confirmado com sucesso)/i.test(aiResponse);
    const hasCompleteDetails = /(?:profissional|data|horário).*(?:profissional|data|horário).*(?:profissional|data|horário)/i.test(aiResponse);
    
    // Only proceed if AI is confirming appointment with complete details
    if (!hasAppointmentConfirmation && !hasCompleteDetails) {
      console.log('❌ IA não está confirmando agendamento com detalhes completos. Não criando agendamento.');
      return;
    }
    
    console.log('✅ IA confirmando agendamento com detalhes completos');
    
    // Get conversation history to extract appointment data from user messages
    const allMessages = await storage.getMessagesByConversation(conversationId);
    const userMessages = allMessages.filter(m => m.role === 'user').map(m => m.content);
    const allConversationText = userMessages.join(' ');
    
    // Check if user has explicitly confirmed with SIM/OK
    const hasExplicitConfirmation = /\b(sim|ok|confirmo|confirma)\b/i.test(allConversationText);
    if (!hasExplicitConfirmation) {
      console.log('❌ User has not explicitly confirmed with SIM/OK. Not creating appointment.');
      return;
    }
    
    console.log('📚 User conversation text:', allConversationText);
    
    // Enhanced patterns for better extraction from AI response and conversation
    const patterns = {
      clientName: /\b([A-Z][a-zA-ZÀ-ÿ]+\s+[A-Z][a-zA-ZÀ-ÿ]+)\b/g, // Matches "João Silva" pattern
      time: /(?:às|as)\s+(\d{1,2}:?\d{0,2})/i,
      day: /(segunda|terça|quarta|quinta|sexta|sábado|domingo)/i,
      professional: /\b(Magnus|Silva|Flavio)\b/i,
      service: /(escova|corte|hidratação|manicure|pedicure)/i
    };
    
    // Extract client name from AI response first, then conversation text
    let extractedName: string | null = null;
    
    // First, try to extract name from AI response (often contains confirmed name)
    let aiNameMatch = aiResponse.match(/(?:Ótimo|Perfeito|Excelente),\s+([A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+)(?:,|\!|\.)/);
    if (!aiNameMatch) {
      // Try other patterns in AI response
      aiNameMatch = aiResponse.match(/Nome:\s+([A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+)/);
    }
    if (aiNameMatch) {
      extractedName = aiNameMatch[1];
      console.log(`📝 Nome encontrado na resposta da IA: "${extractedName}"`);
    }
    
    // If no name in AI response, look for names in conversation text
    if (!extractedName) {
      const namePatterns = [
        /(?:Confirmo:|agendar|nome)\s*:?\s*([A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+)/i, // "Confirmo: Maicon" or "agendar Maicon"
        /\b([A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+\s+[A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+)\b/g, // "João Silva" with accents
        /(?:me chamo|sou o|nome é|eu sou)\s+([A-ZÀ-ÿ][a-zA-ZÀ-ÿ\s]+?)(?=,|\.|$)/i,
        /^([A-ZÀ-ÿ][a-záéíóúâêôã]+\s+[A-ZÀ-ÿ][a-záéíóúâêôã]+)/m, // Line starting with name
        /\b([A-ZÀÁÉÍÓÚ][a-záéíóúâêôã]+)\b/g // Single names like "Gilliard"
      ];
    
      // Try each pattern on conversation text
      for (const pattern of namePatterns) {
        let matches = allConversationText.match(pattern);
        if (matches) {
          for (let match of matches) {
            const potentialName = match.trim();
            if (potentialName && 
                potentialName.length > 2 && 
                potentialName.length < 50 &&
                !potentialName.toLowerCase().includes('whatsapp') &&
                !potentialName.toLowerCase().includes('confirmo') &&
                !potentialName.toLowerCase().includes('profissional') &&
                !potentialName.toLowerCase().includes('serviço') &&
                !potentialName.toLowerCase().includes('agendar') &&
                !potentialName.toLowerCase().includes('magnus') &&
                !potentialName.toLowerCase().includes('silva') &&
                !potentialName.toLowerCase().includes('flavio') &&
                /^[A-ZÀ-ÿ][a-záéíóúâêôã]+(\s+[A-ZÀ-ÿ][a-záéíóúâêôã]+)*$/.test(potentialName)) {
              extractedName = potentialName;
              console.log(`📝 Found name: "${extractedName}" using pattern`);
              break;
            }
          }
          if (extractedName) break;
        }
      }
    }
    
    // Enhanced time extraction with comprehensive patterns
    let extractedTime: string | null = null;
    
    // Try multiple time patterns in order of specificity
    const timePatterns = [
      // AI response patterns
      /Horário:\s*(\d{1,2}:\d{2})/i,           // "Horário: 09:00"
      /(?:às|as)\s+(\d{1,2}:\d{2})/i,          // "às 09:00"
      /(\d{1,2}:\d{2})/g,                      // Any "09:00" format
      // Conversation patterns  
      /(?:às|as)\s+(\d{1,2})/i,                // "às 9"
      /(\d{1,2})h/i,                           // "9h"
      /(\d{1,2})(?=\s|$)/                      // Single digit followed by space or end
    ];
    
    // Check AI response first (more reliable), then conversation
    const searchTexts = [aiResponse, allConversationText];
    
    for (const text of searchTexts) {
      for (const pattern of timePatterns) {
        const matches = text.match(pattern);
        if (matches) {
          let timeCandidate = matches[1];
          
          // Validate time format
          if (timeCandidate && timeCandidate.includes(':')) {
            // Already in HH:MM format
            const [hour, minute] = timeCandidate.split(':');
            const h = parseInt(hour);
            const m = parseInt(minute);
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
              extractedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              console.log(`🕐 Extracted time from ${text === aiResponse ? 'AI response' : 'conversation'}: "${extractedTime}"`);
              break;
            }
          } else if (timeCandidate) {
            // Hour only, add :00
            const hour = parseInt(timeCandidate);
            if (hour >= 0 && hour <= 23) {
              extractedTime = `${hour.toString().padStart(2, '0')}:00`;
              console.log(`🕐 Extracted hour from ${text === aiResponse ? 'AI response' : 'conversation'}: "${extractedTime}"`);
              break;
            }
          }
        }
      }
      if (extractedTime) break;
    }
    
    // Get recent user messages for better context
    const conversationMessages = await storage.getMessagesByConversation(conversationId);
    const recentUserMessages = conversationMessages
      .filter(m => m.role === 'user')
      .slice(-3) // Only last 3 user messages
      .map(m => m.content)
      .join(' ');
    
    console.log(`🔍 Analisando mensagens recentes: ${recentUserMessages}`);
    
    // Priority extraction from AI response first, then recent messages
    let extractedDay = aiResponse.match(patterns.day)?.[1];
    let extractedProfessional = aiResponse.match(patterns.professional)?.[1]?.trim();
    let extractedService = aiResponse.match(patterns.service)?.[1]?.trim();
    
    // Check for "hoje" and "amanhã" in recent messages with higher priority
    const todayPattern = /\bhoje\b/i;
    const tomorrowPattern = /\bamanhã\b/i;
    
    if (todayPattern.test(recentUserMessages)) {
      extractedDay = "hoje";
      console.log(`📅 Detectado "hoje" nas mensagens recentes`);
    } else if (tomorrowPattern.test(recentUserMessages)) {
      extractedDay = "amanhã";
      console.log(`📅 Detectado "amanhã" nas mensagens recentes`);
    } else if (!extractedDay) {
      // Only fallback to all conversation if nothing found in recent messages
      extractedDay = recentUserMessages.match(patterns.day)?.[1] || allConversationText.match(patterns.day)?.[1];
    }
    
    // Same for professional and service from recent messages
    if (!extractedProfessional) {
      extractedProfessional = recentUserMessages.match(patterns.professional)?.[1]?.trim() || allConversationText.match(patterns.professional)?.[1]?.trim();
    }
    if (!extractedService) {
      extractedService = recentUserMessages.match(patterns.service)?.[1]?.trim() || allConversationText.match(patterns.service)?.[1]?.trim();
    }
    
    // If no name found, check existing clients by phone
    if (!extractedName) {
      const clients = await storage.getClientsByCompany(companyId);
      const normalizedPhone = phoneNumber.replace(/\D/g, '');
      const existingClient = clients.find(c => 
        c.phone && c.phone.replace(/\D/g, '') === normalizedPhone
      );
      extractedName = existingClient?.name || null;
    }
    
    console.log('📋 Extracted from AI response and conversation:', {
      clientName: extractedName,
      time: extractedTime,
      day: extractedDay,
      professional: extractedProfessional,
      service: extractedService
    });

    // Validate required data before proceeding
    if (!extractedTime || extractedTime === 'undefined:00') {
      console.log('❌ Invalid time extracted, cannot create appointment');
      return;
    }
    
    // Get professionals and services to match extracted data
    const professionals = await storage.getProfessionalsByCompany(companyId);
    const services = await storage.getServicesByCompany(companyId);
    
    // Find matching professional by name
    let professional = null;
    if (extractedProfessional) {
      professional = professionals.find(p => 
        p.name.toLowerCase() === extractedProfessional.toLowerCase()
      );
    }
    
    // Find matching service
    let service = null;
    if (extractedService) {
      service = services.find(s => 
        s.name.toLowerCase().includes(extractedService.toLowerCase())
      );
    }
    
    // If service not found, try to find from common services
    if (!service) {
      service = services.find(s => s.name.toLowerCase().includes('escova')) ||
               services.find(s => s.name.toLowerCase().includes('corte')) ||
               services[0]; // fallback to first service
    }
    
    // If professional not found, try to find from conversation text
    if (!professional) {
      for (const prof of professionals) {
        if (allConversationText.toLowerCase().includes(prof.name.toLowerCase()) ||
            aiResponse.toLowerCase().includes(prof.name.toLowerCase())) {
          professional = prof;
          break;
        }
      }
    }
    
    if (!professional || !service || !extractedTime) {
      console.log('⚠️ Insufficient data extracted from AI response');
      console.log('Missing:', { 
        professional: !professional ? 'professional' : 'ok',
        service: !service ? 'service' : 'ok', 
        time: !extractedTime ? 'time' : 'ok'
      });
      return;
    }
    
    // Calculate appointment date using the EXACT same logic from system prompt
    const today = new Date();
    const dayMap = { 'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6 };
    let appointmentDate = new Date();
    
    // Handle special cases first
    if (extractedDay?.toLowerCase() === "hoje") {
      appointmentDate = new Date(today);
      console.log(`📅 Agendamento para HOJE: ${appointmentDate.toLocaleDateString('pt-BR')}`);
    } else if (extractedDay?.toLowerCase() === "amanhã") {
      appointmentDate = new Date(today);
      appointmentDate.setDate(today.getDate() + 1);
      console.log(`📅 Agendamento para AMANHÃ: ${appointmentDate.toLocaleDateString('pt-BR')}`);
    } else {
      // Handle regular day names
      const targetDay = dayMap[extractedDay?.toLowerCase() as keyof typeof dayMap];
      
      if (targetDay !== undefined) {
        const currentDay = today.getDay();
        let daysUntilTarget = targetDay - currentDay;
        
        // If it's the same day but later time, keep today
        // Otherwise, get next week's occurrence if day has passed
        if (daysUntilTarget < 0) {
          daysUntilTarget += 7;
        } else if (daysUntilTarget === 0) {
          // Same day - check if it's still possible today or next week
          // For now, assume same day means today
          daysUntilTarget = 0;
        }
        
        // Set the correct date
        appointmentDate.setDate(today.getDate() + daysUntilTarget);
        appointmentDate.setHours(0, 0, 0, 0); // Reset time to start of day
        
        console.log(`📅 Cálculo de data: Hoje é ${today.toLocaleDateString('pt-BR')} (${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][currentDay]})`);
        console.log(`📅 Dia alvo: ${extractedDay} (${targetDay}), Dias até o alvo: ${daysUntilTarget}`);
        console.log(`📅 Data calculada do agendamento: ${appointmentDate.toLocaleDateString('pt-BR')}`);
      }
    }
    
    // Format time
    const formattedTime = extractedTime.includes(':') ? extractedTime : `${extractedTime}:00`;
    
    // Find or create client
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const existingClients = await storage.getClientsByCompany(companyId);
    
    console.log(`🔍 Looking for existing client with phone: ${normalizedPhone}`);
    console.log(`📋 Existing clients:`, existingClients.map(c => ({ name: c.name, phone: c.phone })));
    
    // Try to find existing client by phone or name
    let client = existingClients.find(c => 
      (c.phone && c.phone.replace(/\D/g, '') === normalizedPhone) ||
      (c.name && extractedName && c.name.toLowerCase() === extractedName.toLowerCase())
    );
    
    if (!client) {
      // Use proper Brazilian phone formatting from phone-utils
      console.log(`📞 Processing phone: ${phoneNumber}`);
      const normalizedPhone = normalizePhone(phoneNumber);
      console.log(`📞 Normalized: ${normalizedPhone}`);
      const formattedPhone = formatBrazilianPhone(normalizedPhone);
      console.log(`📞 Formatted: ${formattedPhone}`);
      
      if (!formattedPhone) {
        console.log(`❌ Invalid phone number format: ${phoneNumber}`);
        throw new Error('Formato de telefone inválido');
      }
      
      const clientName = extractedName || `Cliente ${formattedPhone}`;
      console.log(`🆕 Creating new client: ${clientName} with phone ${formattedPhone}`);
      
      client = await storage.createClient({
        companyId,
        name: clientName,
        phone: formattedPhone,
        email: null,
        notes: null,
        birthDate: null
      });
    } else {
      console.log(`✅ Found existing client: ${client.name} (ID: ${client.id})`);
    }
    
    // Check for appointment conflicts before creating
    console.log(`🔍 Checking for appointment conflicts: ${professional.name} on ${appointmentDate.toISOString().split('T')[0]} at ${formattedTime}`);
    
    try {
      // Parse the requested time to minutes for overlap calculation
      const [requestedHour, requestedMin] = formattedTime.split(':').map(Number);
      const requestedTimeInMinutes = requestedHour * 60 + requestedMin;
      const serviceDuration = service.duration || 30; // Default 30 minutes if not specified
      const requestedEndTimeInMinutes = requestedTimeInMinutes + serviceDuration;
      
      console.log(`📊 Novo agendamento: ${formattedTime} (${requestedTimeInMinutes}min) - Duração: ${serviceDuration}min - Fim: ${Math.floor(requestedEndTimeInMinutes/60)}:${String(requestedEndTimeInMinutes%60).padStart(2,'0')}`);
      
      // Get all appointments for this professional on this date (not just exact time match)
      const [existingRows] = await pool.execute(
        `SELECT id, client_name, client_phone, appointment_time, duration 
         FROM appointments 
         WHERE company_id = ? 
           AND professional_id = ?
           AND appointment_date = ?
           AND status != 'Cancelado'`,
        [companyId, professional.id, appointmentDate.toISOString().split('T')[0]]
      ) as any;
      
      let hasConflict = false;
      let conflictingAppointment = null;
      
      for (const existing of existingRows) {
        const [existingHour, existingMin] = existing.appointment_time.split(':').map(Number);
        const existingTimeInMinutes = existingHour * 60 + existingMin;
        const existingDuration = existing.duration || 30;
        const existingEndTimeInMinutes = existingTimeInMinutes + existingDuration;
        
        console.log(`📋 Agendamento existente: ${existing.appointment_time} (${existingTimeInMinutes}min) - Duração: ${existingDuration}min - Fim: ${Math.floor(existingEndTimeInMinutes/60)}:${String(existingEndTimeInMinutes%60).padStart(2,'0')}`);
        
        // Check for time overlap: new appointment overlaps if it starts before existing ends AND ends after existing starts
        const hasOverlap = (
          (requestedTimeInMinutes < existingEndTimeInMinutes) && 
          (requestedEndTimeInMinutes > existingTimeInMinutes)
        );
        
        if (hasOverlap) {
          console.log(`⚠️ Conflito de horário detectado: ${existing.client_name} (${existing.appointment_time}-${Math.floor(existingEndTimeInMinutes/60)}:${String(existingEndTimeInMinutes%60).padStart(2,'0')}) vs novo (${formattedTime}-${Math.floor(requestedEndTimeInMinutes/60)}:${String(requestedEndTimeInMinutes%60).padStart(2,'0')})`);
          
          // Check if conflict is with same phone number (same client updating appointment)
          const existingPhone = existing.client_phone?.replace(/\D/g, '');
          const newPhone = phoneNumber.replace(/\D/g, '');
          
          if (existingPhone === newPhone) {
            console.log(`✅ Conflito com o mesmo cliente, atualizando agendamento existente`);
            // Update existing appointment instead of creating new one
            await storage.updateAppointment(existing.id, {
              appointmentTime: formattedTime,
              appointmentDate,
              duration: serviceDuration,
              updatedAt: new Date(),
              notes: `Agendamento atualizado via WhatsApp - Conversa ID: ${conversationId}`
            });
            console.log(`✅ Agendamento ${existing.id} atualizado com sucesso`);
            return;
          }
          
          hasConflict = true;
          conflictingAppointment = existing;
          break;
        }
      }
      
      if (hasConflict && conflictingAppointment) {
        console.log(`❌ Conflito com cliente diferente: ${conflictingAppointment.client_name} às ${conflictingAppointment.appointment_time}`);
        console.log(`⚠️ Conflito detectado, mas prosseguindo devido à confirmação explícita do usuário`);
      } else {
        console.log(`✅ Nenhum conflito encontrado. Criando agendamento para ${extractedName}`);
      }
    } catch (dbError) {
      console.error('❌ Error checking appointment conflicts:', dbError);
      // Continue with appointment creation if conflict check fails
    }
    
    // Create appointment
    const appointment = await storage.createAppointment({
      companyId,
      professionalId: professional.id,
      serviceId: service.id,
      clientName: extractedName,
      clientPhone: phoneNumber,
      clientEmail: null,
      appointmentDate,
      appointmentTime: formattedTime,
      duration: service.duration || 30,
      totalPrice: service.price || 0,
      status: 'Pendente',
      notes: `Agendamento confirmado via WhatsApp - Conversa ID: ${conversationId}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`✅ Appointment created from AI confirmation: ${extractedName} - ${service.name} - ${appointmentDate.toLocaleDateString()} ${formattedTime}`);
    
    // Force immediate refresh of appointments list
    console.log('📡 Broadcasting new appointment notification...');
    
    // Broadcast notification with complete appointment data
    const appointmentNotification = {
      type: 'new_appointment',
      appointment: {
        id: appointment?.id || Date.now(), // Use appointment ID if available
        clientName: extractedName,
        serviceName: service.name,
        professionalName: professional?.name || 'Profissional',
        appointmentDate: appointmentDate.toISOString().split('T')[0],
        appointmentTime: formattedTime,
        professionalId: professional.id,
        serviceId: service.id,
        status: 'Pendente'
      }
    };
    
    try {
      broadcastEvent(appointmentNotification);
      console.log('✅ Broadcast notification sent:', JSON.stringify(appointmentNotification, null, 2));
    } catch (broadcastError) {
      console.error('⚠️ Broadcast error:', broadcastError);
    }
    
  } catch (error) {
    console.error('❌ Error creating appointment from AI confirmation:', error);
  }
}

async function createAppointmentFromConversation(conversationId: number, companyId: number) {
  try {
    console.log('📅 Checking conversation for complete appointment confirmation:', conversationId);
    
    // Check if appointment already exists for this conversation within the last 5 minutes (only to prevent duplicates)
    const existingAppointments = await storage.getAppointmentsByCompany(companyId);
    const conversationAppointment = existingAppointments.find(apt => 
      apt.notes && apt.notes.includes(`Conversa ID: ${conversationId}`) &&
      apt.createdAt && new Date(apt.createdAt).getTime() > (Date.now() - 5 * 60 * 1000)
    );
    
    if (conversationAppointment) {
      console.log('ℹ️ Recent appointment already exists for this conversation (within 5 min), skipping creation');
      return;
    }
    
    // Get conversation and messages
    const allConversations = await storage.getConversationsByCompany(companyId);
    const conversation = allConversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      console.log('⚠️ Conversa não encontrada:', conversationId);
      return;
    }
    
    const messages = await storage.getMessagesByConversation(conversationId);
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    // REGRA CRÍTICA: Só criar agendamento se houver confirmação explícita final
    const finalConfirmationPhrases = [
      'sim',
      'ok', 
      'confirmo',
      'sim, confirmo',
      'sim, está correto',
      'sim, pode agendar',
      'ok, confirmo',
      'ok, está correto',
      'ok, pode agendar',
      'confirmo sim',
      'está correto sim',
      'pode agendar sim'
    ];
    
    // Get last user message to check for recent confirmation
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const hasRecentConfirmation = lastUserMessage && 
      finalConfirmationPhrases.some(phrase => 
        lastUserMessage.content.toLowerCase().trim() === phrase.toLowerCase()
      );
    
    const hasAnyConfirmation = finalConfirmationPhrases.some(phrase => 
      conversationText.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (!hasRecentConfirmation && !hasAnyConfirmation) {
      console.log('⚠️ Nenhuma confirmação final (sim/ok) encontrada na conversa, pulando criação de agendamento');
      return;
    }
    
    console.log('✅ Confirmação detectada na conversa, prosseguindo com criação de agendamento');

    // VERIFICAÇÃO ADICIONAL: Deve ter data específica mencionada na mesma mensagem ou contexto próximo
    const dateSpecificPhrases = [
      'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo',
      'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira',
      'amanhã', 'hoje', 'depois de amanhã'
    ];
    
    const hasSpecificDate = dateSpecificPhrases.some(phrase => 
      conversationText.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (!hasSpecificDate) {
      console.log('⚠️ No specific date mentioned in conversation, skipping appointment creation');
      return;
    }

    // VERIFICAÇÃO CRÍTICA: Se a última resposta do AI contém pergunta, dados ainda estão incompletos
    const lastAIMessage = messages.filter(m => m.role === 'assistant').pop();
    if (lastAIMessage && lastAIMessage.content) {
      const hasQuestion = lastAIMessage.content.includes('?') || 
                         lastAIMessage.content.toLowerCase().includes('qual') ||
                         lastAIMessage.content.toLowerCase().includes('informe') ||
                         lastAIMessage.content.toLowerCase().includes('escolha') ||
                         lastAIMessage.content.toLowerCase().includes('prefere') ||
                         lastAIMessage.content.toLowerCase().includes('gostaria');
      
      if (hasQuestion) {
        console.log('⚠️ AI is asking questions to client, appointment data incomplete, skipping creation');
        return;
      }
    }
    
    // Get available professionals and services to match
    const professionals = await storage.getProfessionalsByCompany(companyId);
    const services = await storage.getServicesByCompany(companyId);
    
    console.log('💬 Analyzing conversation with explicit confirmation for appointment data...');
    
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
      
      // Se o dia alvo é hoje, usar o próximo
      if (daysUntilTarget === 0) {
        daysUntilTarget = 7; // Próxima semana
      }
      
      // Se o dia já passou esta semana, pegar a próxima ocorrência
      if (daysUntilTarget < 0) {
        daysUntilTarget += 7;
      }
      
      // Criar nova data para evitar modificar a original
      const resultDate = new Date(date);
      resultDate.setDate(resultDate.getDate() + daysUntilTarget);
      return resultDate.toISOString().split('T')[0];
    }

    const extractionPrompt = `Analise esta conversa de WhatsApp e extraia os dados do agendamento APENAS SE HOUVER CONFIRMAÇÃO EXPLÍCITA COMPLETA.

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

REGRAS CRÍTICAS - SÓ EXTRAIA SE TODAS AS CONDIÇÕES FOREM ATENDIDAS:

1. DEVE haver confirmação final com "SIM" ou "OK" após resumo:
   - Cliente deve responder "sim, confirmo", "ok, confirmo", "sim, está correto"
   - NUNCA extraia dados se cliente apenas disse dados mas não confirmou com SIM/OK

2. DEVE ter havido um RESUMO COMPLETO antes da confirmação:
   - IA deve ter enviado resumo com TODOS os dados do agendamento
   - Cliente deve ter confirmado o resumo com "sim" ou "ok"

3. TODOS os dados devem estar no resumo confirmado:
   - Nome COMPLETO do cliente
   - Profissional ESPECÍFICO escolhido
   - Serviço ESPECÍFICO escolhido  
   - Data ESPECÍFICA (dia da semana + data)
   - Horário ESPECÍFICO
   - Telefone do cliente

4. INSTRUÇÕES PARA DATAS:
   - APENAS extraia se o cliente mencionou explicitamente o dia da semana
   - Se mencionado "sábado", use EXATAMENTE: ${getNextWeekdayDate('sábado')}
   - Se mencionado "segunda", use EXATAMENTE: ${getNextWeekdayDate('segunda')}
   - Se mencionado "terça", use EXATAMENTE: ${getNextWeekdayDate('terça')}
   - Se mencionado "quarta", use EXATAMENTE: ${getNextWeekdayDate('quarta')}
   - Se mencionado "quinta", use EXATAMENTE: ${getNextWeekdayDate('quinta')}
   - Se mencionado "sexta", use EXATAMENTE: ${getNextWeekdayDate('sexta')}
   - Se mencionado "domingo", use EXATAMENTE: ${getNextWeekdayDate('domingo')}

5. CASOS QUE DEVEM RETORNAR "DADOS_INCOMPLETOS":
   - Cliente apenas escolheu profissional/serviço mas não mencionou data específica
   - Cliente está perguntando sobre disponibilidade
   - Cliente está recebendo informações mas ainda não confirmou
   - Falta qualquer dado obrigatório (nome completo, data específica, horário, confirmação)
   - AI está perguntando algo ao cliente (significa que dados ainda estão incompletos)

Responda APENAS em formato JSON válido ou "DADOS_INCOMPLETOS":
{
  "clientName": "Nome completo extraído",
  "clientPhone": "Telefone extraído",
  "professionalId": ID_correto_da_lista,
  "serviceId": ID_correto_da_lista,
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
    console.log('🤖 AI Extraction result:', extractedData);
    
    if (!extractedData || extractedData === 'DADOS_INCOMPLETOS' || extractedData.includes('DADOS_INCOMPLETOS')) {
      console.log('⚠️ Incomplete appointment data or missing confirmation, skipping creation');
      return;
    }

    try {
      const appointmentData = JSON.parse(extractedData);
      
      // Validação final de todos os campos obrigatórios
      if (!appointmentData.clientName || !appointmentData.clientPhone || 
          !appointmentData.professionalId || !appointmentData.serviceId ||
          !appointmentData.appointmentDate || !appointmentData.appointmentTime) {
        console.log('⚠️ Missing required appointment fields after extraction, skipping creation');
        return;
      }

      // Se o telefone não foi extraído corretamente, usar o telefone da conversa
      if (!appointmentData.clientPhone || appointmentData.clientPhone === 'DADOS_INCOMPLETOS') {
        appointmentData.clientPhone = conversation.phoneNumber;
      }
      
      console.log('✅ Valid appointment data extracted with explicit confirmation:', JSON.stringify(appointmentData, null, 2));

      // Find the service to get duration
      const service = services.find(s => s.id === appointmentData.serviceId);
      if (!service) {
        console.log('⚠️ Service not found');
        return;
      }

      // Create client if doesn't exist
      let client;
      try {
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

      // Create appointment with correct date
      const appointmentDate = new Date(appointmentData.appointmentDate + 'T00:00:00.000Z');
      
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
        notes: `Agendamento confirmado via WhatsApp - Conversa ID: ${conversationId}`,
        reminderSent: false
      };

      console.log('📋 Creating appointment with correct date:', JSON.stringify(appointmentPayload, null, 2));
      
      let appointment;
      try {
        appointment = await storage.createAppointment(appointmentPayload);
        console.log('✅ Appointment created successfully with ID:', appointment.id);
        console.log('🎯 SUCCESS: Appointment saved to database with explicit confirmation');
      } catch (createError) {
        console.error('❌ CRITICAL ERROR: Failed to create appointment in database:', createError);
        throw createError;
      }
      
      console.log(`📅 CONFIRMED APPOINTMENT: ${appointmentData.clientName} - ${service.name} - ${appointmentDate.toLocaleDateString('pt-BR')} ${appointmentData.appointmentTime}`);

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


  // Coupons API routes
  app.get('/api/coupons', async (req: any, res) => {
    try {
      const coupons = await storage.getCoupons();
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ message: "Erro ao buscar cupons" });
    }
  });

  app.post('/api/coupons', async (req: any, res) => {
    try {
      console.log('Creating coupon with data:', req.body);
      
      const couponData = {
        companyId: req.body.companyId || 1,
        name: req.body.name,
        code: req.body.code,
        description: req.body.description || null,
        discountType: req.body.discountType || 'percentage',
        discountValue: req.body.discountValue.toString(),
        minOrderValue: req.body.minOrderValue ? parseFloat(req.body.minOrderValue).toString() : null,
        maxDiscount: req.body.maxDiscount ? parseFloat(req.body.maxDiscount).toString() : null,
        usageLimit: req.body.maxUses ? parseInt(req.body.maxUses) : null,
        usedCount: 0,
        validUntil: req.body.expiresAt || req.body.validUntil,
        isActive: req.body.isActive === true
      };

      const coupon = await storage.createCoupon(couponData);
      console.log('Coupon created successfully:', coupon);
      res.status(201).json(coupon);
    } catch (error) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ 
        message: "Erro ao criar cupom", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put('/api/coupons/:id', async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = {
        name: req.body.name,
        code: req.body.code,
        discountType: req.body.discountType,
        discountValue: parseFloat(req.body.discountValue),
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
        maxUses: parseInt(req.body.maxUses) || 1,
        isActive: req.body.isActive
      };

      const coupon = await storage.updateCoupon(id, updateData);
      res.json(coupon);
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ message: "Erro ao atualizar cupom" });
    }
  });

  app.delete('/api/coupons/:id', async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCoupon(id);
      res.json({ message: "Cupom excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ message: "Erro ao excluir cupom" });
    }
  });

  // Support tickets routes
  app.get('/api/company/support-tickets', isCompanyAuthenticated, async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      console.log('Fetching tickets for company:', companyId);
      
      const query = `
        SELECT 
          st.id, st.company_id as companyId, st.type_id as typeId, st.status_id as statusId,
          st.title, st.description, st.priority, st.admin_response as adminResponse,
          st.attachments, st.created_at as createdAt, st.updated_at as updatedAt, 
          st.resolved_at as resolvedAt,
          stt.name as category,
          sts.name as status, sts.color as statusColor
        FROM support_tickets st
        LEFT JOIN support_ticket_types stt ON st.type_id = stt.id
        LEFT JOIN support_ticket_statuses sts ON st.status_id = sts.id
        WHERE st.company_id = ?
        ORDER BY st.created_at DESC
      `;

      const [tickets] = await pool.execute(query, [companyId]);
      console.log('Found tickets:', Array.isArray(tickets) ? tickets.length : 0);
      
      if (Array.isArray(tickets) && tickets.length > 0) {
        console.log('First ticket attachments:', (tickets[0] as any).attachments);
      }
      
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ message: "Erro ao buscar tickets de suporte" });
    }
  });

  app.post('/api/company/support-tickets', supportTicketUpload.array('images', 3), async (req: any, res) => {
    try {
      const companyId = req.session.companyId;
      const { title, description, typeId } = req.body;

      // Debug logging
      console.log('Files received:', req.files ? req.files.length : 0);
      if (req.files) {
        req.files.forEach((file: any, index: number) => {
          console.log(`File ${index}:`, file.filename, file.originalname);
        });
      }

      // Handle file attachments - save as comma-separated filenames
      const attachmentFilenames = req.files ? req.files.map((file: any) => file.filename).join(',') : '';
      console.log('Attachment filenames to save:', attachmentFilenames);

      // Get the first available status ID (usually 'Aberto')
      const [statusRows] = await pool.execute(
        'SELECT id FROM support_ticket_statuses ORDER BY sort_order LIMIT 1'
      ) as any;
      
      const defaultStatusId = statusRows.length > 0 ? statusRows[0].id : null;

      if (!defaultStatusId) {
        return res.status(500).json({ message: "Nenhum status de ticket disponível. Contate o administrador." });
      }

      // Check if attachments column exists first
      const [columns] = await pool.execute('SHOW COLUMNS FROM support_tickets') as any;
      const hasAttachments = columns.some((col: any) => col.Field === 'attachments');
      
      let result;
      if (hasAttachments) {
        [result] = await pool.execute(
          'INSERT INTO support_tickets (company_id, type_id, status_id, title, description, attachments) VALUES (?, ?, ?, ?, ?, ?)',
          [companyId, typeId ? parseInt(typeId) : null, defaultStatusId, title, description, attachmentFilenames]
        ) as any;
      } else {
        // Add attachments column if it doesn't exist
        try {
          await pool.execute('ALTER TABLE support_tickets ADD COLUMN attachments TEXT');
          console.log('✅ Attachments column added during ticket creation');
        } catch (error: any) {
          if (error.code !== 'ER_DUP_FIELDNAME') {
            console.log('Error adding attachments column:', error.message);
          }
        }
        
        // Insert with attachments column
        [result] = await pool.execute(
          'INSERT INTO support_tickets (company_id, type_id, status_id, title, description, attachments) VALUES (?, ?, ?, ?, ?, ?)',
          [companyId, typeId ? parseInt(typeId) : null, defaultStatusId, title, description, attachmentFilenames]
        ) as any;
      }

      res.json({ 
        message: "Ticket criado com sucesso", 
        id: result.insertId,
        attachments: req.files ? req.files.length : 0
      });
    } catch (error) {
      console.error("Error creating support ticket:", error);
      res.status(500).json({ message: "Erro ao criar ticket de suporte" });
    }
  });

  app.put('/api/company/support-tickets/:id', async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const companyId = req.session.companyId;
      const { title, description, priority, category } = req.body;

      await db.update(supportTickets)
        .set({
          title,
          description,
          priority,
          category,
          updatedAt: new Date()
        })
        .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.companyId, companyId)));

      res.json({ message: "Ticket atualizado com sucesso" });
    } catch (error) {
      console.error("Error updating support ticket:", error);
      res.status(500).json({ message: "Erro ao atualizar ticket de suporte" });
    }
  });

  app.delete('/api/company/support-tickets/:id', async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const companyId = req.session.companyId;

      await db.delete(supportTickets)
        .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.companyId, companyId)));

      res.json({ message: "Ticket excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting support ticket:", error);
      res.status(500).json({ message: "Erro ao excluir ticket de suporte" });
    }
  });

  // Company route to fetch support ticket types
  app.get('/api/company/support-ticket-types', async (req: any, res) => {
    try {
      const ticketTypes = await db.select().from(supportTicketTypes)
        .where(eq(supportTicketTypes.isActive, true))
        .orderBy(supportTicketTypes.name);
      res.json(ticketTypes);
    } catch (error) {
      console.error("Error fetching support ticket types:", error);
      res.status(500).json({ message: "Erro ao buscar tipos de tickets" });
    }
  });

  // Admin routes for support ticket types
  app.get('/api/admin/support-ticket-types', isAuthenticated, async (req, res) => {
    try {
      const ticketTypes = await db.select().from(supportTicketTypes).orderBy(supportTicketTypes.name);
      res.json(ticketTypes);
    } catch (error) {
      console.error("Error fetching support ticket types:", error);
      res.status(500).json({ message: "Erro ao buscar tipos de tickets" });
    }
  });

  app.post('/api/admin/support-ticket-types', isAuthenticated, async (req, res) => {
    try {
      const { name, description, isActive } = req.body;

      const newType = await db.insert(supportTicketTypes).values({
        name,
        description,
        isActive: isActive !== undefined ? isActive : true
      });

      res.json({ message: "Tipo de ticket criado com sucesso", id: newType.insertId });
    } catch (error) {
      console.error("Error creating support ticket type:", error);
      res.status(500).json({ message: "Erro ao criar tipo de ticket" });
    }
  });

  app.put('/api/admin/support-ticket-types/:id', isAuthenticated, async (req, res) => {
    try {
      const typeId = parseInt(req.params.id);
      const { name, description, isActive } = req.body;

      await db.update(supportTicketTypes)
        .set({
          name,
          description,
          isActive,
          updatedAt: new Date()
        })
        .where(eq(supportTicketTypes.id, typeId));

      res.json({ message: "Tipo de ticket atualizado com sucesso" });
    } catch (error) {
      console.error("Error updating support ticket type:", error);
      res.status(500).json({ message: "Erro ao atualizar tipo de ticket" });
    }
  });

  app.delete('/api/admin/support-ticket-types/:id', isAuthenticated, async (req, res) => {
    try {
      const typeId = parseInt(req.params.id);

      await db.delete(supportTicketTypes).where(eq(supportTicketTypes.id, typeId));

      res.json({ message: "Tipo de ticket excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting support ticket type:", error);
      res.status(500).json({ message: "Erro ao excluir tipo de ticket" });
    }
  });

  // Evolution API diagnostic endpoint
  app.get('/api/admin/evolution-api/test', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getGlobalSettings();
      
      if (!settings?.evolutionApiUrl || !settings?.evolutionApiGlobalKey) {
        return res.json({
          success: false,
          message: "Configurações da Evolution API não encontradas",
          details: {
            hasUrl: !!settings?.evolutionApiUrl,
            hasKey: !!settings?.evolutionApiGlobalKey
          }
        });
      }

      // Test API connection - try multiple common Evolution API endpoints
      let testUrl = `${settings.evolutionApiUrl}/manager/findInstances`;
      
      // If the URL doesn't contain /api/, try adding it
      if (!settings.evolutionApiUrl.includes('/api/')) {
        testUrl = `${settings.evolutionApiUrl}/api/manager/findInstances`;
      }
      
      console.log('Testing Evolution API:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': settings.evolutionApiGlobalKey
        }
      });

      console.log('Test response status:', response.status);
      const responseText = await response.text();
      console.log('Test response body:', responseText.substring(0, 200));

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        return res.json({
          success: false,
          message: "Evolution API retornou resposta inválida",
          details: {
            status: response.status,
            responseType: responseText.includes('<!DOCTYPE') ? 'HTML' : 'Text',
            preview: responseText.substring(0, 200)
          }
        });
      }

      res.json({
        success: true,
        message: "Conexão com Evolution API estabelecida",
        details: {
          status: response.status,
          instances: Array.isArray(responseData) ? responseData.length : 'N/A'
        }
      });

    } catch (error: any) {
      console.error("Error testing Evolution API:", error);
      res.json({
        success: false,
        message: "Erro ao testar Evolution API",
        details: {
          error: error.message
        }
      });
    }
  });

  // Admin routes for support ticket statuses
  app.get('/api/admin/support-ticket-statuses', isAuthenticated, async (req, res) => {
    try {
      const statuses = await db.select().from(supportTicketStatuses).orderBy(asc(supportTicketStatuses.sortOrder));
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching support ticket statuses:", error);
      res.status(500).json({ message: "Erro ao buscar status de tickets" });
    }
  });

  app.post('/api/admin/support-ticket-statuses', isAuthenticated, async (req, res) => {
    try {
      const { name, description, color, isActive, sortOrder } = req.body;

      await db.insert(supportTicketStatuses).values({
        name,
        description,
        color: color || '#6b7280',
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder || 0
      });

      res.status(201).json({ message: "Status de ticket criado com sucesso" });
    } catch (error) {
      console.error("Error creating support ticket status:", error);
      res.status(500).json({ message: "Erro ao criar status de ticket" });
    }
  });

  app.put('/api/admin/support-ticket-statuses/:id', isAuthenticated, async (req, res) => {
    try {
      const statusId = parseInt(req.params.id);
      const { name, description, color, isActive, sortOrder } = req.body;

      await db.update(supportTicketStatuses)
        .set({
          name,
          description,
          color,
          isActive,
          sortOrder,
          updatedAt: new Date()
        })
        .where(eq(supportTicketStatuses.id, statusId));

      res.json({ message: "Status de ticket atualizado com sucesso" });
    } catch (error) {
      console.error("Error updating support ticket status:", error);
      res.status(500).json({ message: "Erro ao atualizar status de ticket" });
    }
  });

  app.delete('/api/admin/support-ticket-statuses/:id', isAuthenticated, async (req, res) => {
    try {
      const statusId = parseInt(req.params.id);

      await db.delete(supportTicketStatuses).where(eq(supportTicketStatuses.id, statusId));

      res.json({ message: "Status de ticket excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting support ticket status:", error);
      res.status(500).json({ message: "Erro ao excluir status de ticket" });
    }
  });

  // Admin routes for support tickets
  app.get('/api/admin/support-tickets', isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching admin support tickets...");
      
      const query = `
        SELECT 
          st.id, st.company_id as companyId, st.type_id as typeId, st.status_id as statusId,
          st.title, st.description, st.priority, st.category, st.admin_response as adminResponse,
          st.attachments, st.created_at as createdAt, st.updated_at as updatedAt, 
          st.resolved_at as resolvedAt,
          c.fantasy_name as companyName, c.email as companyEmail,
          stt.name as typeName,
          sts.name as statusName, sts.color as statusColor
        FROM support_tickets st
        LEFT JOIN companies c ON st.company_id = c.id
        LEFT JOIN support_ticket_types stt ON st.type_id = stt.id
        LEFT JOIN support_ticket_statuses sts ON st.status_id = sts.id
        ORDER BY st.created_at DESC
      `;

      const [tickets] = await pool.execute(query);
      console.log(`Found ${Array.isArray(tickets) ? tickets.length : 0} admin tickets`);
      
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching admin support tickets:", error);
      res.status(500).json({ message: "Erro ao buscar tickets de suporte" });
    }
  });

  app.put('/api/admin/support-tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const { statusId, adminResponse, attachments } = req.body;

      const updateData: any = {};
      if (statusId) updateData.statusId = statusId;
      if (adminResponse !== undefined) updateData.adminResponse = adminResponse;
      if (attachments !== undefined) updateData.attachments = attachments;
      updateData.updatedAt = new Date();

      await db.update(supportTickets)
        .set(updateData)
        .where(eq(supportTickets.id, ticketId));

      res.json({ message: "Ticket atualizado com sucesso" });
    } catch (error) {
      console.error("Error updating admin support ticket:", error);
      res.status(500).json({ message: "Erro ao atualizar ticket" });
    }
  });

  // Admin route for uploading files to support tickets
  app.post('/api/admin/support-tickets/upload', isAuthenticated, supportTicketUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const { ticketId, type } = req.body;
      
      console.log(`Admin file upload: ${req.file.filename} for ticket ${ticketId}`);

      res.json({
        message: "Arquivo enviado com sucesso",
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        ticketId: ticketId,
        type: type
      });
    } catch (error) {
      console.error("Error uploading admin file:", error);
      res.status(500).json({ message: "Erro ao fazer upload do arquivo" });
    }
  });

  // Routes for support ticket comments
  app.get('/api/company/support-tickets/:ticketId/comments', isCompanyAuthenticated, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const companyId = req.session.companyId;

      // Verify ticket belongs to company
      const [ticket] = await pool.execute(
        'SELECT id FROM support_tickets WHERE id = ? AND company_id = ?',
        [ticketId, companyId]
      ) as any;

      if (!ticket.length) {
        return res.status(404).json({ message: "Ticket não encontrado" });
      }

      const [comments] = await pool.execute(`
        SELECT id, comment, created_at
        FROM support_ticket_comments 
        WHERE ticket_id = ? 
        ORDER BY created_at ASC
      `, [ticketId]) as any;

      res.json(comments);
    } catch (error) {
      console.error("Error fetching ticket comments:", error);
      res.status(500).json({ message: "Erro ao buscar comentários do ticket" });
    }
  });

  app.post('/api/company/support-tickets/:ticketId/comments', isCompanyAuthenticated, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const companyId = req.session.companyId;
      const { comment } = req.body;

      if (!comment || !comment.trim()) {
        return res.status(400).json({ message: "Comentário é obrigatório" });
      }

      // Verify ticket belongs to company
      const [ticket] = await pool.execute(
        'SELECT id FROM support_tickets WHERE id = ? AND company_id = ?',
        [ticketId, companyId]
      ) as any;

      if (!ticket.length) {
        return res.status(404).json({ message: "Ticket não encontrado" });
      }

      // Insert comment
      await pool.execute(`
        INSERT INTO support_ticket_comments (ticket_id, company_id, comment)
        VALUES (?, ?, ?)
      `, [ticketId, companyId, comment.trim()]);

      res.json({ message: "Comentário adicionado com sucesso" });
    } catch (error) {
      console.error("Error adding ticket comment:", error);
      res.status(500).json({ message: "Erro ao adicionar comentário" });
    }
  });

  // Route to add additional information to existing ticket
  app.post('/api/company/support-tickets/:ticketId/add-info', isCompanyAuthenticated, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const companyId = req.session.companyId;
      const { additionalInfo } = req.body;

      if (!additionalInfo || !additionalInfo.trim()) {
        return res.status(400).json({ message: "Informação adicional é obrigatória" });
      }

      // Verify ticket belongs to company
      const [ticket] = await pool.execute(
        'SELECT id, description FROM support_tickets WHERE id = ? AND company_id = ?',
        [ticketId, companyId]
      ) as any;

      if (!ticket.length) {
        return res.status(404).json({ message: "Ticket não encontrado" });
      }

      const currentDescription = ticket[0].description || '';
      const separator = currentDescription.trim() ? '\n\n--- Informação Adicional ---\n' : '';
      const updatedDescription = currentDescription + separator + additionalInfo.trim();

      // Update ticket with additional information
      await pool.execute(
        'UPDATE support_tickets SET description = ?, updated_at = NOW() WHERE id = ?',
        [updatedDescription, ticketId]
      );

      res.json({ message: "Informação adicional adicionada com sucesso" });
    } catch (error) {
      console.error("Error adding additional info to ticket:", error);
      res.status(500).json({ message: "Erro ao adicionar informação adicional" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
