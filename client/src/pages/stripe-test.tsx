import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/stripe-test`,
      },
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erro no pagamento",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Pagamento realizado",
        description: "Assinatura criada com sucesso!",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? "Processando..." : "Confirmar Pagamento"}
      </Button>
    </form>
  );
}

export default function StripeTest() {
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const { toast } = useToast();

  const plans = [
    { id: '1', name: 'Básico', price: 29.90, description: 'Para pequenos negócios' },
    { id: '2', name: 'Profissional', price: 59.90, description: 'Para empresas em crescimento' },
    { id: '3', name: 'Premium', price: 99.90, description: 'Para grandes empresas' },
  ];

  const handleCreateSubscription = async () => {
    if (!selectedPlan) {
      toast({
        title: "Erro",
        description: "Selecione um plano",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = await apiRequest('POST', '/api/create-subscription', {
        planId: selectedPlan
      });

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setStep('payment');
      } else {
        toast({
          title: "Assinatura criada",
          description: "Assinatura criada com sucesso!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar assinatura",
        variant: "destructive",
      });
    }
  };

  const handleTestPayment = async () => {
    try {
      const response = await apiRequest('POST', '/api/create-payment-intent', {
        amount: 50.00
      });

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setStep('payment');
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar pagamento",
        variant: "destructive",
      });
    }
  };

  if (!stripePromise) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Configuração do Stripe</CardTitle>
          </CardHeader>
          <CardContent>
            <p>A chave pública do Stripe não está configurada.</p>
            <p>Configure VITE_STRIPE_PUBLIC_KEY no arquivo .env</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Teste de Integração Stripe</h1>
      
      {step === 'form' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Teste de Pagamento Único</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Teste um pagamento único de R$ 50,00</p>
              <Button onClick={handleTestPayment}>
                Criar Pagamento de Teste
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teste de Assinatura</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="plan">Selecionar Plano</Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - R$ {plan.price}/mês - {plan.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={handleCreateSubscription} disabled={!selectedPlan}>
                  Criar Assinatura
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {step === 'payment' && clientSecret && (
        <Card>
          <CardHeader>
            <CardTitle>Finalizar Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe'
                }
              }}
            >
              <CheckoutForm />
            </Elements>
            <Button 
              variant="outline" 
              onClick={() => setStep('form')} 
              className="mt-4"
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Status da Configuração</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={stripePublicKey ? "text-green-600" : "text-red-600"}>
                {stripePublicKey ? "✓" : "✗"}
              </span>
              <span>Chave pública do Stripe</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}