// Utilitários para normalização e validação de telefones

/**
 * Normaliza um número de telefone removendo formatação
 * @param phone - Número de telefone com ou sem formatação
 * @returns Número normalizado apenas com dígitos
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  let normalized = phone.replace(/\D/g, '');
  
  // Remove código do país brasileiro se presente
  if (normalized.startsWith('55') && normalized.length === 13) {
    normalized = normalized.substring(2);
  }
  
  // Remove zero adicional do DDD se presente (ex: 049 -> 49)
  if (normalized.length === 11 && normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }
  
  return normalized;
}

/**
 * Valida se um telefone brasileiro é válido
 * @param phone - Número de telefone
 * @returns true se válido, false caso contrário
 */
export function validateBrazilianPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  
  // Deve ter 10 ou 11 dígitos (celular ou fixo)
  if (normalized.length !== 10 && normalized.length !== 11) {
    return false;
  }
  
  // Verifica se é um DDD válido (11-99)
  const ddd = parseInt(normalized.substring(0, 2));
  if (ddd < 11 || ddd > 99) {
    return false;
  }
  
  // Para celular (11 dígitos), o terceiro dígito deve ser 9
  if (normalized.length === 11 && normalized[2] !== '9') {
    return false;
  }
  
  // Para telefone fixo (10 dígitos), o terceiro dígito deve ser 2-5
  if (normalized.length === 10) {
    const thirdDigit = parseInt(normalized[2]);
    if (thirdDigit < 2 || thirdDigit > 5) {
      return false;
    }
  }
  
  return true;
}

/**
 * Formata um telefone brasileiro
 * @param phone - Número de telefone
 * @returns Telefone formatado ou string vazia se inválido
 */
export function formatBrazilianPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  
  if (!validateBrazilianPhone(normalized)) {
    return '';
  }
  
  if (normalized.length === 11) {
    // Celular: (XX) 9XXXX-XXXX
    return `(${normalized.substring(0, 2)}) ${normalized.substring(2, 7)}-${normalized.substring(7)}`;
  } else {
    // Fixo: (XX) XXXX-XXXX
    return `(${normalized.substring(0, 2)}) ${normalized.substring(2, 6)}-${normalized.substring(6)}`;
  }
}

/**
 * Compara dois telefones ignorando formatação
 * @param phone1 - Primeiro telefone
 * @param phone2 - Segundo telefone
 * @returns true se são o mesmo número
 */
export function comparePhones(phone1: string | null | undefined, phone2: string | null | undefined): boolean {
  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);
  
  if (!normalized1 || !normalized2) return false;
  
  return normalized1 === normalized2;
}