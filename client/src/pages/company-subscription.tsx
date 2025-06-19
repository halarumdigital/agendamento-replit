import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { CreditCard, CheckCircle, AlertCircle, ArrowLeft, Crown, Zap } from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  stripePriceId: string;
  features: string[];
  popular?: boolean;
}

const CheckoutForm = ({ selectedPlan }: { selectedPlan: Plan }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast({
          title: "Erro no Pagamento",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Pagamento Processado",
          description: "Sua assinatura está sendo ativada!",
        });
        setLocation("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Finalizar Assinatura - {selectedPlan.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">{selectedPlan.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">{selectedPlan.description}</p>
            <p className="text-2xl font-bold">R$ {selectedPlan.price.toFixed(2)}/mês</p>
          </div>
          
          <PaymentElement />
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? "Processando..." : `Assinar por R$ ${selectedPlan.price.toFixed(2)}/mês`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function CompanySubscription() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [clientSecret, setClientSecret] = useState("");

  // Buscar planos disponíveis
  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/public/plans"],
    retry: false,
  });

  // Mutation para criar assinatura
  const createSubscriptionMutation = useMutation({
    mutationFn: async (planId: number) => {
      return await apiRequest("POST", "/api/company/create-subscription", {
        planId,
      });
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar assinatura",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    createSubscriptionMutation.mutate(plan.id);
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (selectedPlan && clientSecret) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => {
              setSelectedPlan(null);
              setClientSecret("");
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Planos
          </Button>
          
          {stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm selectedPlan={selectedPlan} />
            </Elements>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Stripe não está configurado. Configure VITE_STRIPE_PUBLIC_KEY para processar pagamentos.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Escolha seu Plano
              </h1>
              <p className="text-gray-600 mt-2">
                Desbloqueie todo o potencial do seu negócio
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Login
            </Button>
          </div>
        </div>
      </div>

      {/* Subscription Alert */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Assinatura Suspensa:</strong> Para continuar usando nossa plataforma, 
            escolha um plano e complete o pagamento. Sua conta será reativada imediatamente.
          </AlertDescription>
        </Alert>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans?.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    <Crown className="w-3 h-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  {plan.name}
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ {parseFloat(String(plan.price)).toFixed(2)}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.description}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features?.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={createSubscriptionMutation.isPending}
                >
                  {createSubscriptionMutation.isPending ? "Processando..." : "Escolher Plano"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-sm text-gray-600">
            Todos os planos incluem suporte técnico e atualizações gratuitas.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Cancele a qualquer momento. Sem taxa de cancelamento.
          </p>
        </div>
      </div>
    </div>
  );
}