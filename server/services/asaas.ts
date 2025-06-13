interface AsaasCustomer {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  additionalEmails?: string;
  municipalInscription?: string;
  stateInscription?: string;
  observations?: string;
}

interface AsaasCustomerResponse {
  object: string;
  id: string;
  dateCreated: string;
  name: string;
  email: string;
  phone: string;
  mobilePhone: string;
  address: string;
  addressNumber: string;
  complement: string;
  province: string;
  postalCode: string;
  cpfCnpj: string;
  personType: string;
  deleted: boolean;
  additionalEmails: string;
  externalReference: string;
  notificationDisabled: boolean;
  city: number;
  state: string;
  country: string;
  observations: string;
}

interface AsaasPayment {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  discount?: {
    value: number;
    dueDateLimitDays: number;
  };
  interest?: {
    value: number;
  };
  fine?: {
    value: number;
  };
  postalService?: boolean;
  split?: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
  }>;
  callback?: {
    successUrl: string;
    autoRedirect: boolean;
  };
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
    mobilePhone?: string;
  };
  creditCardToken?: string;
}

interface AsaasPaymentResponse {
  object: string;
  id: string;
  dateCreated: string;
  customer: string;
  subscription: string;
  installment: string;
  paymentLink: string;
  value: number;
  netValue: number;
  originalValue: number;
  interestValue: number;
  description: string;
  billingType: string;
  confirmedDate: string;
  pixTransaction: string;
  status: string;
  dueDate: string;
  originalDueDate: string;
  paymentDate: string;
  clientPaymentDate: string;
  installmentNumber: number;
  invoiceUrl: string;
  invoiceNumber: string;
  externalReference: string;
  deleted: boolean;
  anticipated: boolean;
  anticipable: boolean;
  creditDate: string;
  estimatedCreditDate: string;
  transactionReceiptUrl: string;
  nossoNumero: string;
  bankSlipUrl: string;
  lastInvoiceViewedDate: string;
  lastBankSlipViewedDate: string;
  discount: {
    value: number;
    limitDate: string;
    dueDateLimitDays: number;
    type: string;
  };
  fine: {
    value: number;
    type: string;
  };
  interest: {
    value: number;
    type: string;
  };
  postalService: boolean;
  custody: string;
  refunds: string;
}

class AsaasService {
  private baseUrl = 'https://www.asaas.com/api/v3';
  private token: string;

  constructor() {
    this.token = process.env.ASAAS_TOKEN || '';
    if (!this.token) {
      console.warn('⚠️ ASAAS_TOKEN não configurado. Funcionalidades de pagamento não estarão disponíveis.');
    }
  }

  private async makeRequest<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<T> {
    if (!this.token) {
      throw new Error('Token do Asaas não configurado. Configure ASAAS_TOKEN no arquivo .env');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`🔄 Asaas API ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.token,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro na API do Asaas:', responseData);
      throw new Error(responseData.errors?.[0]?.description || responseData.message || 'Erro na API do Asaas');
    }

    console.log('✅ Resposta Asaas:', responseData);
    return responseData;
  }

  async createCustomer(customerData: AsaasCustomer): Promise<AsaasCustomerResponse> {
    return this.makeRequest<AsaasCustomerResponse>('/customers', 'POST', customerData);
  }

  async getCustomer(customerId: string): Promise<AsaasCustomerResponse> {
    return this.makeRequest<AsaasCustomerResponse>(`/customers/${customerId}`);
  }

  async updateCustomer(customerId: string, customerData: Partial<AsaasCustomer>): Promise<AsaasCustomerResponse> {
    return this.makeRequest<AsaasCustomerResponse>(`/customers/${customerId}`, 'PUT', customerData);
  }

  async createPayment(paymentData: AsaasPayment): Promise<AsaasPaymentResponse> {
    return this.makeRequest<AsaasPaymentResponse>('/payments', 'POST', paymentData);
  }

  async getPayment(paymentId: string): Promise<AsaasPaymentResponse> {
    return this.makeRequest<AsaasPaymentResponse>(`/payments/${paymentId}`);
  }

  async listCustomers(params?: {
    name?: string;
    email?: string;
    cpfCnpj?: string;
    groupName?: string;
    externalReference?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ object: string; hasMore: boolean; totalCount: number; limit: number; offset: number; data: AsaasCustomerResponse[] }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const endpoint = `/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest(endpoint);
  }

  // Função utilitária para formatar CPF
  formatCpf(cpf: string): string {
    // Remove todos os caracteres não numéricos
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Valida se tem 11 dígitos
    if (cleanCpf.length !== 11) {
      throw new Error('CPF deve ter 11 dígitos');
    }
    
    return cleanCpf;
  }

  // Função utilitária para validar CPF
  isValidCpf(cpf: string): boolean {
    const cleanCpf = cpf.replace(/\D/g, '');
    
    if (cleanCpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
    
    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    let digit1 = remainder < 2 ? 0 : remainder;
    
    if (parseInt(cleanCpf.charAt(9)) !== digit1) return false;
    
    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    let digit2 = remainder < 2 ? 0 : remainder;
    
    return parseInt(cleanCpf.charAt(10)) === digit2;
  }
}

export const asaasService = new AsaasService();
export type { AsaasCustomer, AsaasCustomerResponse, AsaasPayment, AsaasPaymentResponse };