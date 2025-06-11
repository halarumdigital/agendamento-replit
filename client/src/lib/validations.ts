import { z } from "zod";

export function formatDocument(value: string): string {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // If length is 11, format as CPF: 000.000.000-00
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
  
  // If length is 14, format as CNPJ: 00.000.000/0000-00
  return numbers
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatCEP(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{5})(\d)/, '$1-$2');
}

// Validation schemas
export const companyProfileSchema = z.object({
  fantasyName: z.string().min(2, "Nome fantasia deve ter pelo menos 2 caracteres"),
  document: z.string().min(11, "CNPJ/CPF é obrigatório"),
  email: z.string().email("E-mail inválido"),
  address: z.string().min(5, "Endereço é obrigatório"),
  phone: z.string().optional(),
  zipCode: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export const companyPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export const companyAiAgentSchema = z.object({
  aiAgentPrompt: z.string().min(10, "Prompt deve ter pelo menos 10 caracteres"),
});

export const whatsappInstanceSchema = z.object({
  instanceName: z.string().min(3, "Nome da instância deve ter pelo menos 3 caracteres"),
  apiKey: z.string().min(10, "Chave da API é obrigatória"),
  apiUrl: z.string().url("URL da API inválida"),
});

export const webhookConfigSchema = z.object({
  apiUrl: z.string().url("URL da API inválida"),
  apiKey: z.string().min(10, "Chave da API é obrigatória"),
});

export const companySchema = z.object({
  fantasyName: z.string().min(2, "Nome fantasia deve ter pelo menos 2 caracteres"),
  document: z.string().min(11, "CNPJ/CPF é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  address: z.string().min(5, "Endereço é obrigatório"),
  phone: z.string().optional(),
  zipCode: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  planId: z.number().min(1, "Plano é obrigatório"),
  isActive: z.boolean().default(true),
});