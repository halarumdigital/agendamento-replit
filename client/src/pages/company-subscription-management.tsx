import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, CreditCard, Calendar, Users, ArrowUpRight, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
console.log('🔑 Stripe Public Key:', import.meta.env.VITE_STRIPE_PUBLIC_KEY);
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_dummy');

interface Plan {
  id: number;
  name: string;
  price: string;
  annualPrice?: string;
  maxProfessionals: number;
  permissions: {
    appointments: boolean;
    clients: boolean;
    services: boolean;
    professionals: boolean;
    messages: boolean;
    reports: boolean;
    coupons: boolean;
    financial: boolean;
    settings: boolean;
  };
}

interface SubscriptionStatus {
  isActive: boolean;
  status: string;
  planId: number;
  planName: string;
  planPrice: string;
  nextBillingDate?: string;
  trialEndsAt?: string;
  isOnTrial: boolean;
}

interface AvailablePlan {
  id: number;
  name: string;
  price: string;
  annualPrice?: string;
  maxProfessionals: number;
  isRecommended?: boolean;
}

// Payment Form Component
function PaymentForm({ 
  selectedPlan, 
  billingPeriod, 
  onSuccess, 
  onCancel 
}: {
  selectedPlan: AvailablePlan;
  billingPeriod: 'monthly' | 'annual';
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/obrigado`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Erro no Pagamento",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Pagamento Realizado",
          description: "Pagamento processado com sucesso!",
        });
        onSuccess();
      } else {
        toast({
          title: "Erro no Pagamento",
          description: "Não foi possível processar o pagamento",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro no Pagamento",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const price = billingPeriod === 'annual' && selectedPlan.annualPrice ? selectedPlan.annualPrice : selectedPlan.price;
  const priceLabel = billingPeriod === 'annual' ? 'ano' : 'mês';

  return (
    <div className="space-y-6">
      {/* Plan Summary */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold text-lg">{selectedPlan.name}</h3>
        <p className="text-2xl font-bold text-primary">R$ {price}</p>
        <p className="text-sm text-muted-foreground">por {priceLabel}</p>
        <div className="flex items-center gap-2 mt-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Até {selectedPlan.maxProfessionals} profissionais</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Complete o pagamento para ativar seu novo plano
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="min-h-[300px] border rounded p-4">
          {!stripe || !elements ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">
                  {!stripe ? 'Carregando Stripe...' : 'Carregando formulário de pagamento...'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                Debug: Stripe={stripe ? 'OK' : 'ERRO'}, Elements={elements ? 'OK' : 'ERRO'}
                <br />ClientSecret: {clientSecret ? 'OK' : 'ERRO'}
              </div>
              
              {clientSecret ? (
                <div className="payment-element-container" style={{ minHeight: '200px' }}>
                  <PaymentElement
                    options={{}}
                    onReady={() => {
                      console.log('✅ PaymentElement ready and mounted');
                    }}
                    onLoadError={(error) => {
                      console.error('❌ PaymentElement load error:', error);
                    }}
                    onChange={(event) => {
                      console.log('🔄 PaymentElement change:', event);
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Aguardando dados de pagamento...</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CompanySubscriptionManagement() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current subscription status
  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status']
  });

  // Fetch current plan details
  const { data: currentPlan } = useQuery<Plan>({
    queryKey: ['/api/company/plan-info'],
    enabled: !!subscriptionStatus?.planId
  });

  // Fetch available plans for upgrade
  const { data: availablePlans = [], isLoading: plansLoading } = useQuery<AvailablePlan[]>({
    queryKey: ['/api/plans']
  });

  // Upgrade subscription mutation
  const upgradeMutation = useMutation({
    mutationFn: async (data: { planId: number; billingPeriod: 'monthly' | 'annual' }) => {
      const response = await apiRequest('POST', '/api/subscription/upgrade', data);
      return response;
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowPayment(true);
      } else if (data.demoMode) {
        toast({
          title: "Modo Demonstração",
          description: data.message,
          variant: "default",
        });
      } else if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast({
          title: "Upgrade iniciado",
          description: "Redirecionando para pagamento...",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro no upgrade",
        description: error.message || "Erro ao iniciar upgrade da assinatura",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = () => {
    if (!selectedPlanId) return;
    
    upgradeMutation.mutate({
      planId: selectedPlanId,
      billingPeriod
    });
  };

  if (statusLoading || plansLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string, isOnTrial: boolean) => {
    if (isOnTrial) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Período de Teste</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ativo</Badge>;
      case 'past_due':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Em Atraso</Badge>;
      case 'canceled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Inativo</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Assinatura</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie sua assinatura atual
          </p>
        </div>
      </div>

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Assinatura Atual
          </CardTitle>
          <CardDescription>
            Informações sobre seu plano e status de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionStatus ? (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{subscriptionStatus.planName}</h3>
                  <p className="text-2xl font-bold text-primary">
                    R$ {subscriptionStatus.planPrice}/mês
                  </p>
                </div>
                {getStatusBadge(subscriptionStatus.status, subscriptionStatus.isOnTrial)}
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Status: {subscriptionStatus.isActive ? 'Ativo' : 'Inativo'}</span>
                </div>
                
                {subscriptionStatus.nextBillingDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">
                      Próxima cobrança: {new Date(subscriptionStatus.nextBillingDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}

                {subscriptionStatus.trialEndsAt && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">
                      Teste termina: {new Date(subscriptionStatus.trialEndsAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}

                {currentPlan && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">
                      Até {currentPlan.maxProfessionals} profissionais
                    </span>
                  </div>
                )}
              </div>

              {subscriptionStatus.isOnTrial && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Você está no período de teste gratuito. Após o término, será cobrado o valor do plano escolhido.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Nenhuma assinatura encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Você não possui uma assinatura ativa no momento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans for Upgrade */}
      {availablePlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              Planos Disponíveis para Upgrade
            </CardTitle>
            <CardDescription>
              Escolha um plano superior para desbloquear mais recursos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Billing Period Toggle */}
            <div className="flex items-center justify-center mb-6">
              <div className="bg-muted p-1 rounded-lg flex">
                <Button
                  variant={billingPeriod === 'monthly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBillingPeriod('monthly')}
                  className="rounded-md"
                >
                  Mensal
                </Button>
                <Button
                  variant={billingPeriod === 'annual' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBillingPeriod('annual')}
                  className="rounded-md"
                >
                  Anual
                  <Badge variant="secondary" className="ml-2 text-xs">
                    -15%
                  </Badge>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availablePlans.map((plan) => {
                const isCurrentPlan = subscriptionStatus?.planId === plan.id;
                const price = billingPeriod === 'annual' && plan.annualPrice ? plan.annualPrice : plan.price;
                const priceLabel = billingPeriod === 'annual' ? 'ano' : 'mês';
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`cursor-pointer transition-all ${
                      selectedPlanId === plan.id 
                        ? 'ring-2 ring-primary shadow-lg' 
                        : 'hover:shadow-md'
                    } ${isCurrentPlan ? 'opacity-50' : ''}`}
                    onClick={() => !isCurrentPlan && setSelectedPlanId(plan.id)}
                  >
                    <CardHeader className="text-center">
                      <CardTitle className="flex items-center justify-center gap-2">
                        {plan.name}
                        {plan.isRecommended && (
                          <Badge variant="secondary">Recomendado</Badge>
                        )}
                        {isCurrentPlan && (
                          <Badge variant="outline">Atual</Badge>
                        )}
                      </CardTitle>
                      <div className="space-y-1">
                        <p className="text-3xl font-bold">R$ {price}</p>
                        <p className="text-sm text-muted-foreground">por {priceLabel}</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Até {plan.maxProfessionals} profissionais</span>
                        </div>
                        {/* Add more plan features here if needed */}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selectedPlanId && selectedPlanId !== subscriptionStatus?.planId && !showPayment && (
              <div className="mt-6 text-center">
                <Button 
                  onClick={handleUpgrade}
                  disabled={upgradeMutation.isPending}
                  size="lg"
                  className="w-full md:w-auto"
                >
                  {upgradeMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Fazer Upgrade
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Modal */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Finalizar Pagamento
            </DialogTitle>
          </DialogHeader>
          
          {clientSecret && selectedPlanId && (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#8b5cf6',
                  }
                }
              }}
            >
              <PaymentForm
                selectedPlan={availablePlans.find(p => p.id === selectedPlanId)!}
                billingPeriod={billingPeriod}
                onSuccess={() => {
                  setShowPayment(false);
                  setClientSecret(null);
                  setSelectedPlanId(null);
                  queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
                }}
                onCancel={() => {
                  setShowPayment(false);
                  setClientSecret(null);
                }}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}