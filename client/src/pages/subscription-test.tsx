import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Plan {
  id: number;
  name: string;
  price: number;
  freeDays: number;
  description: string;
}

export default function SubscriptionTest() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plans] = useState<Plan[]>([
    { id: 1, name: "Plano Básico", price: 29.90, freeDays: 7, description: "Ideal para salões pequenos" },
    { id: 2, name: "Plano Premium", price: 49.90, freeDays: 14, description: "Para salões em crescimento" },
    { id: 3, name: "Plano Empresarial", price: 99.90, freeDays: 30, description: "Para grandes empresas" }
  ]);

  const [formData, setFormData] = useState({
    companyId: '',
    planId: '',
    creditCard: {
      holderName: '',
      number: '',
      expiryMonth: '',
      expiryYear: '',
      ccv: ''
    },
    holderInfo: {
      name: '',
      email: '',
      cpfCnpj: '',
      postalCode: '',
      addressNumber: '',
      phone: ''
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Enviando dados de assinatura:', formData);

      const response = await apiRequest('POST', '/api/create-subscription', formData);
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Assinatura criada com sucesso!",
          description: `Plano: ${result.subscription.planName} - Primeira cobrança em: ${result.subscription.nextDueDate}`,
        });
        
        console.log('Assinatura criada:', result.subscription);
      } else {
        throw new Error(result.message || 'Erro ao criar assinatura');
      }
    } catch (error: any) {
      console.error('Erro na criação da assinatura:', error);
      toast({
        title: "Erro ao criar assinatura",
        description: error.message || 'Erro interno do servidor',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Teste de Assinatura - Asaas</h1>
        <p className="text-gray-600">
          Teste o fluxo completo de criação de assinatura com período gratuito
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>Informações básicas da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyId">ID da Empresa</Label>
              <Input
                id="companyId"
                value={formData.companyId}
                onChange={(e) => setFormData({...formData, companyId: e.target.value})}
                placeholder="1"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Seleção do Plano */}
        <Card>
          <CardHeader>
            <CardTitle>Escolha do Plano</CardTitle>
            <CardDescription>Selecione o plano de assinatura</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.planId === plan.id.toString() 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData({...formData, planId: plan.id.toString()})}
                >
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{plan.description}</p>
                  <p className="text-2xl font-bold text-green-600">R$ {plan.price.toFixed(2)}</p>
                  <p className="text-sm text-blue-600">{plan.freeDays} dias grátis</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dados do Cartão */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cartão de Crédito</CardTitle>
            <CardDescription>Informações para cobrança recorrente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="holderName">Nome no Cartão</Label>
              <Input
                id="holderName"
                value={formData.creditCard.holderName}
                onChange={(e) => setFormData({
                  ...formData,
                  creditCard: {...formData.creditCard, holderName: e.target.value}
                })}
                placeholder="João Silva"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cardNumber">Número do Cartão</Label>
                <Input
                  id="cardNumber"
                  value={formatCardNumber(formData.creditCard.number)}
                  onChange={(e) => setFormData({
                    ...formData,
                    creditCard: {...formData.creditCard, number: e.target.value.replace(/\D/g, '')}
                  })}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                />
              </div>

              <div>
                <Label htmlFor="ccv">CVV</Label>
                <Input
                  id="ccv"
                  value={formData.creditCard.ccv}
                  onChange={(e) => setFormData({
                    ...formData,
                    creditCard: {...formData.creditCard, ccv: e.target.value.replace(/\D/g, '')}
                  })}
                  placeholder="123"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryMonth">Mês</Label>
                <Select
                  value={formData.creditCard.expiryMonth}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    creditCard: {...formData.creditCard, expiryMonth: value}
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                        {month.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expiryYear">Ano</Label>
                <Select
                  value={formData.creditCard.expiryYear}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    creditCard: {...formData.creditCard, expiryYear: value}
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 10}, (_, i) => new Date().getFullYear() + i).map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados do Portador */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Portador do Cartão</CardTitle>
            <CardDescription>Informações pessoais para validação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="holderFullName">Nome Completo</Label>
                <Input
                  id="holderFullName"
                  value={formData.holderInfo.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    holderInfo: {...formData.holderInfo, name: e.target.value}
                  })}
                  placeholder="João Silva Santos"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.holderInfo.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    holderInfo: {...formData.holderInfo, email: e.target.value}
                  })}
                  placeholder="joao@exemplo.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formatCpf(formData.holderInfo.cpfCnpj)}
                  onChange={(e) => setFormData({
                    ...formData,
                    holderInfo: {...formData.holderInfo, cpfCnpj: e.target.value.replace(/\D/g, '')}
                  })}
                  placeholder="123.456.789-00"
                  maxLength={14}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.holderInfo.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    holderInfo: {...formData.holderInfo, phone: e.target.value.replace(/\D/g, '')}
                  })}
                  placeholder="11987654321"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postalCode">CEP</Label>
                <Input
                  id="postalCode"
                  value={formData.holderInfo.postalCode}
                  onChange={(e) => setFormData({
                    ...formData,
                    holderInfo: {...formData.holderInfo, postalCode: e.target.value.replace(/\D/g, '')}
                  })}
                  placeholder="01234567"
                  maxLength={8}
                  required
                />
              </div>

              <div>
                <Label htmlFor="addressNumber">Número</Label>
                <Input
                  id="addressNumber"
                  value={formData.holderInfo.addressNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    holderInfo: {...formData.holderInfo, addressNumber: e.target.value}
                  })}
                  placeholder="123"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Criando Assinatura...' : 'Criar Assinatura'}
        </Button>
      </form>
    </div>
  );
}