import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function Subscription() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/public-plans"],
  });

  const { data: publicSettings } = useQuery<PublicSettings>({
    queryKey: ["/api/public-settings"],
  });

  const handleSubscribe = (planId: number) => {
    setSelectedPlan(planId);
    toast({
      title: "Redirecionando...",
      description: "Você será redirecionado para finalizar a assinatura.",
    });
    // TODO: Implementar integração com sistema de pagamento
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {publicSettings?.logoUrl ? (
                <img 
                  src={publicSettings.logoUrl} 
                  alt="Logo" 
                  className="h-12 w-auto"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">S</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {publicSettings?.systemName || "Sistema de Gestão"}
                </h1>
                <p className="text-gray-600">Escolha o plano ideal para seu negócio</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Planos de Assinatura
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Gerencie seu salão de beleza com nossa plataforma completa. 
            Escolha o plano que melhor atende às suas necessidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={selectedPlan === plan.id}
                  >
                    {selectedPlan === plan.id ? "Processando..." : "Assinar Plano"}
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

      {/* Footer */}
      <div className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>© 2024 {publicSettings?.systemName || "Sistema de Gestão"}. Todos os direitos reservados.</p>
            <p className="mt-2 text-sm">
              Dúvidas? Entre em contato conosco para mais informações sobre nossos planos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}