import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, TestTube, Clock, CreditCard } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Company {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  plan_status: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

export default function AdminSubscriptionTest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ["/api/admin/companies"],
  });

  const simulateFailureMutation = useMutation({
    mutationFn: async (companyId: number) => {
      return await apiRequest("POST", "/api/test/simulate-payment-failure", {
        companyId,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Falha Simulada",
        description: "Assinatura suspensa com sucesso",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao simular falha de pagamento",
        variant: "destructive",
      });
    },
  });

  const simulateSuccessMutation = useMutation({
    mutationFn: async (companyId: number) => {
      return await apiRequest("POST", "/api/test/simulate-payment-success", {
        companyId,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso Simulado",
        description: "Assinatura reativada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao simular sucesso de pagamento",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (company: Company) => {
    if (!company.is_active || company.plan_status === "suspended") {
      return "destructive";
    }
    return "default";
  };

  const getStatusText = (company: Company) => {
    if (!company.is_active) {
      return "Inativa";
    }
    if (company.plan_status === "suspended") {
      return "Suspensa";
    }
    return "Ativa";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <TestTube className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teste de Assinaturas</h1>
          <p className="text-muted-foreground">
            Simule falhas e sucessos de pagamento para testar o sistema de bloqueio
          </p>
        </div>
      </div>

      {/* Instruções */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <AlertTriangle className="h-5 w-5" />
            <span>Como Testar</span>
          </CardTitle>
          <CardDescription className="text-blue-700">
            Use os botões abaixo para simular problemas e sucessos de pagamento. Depois teste o login das empresas para verificar o bloqueio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <p><strong>1.</strong> Clique em "Simular Falha" para bloquear uma empresa</p>
          <p><strong>2.</strong> Teste o login da empresa - deve mostrar tela de bloqueio</p>
          <p><strong>3.</strong> Clique em "Simular Sucesso" para restaurar o acesso</p>
          <p><strong>4.</strong> Teste novamente o login - deve funcionar normalmente</p>
        </CardContent>
      </Card>

      {/* Lista de Empresas para Teste */}
      <div className="grid gap-4">
        <h2 className="text-xl font-semibold">Empresas Disponíveis para Teste</h2>
        
        {companies?.map((company) => (
          <Card key={company.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <CardDescription className="flex items-center space-x-2">
                    <span>{company.email}</span>
                    <Badge variant={getStatusColor(company)}>
                      {getStatusText(company)}
                    </Badge>
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {company.stripe_subscription_id && (
                    <Badge variant="outline" className="text-xs">
                      <CreditCard className="h-3 w-3 mr-1" />
                      Stripe
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => simulateFailureMutation.mutate(company.id)}
                  disabled={simulateFailureMutation.isPending}
                  className="flex items-center space-x-1"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Simular Falha</span>
                  {simulateFailureMutation.isPending && (
                    <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full ml-1" />
                  )}
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => simulateSuccessMutation.mutate(company.id)}
                  disabled={simulateSuccessMutation.isPending}
                  className="flex items-center space-x-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Simular Sucesso</span>
                  {simulateSuccessMutation.isPending && (
                    <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full ml-1" />
                  )}
                </Button>
              </div>
              
              {/* Status Details */}
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <div>ID: {company.id}</div>
                <div>Status do Plano: {company.plan_status || "N/A"}</div>
                {company.stripe_customer_id && (
                  <div>Customer ID: {company.stripe_customer_id}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer com informações */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-2 text-yellow-800">
            <Clock className="h-5 w-5 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Dica de Teste</p>
              <p className="text-sm">
                Para testar completamente o sistema, faça logout do painel administrativo e tente fazer login 
                com as credenciais da empresa que teve o pagamento "falhado". O sistema deve bloquear o acesso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}