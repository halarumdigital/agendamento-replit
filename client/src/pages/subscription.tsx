import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Crown, Star, Zap, ArrowLeft, Lock, Loader2, AlertCircle, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { apiRequest } from "@/lib/queryClient";

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

interface Plan {
  id: number;
  name: string;
  freeDays: number;
  price: string;
  annualPrice: string | null;
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

// Demo Payment Form Component for when Stripe is not configured
function DemoPaymentForm({ onSuccess, planName }: { onSuccess: () => void; planName: string }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <div>
            <h3 className="font-medium text-yellow-800">Modo Demonstração</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Configure as chaves Stripe para processar pagamentos reais
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h3 className="font-medium text-gray-900 mb-2">Configuração de Cartão (Demo)</h3>
          <p className="text-sm text-gray-600">
            Em modo real, aqui apareceria o formulário seguro do Stripe
          </p>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Simulando configuração...
            </>
          ) : (
            `Simular Assinatura do ${planName}`
          )}
        </Button>
      </form>
    </div>
  );
}

// Stripe Payment Form Component
function PaymentForm({ onSuccess, onError }: { onSuccess: () => void; onError: (error: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/company/dashboard',
      },
    });

    setLoading(false);

    if (error) {
      onError(error.message || 'Erro no pagamento');
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          "Confirmar Pagamento"
        )}
      </Button>
    </form>
  );
}

export default function Subscription() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [step, setStep] = useState<'plans' | 'payment'>('plans');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isAnnual, setIsAnnual] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const { company } = useCompanyAuth();

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/public-plans"],
  });

  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ["/api/public-settings"],
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ planId, isAnnual }: { planId: number; isAnnual: boolean }) => {
      return await apiRequest("POST", "/api/create-subscription", { planId, isAnnual });
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setDemoMode(!!data.demoMode);
        setStep('payment');
      } else {
        toast({
          title: "Assinatura criada",
          description: "Sua assinatura foi ativada com sucesso!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/company/plan-info"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a assinatura. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    createSubscriptionMutation.mutate({ planId: plan.id, isAnnual });
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "Pagamento confirmado",
      description: "Sua assinatura foi ativada com sucesso!",
    });
    queryClient.invalidateQueries({ queryKey: ["/api/company/plan-info"] });
    setStep('plans');
    setSelectedPlan(null);
    setClientSecret('');
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Erro no pagamento",
      description: error,
      variant: "destructive",
    });
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('básico')) return Star;
    if (planName.toLowerCase().includes('profissional')) return Zap;
    if (planName.toLowerCase().includes('premium')) return Crown;
    return Star;
  };

  const getPlanVariant = (planName: string) => {
    if (planName.toLowerCase().includes('básico')) return 'default';
    if (planName.toLowerCase().includes('profissional')) return 'secondary';
    if (planName.toLowerCase().includes('premium')) return 'default';
    return 'default';
  };

  if (plansLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          Escolha seu plano no {settings?.systemName || "Sistema"}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Selecione o plano ideal para o seu negócio e comece a usar todas as funcionalidades
        </p>
      </div>

      {step === 'plans' && (
        <>
          {/* Toggle para plano mensal/anual */}
          <div className="flex justify-center mb-8">
            <div className="bg-muted p-1 rounded-lg">
              <Button
                variant={!isAnnual ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsAnnual(false)}
                className="px-4"
              >
                Mensal
              </Button>
              <Button
                variant={isAnnual ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsAnnual(true)}
                className="px-4"
              >
                Anual
                <Badge variant="secondary" className="ml-2 text-xs">
                  -20%
                </Badge>
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const IconComponent = getPlanIcon(plan.name);
              const isPopular = plan.name.toLowerCase().includes('profissional');
            
            return (
              <Card key={plan.id} className={`relative ${isPopular ? 'ring-2 ring-primary' : ''}`}>
                {isPopular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    {isAnnual && plan.annualPrice ? (
                      <>
                        R$ {(parseFloat(plan.annualPrice) / 12).toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground">/mês</span>
                        <div className="text-sm text-green-600 font-normal">
                          Cobrado anualmente: R$ {parseFloat(plan.annualPrice).toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <>
                        R$ {parseFloat(plan.price).toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground">/mês</span>
                      </>
                    )}
                  </div>
                  {plan.freeDays > 0 && (
                    <CardDescription>
                      {plan.freeDays} dias grátis para testar
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Até {plan.maxProfessionals} profissionais</span>
                    </div>
                    {Object.entries(plan.permissions).map(([key, enabled]) => {
                      if (!enabled) return null;
                      
                      const featureNames: Record<string, string> = {
                        dashboard: "Dashboard completo",
                        appointments: "Agendamentos",
                        services: "Gestão de serviços",
                        professionals: "Gestão de profissionais",
                        clients: "Gestão de clientes",
                        reviews: "Sistema de avaliações",
                        tasks: "Gestão de tarefas",
                        pointsProgram: "Programa de pontos",
                        loyalty: "Programa de fidelidade",
                        inventory: "Controle de estoque",
                        messages: "Sistema de mensagens",
                        coupons: "Gestão de cupons",
                        financial: "Gestão financeira",
                        reports: "Relatórios avançados",
                        settings: "Configurações"
                      };
                      
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-sm">{featureNames[key]}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={getPlanVariant(plan.name) as any}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={createSubscriptionMutation.isPending}
                  >
                    {createSubscriptionMutation.isPending && selectedPlan?.id === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Assinar Plano"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
          </div>
        </>
      )}

      {step === 'payment' && clientSecret && selectedPlan && (
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('plans')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </div>
              <CardTitle>Finalizar Pagamento</CardTitle>
              <CardDescription>
                Plano {selectedPlan.name} - {isAnnual && selectedPlan.annualPrice ? (
                  <>R$ {(parseFloat(selectedPlan.annualPrice) / 12).toFixed(2)}/mês (cobrado anualmente)</>
                ) : (
                  <>R$ {parseFloat(selectedPlan.price).toFixed(2)}/mês</>
                )}
              </CardDescription>
            </CardHeader>
            
            {/* Resumo do Plano */}
            <div className="px-6 pb-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="text-center">
                  <h3 className="font-medium text-lg text-gray-900">{selectedPlan.name}</h3>
                  <div className="mt-2">
                    {isAnnual && selectedPlan.annualPrice ? (
                      <>
                        <div className="text-3xl font-bold text-gray-900">
                          R$ {parseFloat(selectedPlan.annualPrice).toFixed(2)}
                          <span className="text-base font-normal text-gray-600">/ano</span>
                        </div>
                        <div className="text-sm text-green-600 font-medium">
                          Cobrado anualmente: R$ {parseFloat(selectedPlan.annualPrice).toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-gray-900">
                          R$ {parseFloat(selectedPlan.price).toFixed(2)}
                          <span className="text-base font-normal text-gray-600">/mês</span>
                        </div>
                        <div className="text-sm text-green-600 font-medium">
                          Cobrado mensalmente: R$ {parseFloat(selectedPlan.price).toFixed(2)}
                        </div>
                      </>
                    )}
                  </div>
                  {selectedPlan.freeDays > 0 && (
                    <div className="mt-2 text-sm text-blue-600 font-medium">
                      {selectedPlan.freeDays} dias grátis para testar
                    </div>
                  )}
                </div>

                {/* Opções de Parcelamento */}
                {!isAnnual && (
                  <div className="border-t pt-3 mt-3">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Opções de parcelamento:</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>1x sem juros</span>
                        <span className="font-medium">R$ {parseFloat(selectedPlan.price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>2x sem juros</span>
                        <span className="font-medium">R$ {(parseFloat(selectedPlan.price) / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>3x sem juros</span>
                        <span className="font-medium">R$ {(parseFloat(selectedPlan.price) / 3).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <CardContent>
              {demoMode ? (
                <DemoPaymentForm 
                  onSuccess={handlePaymentSuccess}
                  planName={selectedPlan.name}
                />
              ) : (
                <Elements 
                  stripe={stripePromise} 
                  options={{ 
                    clientSecret,
                    appearance: { theme: 'stripe' }
                  }}
                >
                  <PaymentForm 
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Pagamento seguro processado pelo Stripe</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}