import { z } from "zod";

// Brazilian CNPJ validation
export function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  
  // Validate first check digit
  let sum = 0;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i]) * weights1[i];
  }
  
  const remainder1 = sum % 11;
  const digit1 = remainder1 < 2 ? 0 : 11 - remainder1;
  
  if (parseInt(cnpj[12]) !== digit1) return false;
  
  // Validate second check digit
  sum = 0;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i]) * weights2[i];
  }
  
  const remainder2 = sum % 11;
  const digit2 = remainder2 < 2 ? 0 : 11 - remainder2;
  
  return parseInt(cnpj[13]) === digit2;
}

// Brazilian CPF validation
export function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  
  const remainder1 = sum % 11;
  const digit1 = remainder1 < 2 ? 0 : 11 - remainder1;
  
  if (parseInt(cpf[9]) !== digit1) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  
  const remainder2 = sum % 11;
  const digit2 = remainder2 < 2 ? 0 : 11 - remainder2;
  
  return parseInt(cpf[10]) === digit2;
}

// Document validation (CNPJ or CPF)
export function validateDocument(document: string): boolean {
  const cleanDocument = document.replace(/[^\d]/g, '');
  
  if (cleanDocument.length === 11) {
    return validateCPF(cleanDocument);
  } else if (cleanDocument.length === 14) {
    return validateCNPJ(cleanDocument);
  }
  
  return false;
}

// Format CNPJ
export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/[^\d]/g, '');
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Format CPF
export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/[^\d]/g, '');
  return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

// Format document (CNPJ or CPF)
export function formatDocument(document: string): string {
  const clean = document.replace(/[^\d]/g, '');
  
  if (clean.length === 11) {
    return formatCPF(clean);
  } else if (clean.length === 14) {
    return formatCNPJ(clean);
  }
  
  return document;
}

// Zod schema for Brazilian document validation
export const documentSchema = z.string()
  .min(1, "Documento é obrigatório")
  .refine(validateDocument, "Documento inválido (CNPJ ou CPF)");

// Company validation schema
export const companySchema = z.object({
  fantasyName: z.string().min(1, "Nome fantasia é obrigatório"),
  document: documentSchema,
  address: z.string().min(1, "Endereço é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

// Plan validation schema
export const planSchema = z.object({
  name: z.string().min(1, "Nome do plano é obrigatório"),
  freeDays: z.number().min(0, "Dias grátis deve ser 0 ou maior"),
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Preço deve ser um número válido"),
  isActive: z.boolean(),
});

// Settings validation schema
export const settingsSchema = z.object({
  systemName: z.string().min(1, "Nome do sistema é obrigatório"),
  logoUrl: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor primária deve ser um hex válido"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor secundária deve ser um hex válido"),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor de fundo deve ser um hex válido"),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor do texto deve ser um hex válido"),
});
