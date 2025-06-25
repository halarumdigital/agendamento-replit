import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ExternalLink, Settings, CheckCircle, AlertCircle, Edit, Save, X } from "lucide-react";

const planFormSchema = z.object({
  stripePriceId: z.string()
    .min(1, "Price ID é obrigatório")
    .startsWith("price_", "Deve começar com 'price_'"),
});

type PlanFormData = z.infer<typeof planFormSchema>;

interface Plan {
  id: number;
  name: string;
  price: string;
  stripePriceId: string | null;
  stripeProductId: string | null;
  isActive: boolean;
}

export default function AdminStripePlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/admin/plans"],
  });

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (data: { id: number; stripePriceId: string }) => {
      return apiRequest(`/api/admin/plans/${data.id}/stripe`, "PUT", {
        stripePriceId: data.stripePriceId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Plano atualizado",
        description: "ID do Stripe configurado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setEditingPlanId(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar plano",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (plan: Plan) => {
    setEditingPlanId(plan.id);
    form.setValue("stripePriceId", plan.stripePriceId || "");
  };

  const handleCancel = () => {
    setEditingPlanId(null);
    form.reset();
  };

  const onSubmit = (data: PlanFormData) => {
    if (editingPlanId) {
      updatePlanMutation.mutate({
        id: editingPlanId,
        stripePriceId: data.stripePriceId,
      });
    }
  };

  const getStatusBadge = (plan: Plan) => {
    if (!plan.isActive) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    if (plan.stripePriceId) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Configurado
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertCircle className="w-3 h-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  const configuredPlans = plans?.filter(plan => plan.isActive && plan.stripePriceId) || [];
  const pendingPlans = plans?.filter(plan => plan.isActive && !plan.stripePriceId) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">Configuração Stripe - Planos</h1>
          <p className="text-muted-foreground">
            Configure os Price IDs do Stripe Dashboard para cada plano
          </p>
        </div>
      </div>

      <Alert>
        <ExternalLink className="h-4 w-4" />
        <AlertDescription>
          <strong>Passo a passo:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Acesse o <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Stripe Dashboard</a></li>
            <li>Crie produtos e preços para cada plano</li>
            <li>Copie os Price IDs (começam com "price_")</li>
            <li>Configure abaixo para cada plano</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Planos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans?.filter(p => p.isActive).length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Configurados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{configuredPlans.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{pendingPlans.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Configuration */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Planos Ativos</h2>
        {plans?.filter(plan => plan.isActive).map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {getStatusBadge(plan)}
                  </CardTitle>
                  <CardDescription>
                    Preço: R$ {plan.price} | ID: {plan.id}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {editingPlanId === plan.id ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={updatePlanMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {updatePlanMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(plan)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {plan.stripePriceId ? "Editar" : "Configurar"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {editingPlanId === plan.id && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="stripePriceId">Price ID do Stripe</Label>
                    <Input
                      id="stripePriceId"
                      placeholder="price_1ABC123DEF456..."
                      {...form.register("stripePriceId")}
                      className="font-mono"
                    />
                    {form.formState.errors.stripePriceId && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.stripePriceId.message}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Encontre este ID no Stripe Dashboard → Produtos → {plan.name} → Preços
                    </p>
                  </div>
                </div>
              </CardContent>
            )}

            {editingPlanId !== plan.id && plan.stripePriceId && (
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Price ID Configurado:</Label>
                  <div className="bg-muted p-3 rounded text-sm font-mono break-all">
                    {plan.stripePriceId}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Inactive Plans */}
      {plans?.filter(plan => !plan.isActive).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-muted-foreground">Planos Inativos</h2>
          {plans?.filter(plan => !plan.isActive).map((plan) => (
            <Card key={plan.id} className="opacity-60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {getStatusBadge(plan)}
                    </CardTitle>
                    <CardDescription>
                      Preço: R$ {plan.price} | ID: {plan.id}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Success Message */}
      {configuredPlans.length > 0 && pendingPlans.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Configuração completa!</strong> Todos os planos ativos possuem Price IDs configurados. 
            O sistema está pronto para processar assinaturas com Stripe.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}