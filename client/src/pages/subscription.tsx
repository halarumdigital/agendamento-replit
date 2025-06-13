import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Crown, Star, Zap, CreditCard, ArrowLeft, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { apiRequest } from "@/lib/queryClient";

interface Plan {
  id: number;
  name: string;
  freeDays: number;
  price: string;
  maxProfessionals: number;
  isActive: boolean;
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
}

interface PublicSettings {
  logoUrl: string | null;
  systemName: string | null;
}

const creditCardSchema = z.object({
  cardNumber: z.string().min(16, "Número do cartão deve ter 16 dígitos").max(19, "Número do cartão inválido"),
  cardName: z.string().min(2, "Nome do titular é obrigatório"),
  expiryMonth: z.string().min(1, "Mês é obrigatório"),
  expiryYear: z.string().min(1, "Ano é obrigatório"),
  cvv: z.string().min(3, "CVV deve ter 3 dígitos").max(4, "CVV inválido"),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(14, "CPF inválido"),
});

type CreditCardData = z.infer<typeof creditCardSchema>;

export default function Subscription() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { company } = useCompanyAuth();

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/public-plans"],
  });

  const creditCardForm = useForm<CreditCardData>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      cardNumber: "",
      cardName: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      cpf: "",
    },
  });

  const processPaymentMutation = useMutation({
    mutationFn: async (data: CreditCardData & { planId: number }) => {
      const response = await apiRequest("POST", "/api/subscriptions/process-payment", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pagamento Processado",
        description: "Sua assinatura foi ativada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company/plan-info"] });
      setShowPaymentForm(false);
      setSelectedPlan(null);
      creditCardForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro no Pagamento",
        description: error.message || "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = (data: CreditCardData) => {
    if (!selectedPlan) return;
    
    processPaymentMutation.mutate({
      ...data,
      planId: selectedPlan.id,
    });
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatCPF = (value: string) => {
    const cpf = value.replace(/\D/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const getPermissionsList = (permissions: Plan['permissions']) => {
    const permissionLabels: Record<keyof Plan['permissions'], string> = {
      dashboard: "Dashboard",
      appointments: "Agendamentos",
      services: "Serviços",
      professionals: "Profissionais",
      clients: "Clientes",
      reviews: "Avaliações",
      tasks: "Tarefas",
      pointsProgram: "Programa de Pontos",
      loyalty: "Fidelidade",
      inventory: "Inventário",
      messages: "Mensagens",
      coupons: "Cupons",
      financial: "Financeiro",
      reports: "Relatórios",
      settings: "Configurações"
    };

    return Object.entries(permissions)
      .filter(([_, enabled]) => enabled)
      .map(([key, _]) => permissionLabels[key as keyof Plan['permissions']]);
  };

  const getPlanIcon = (index: number) => {
    const icons = [Star, Zap, Crown];
    return icons[index % icons.length];
  };

  const getPlanColor = (index: number) => {
    const colors = ["border-blue-200", "border-purple-200", "border-yellow-200"];
    return colors[index % colors.length];
  };

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If payment form is shown, render payment interface
  if (showPaymentForm && selectedPlan) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => {
              setShowPaymentForm(false);
              setSelectedPlan(null);
              creditCardForm.reset();
            }}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Planos
          </Button>
          
          <div className="flex items-center space-x-3">
            <Lock className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Finalizar Assinatura
              </h1>
              <p className="text-gray-600">
                Complete os dados do cartão para ativar seu plano
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Resumo do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 text-lg">{selectedPlan.name}</h3>
                <p className="text-blue-700 text-sm mb-3">
                  Até {selectedPlan.maxProfessionals} {selectedPlan.maxProfessionals === 1 ? 'profissional' : 'profissionais'}
                </p>
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-blue-800">Valor mensal:</span>
                  <span className="font-bold text-blue-900">R$ {parseFloat(selectedPlan.price).toFixed(2)}</span>
                </div>
                
                {selectedPlan.freeDays > 0 && (
                  <div className="bg-green-100 p-2 rounded border border-green-300 mt-3">
                    <p className="text-green-800 text-sm font-medium">
                      🎁 {selectedPlan.freeDays} dias grátis para testar!
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Recursos inclusos:</h4>
                <div className="space-y-1">
                  {getPermissionsList(selectedPlan.permissions).slice(0, 8).map((feature) => (
                    <div key={feature} className="flex items-center text-sm">
                      <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />
              
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total mensal:</span>
                  <span className="font-bold text-lg">R$ {parseFloat(selectedPlan.price).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Dados do Cartão
              </CardTitle>
              <CardDescription>
                Insira os dados do seu cartão de crédito para completar a assinatura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...creditCardForm}>
                <form onSubmit={creditCardForm.handleSubmit(handlePaymentSubmit)} className="space-y-4">
                  <FormField
                    control={creditCardForm.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número do Cartão</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="1234 5678 9012 3456"
                            onChange={(e) => {
                              const formatted = formatCardNumber(e.target.value);
                              field.onChange(formatted);
                            }}
                            maxLength={19}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={creditCardForm.control}
                    name="cardName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Titular</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Nome conforme impresso no cartão"
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={creditCardForm.control}
                      name="expiryMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mês</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (
                                  <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                    {String(i + 1).padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={creditCardForm.control}
                      name="expiryYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ano</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="AAAA" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 10 }, (_, i) => {
                                  const year = new Date().getFullYear() + i;
                                  return (
                                    <SelectItem key={year} value={String(year)}>
                                      {year}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={creditCardForm.control}
                      name="cvv"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CVV</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="123"
                              maxLength={4}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={creditCardForm.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF do Titular</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="000.000.000-00"
                            onChange={(e) => {
                              const formatted = formatCPF(e.target.value);
                              field.onChange(formatted);
                            }}
                            maxLength={14}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Pagamento Seguro</span>
                    </div>
                    <p className="text-yellow-700 text-sm">
                      Seus dados são protegidos e criptografados. Não armazenamos informações do cartão.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full mt-6" 
                    size="lg"
                    disabled={processPaymentMutation.isPending}
                  >
                    {processPaymentMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Processando Pagamento...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Confirmar Pagamento - R$ {parseFloat(selectedPlan.price).toFixed(2)}
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default view - plans list
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <CreditCard className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Planos de Assinatura
            </h1>
            <p className="text-gray-600">
              Escolha o plano ideal para {company?.fantasyName || "sua empresa"}
            </p>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const Icon = getPlanIcon(index);
          const colorClass = getPlanColor(index);
          const permissionsList = getPermissionsList(plan.permissions);
          const isPopular = index === 1; // Middle plan is popular

          return (
            <Card key={plan.id} className={`relative ${colorClass} ${isPopular ? 'ring-2 ring-purple-500 shadow-lg scale-105' : 'hover:shadow-lg'} transition-all duration-300`}>
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-500 text-white px-4 py-1">
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  Até {plan.maxProfessionals} {plan.maxProfessionals === 1 ? 'profissional' : 'profissionais'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">
                    R$ {parseFloat(plan.price).toFixed(2)}
                  </div>
                  <div className="text-gray-500">por mês</div>
                  {plan.freeDays > 0 && (
                    <div className="text-sm text-green-600 font-medium mt-1">
                      {plan.freeDays} dias grátis
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Recursos inclusos:</h4>
                  <div className="space-y-2">
                    {permissionsList.slice(0, 6).map((feature) => (
                      <div key={feature} className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                    {permissionsList.length > 6 && (
                      <div className="text-sm text-gray-500">
                        + {permissionsList.length - 6} recursos adicionais
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={isPopular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan)}
                  disabled={processPaymentMutation.isPending}
                >
                  Assinar Plano
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            Nenhum plano disponível no momento.
          </div>
        </div>
      )}
    </div>
  );
}