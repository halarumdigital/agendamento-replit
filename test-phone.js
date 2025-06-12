// Test phone normalization for WhatsApp numbers
function normalizePhone(phone) {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  let normalized = phone.replace(/\D/g, '');
  
  // Remove código do país brasileiro se presente
  if (normalized.startsWith('55') && (normalized.length === 12 || normalized.length === 13)) {
    const withoutCountryCode = normalized.substring(2);
    // Para números de 12 dígitos (554999214230), precisamos adicionar o 9 extra para celulares
    if (normalized.length === 12 && withoutCountryCode.length === 10 && withoutCountryCode[2] === '9') {
      // 4999214230 vira 4999214230 -> precisa virar 49999214230
      const areaCode = withoutCountryCode.substring(0, 2);
      const number = withoutCountryCode.substring(2);
      normalized = areaCode + '9' + number;
    } else {
      normalized = withoutCountryCode;
    }
  }
  
  // Remove zero adicional do DDD se presente (ex: 049 -> 49)
  if (normalized.length === 11 && normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }
  
  return normalized;
}

function validateBrazilianPhone(phone) {
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

function formatBrazilianPhone(phone) {
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

// Test with WhatsApp number format
const testPhone = '554999214230';
console.log('Testing phone:', testPhone);
console.log('Normalized:', normalizePhone(testPhone));
console.log('Valid:', validateBrazilianPhone(normalizePhone(testPhone)));
console.log('Formatted:', formatBrazilianPhone(normalizePhone(testPhone)));