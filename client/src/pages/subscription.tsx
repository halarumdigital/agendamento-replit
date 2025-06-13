import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Crown, Star, Zap, ArrowLeft, Lock, Loader2 } from "lucide-react";
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
  const { company } = useCompanyAuth();

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/public-plans"],
  });

  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ["/api/public-settings"],
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (planId: number) => {
      return await apiRequest("POST", "/api/create-subscription", { planId });
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
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
    createSubscriptionMutation.mutate(plan.id);
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
                    R$ {parseFloat(plan.price).toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
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
                Plano {selectedPlan.name} - R$ {parseFloat(selectedPlan.price).toFixed(2)}/mês
              </CardDescription>
            </CardHeader>
            <CardContent>
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