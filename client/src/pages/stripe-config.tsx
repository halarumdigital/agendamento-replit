import { useState, useEffect } from "react";
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
import { ExternalLink, Settings, CheckCircle, AlertCircle } from "lucide-react";

const stripePlanSchema = z.object({
  id: z.number(),
  stripePriceId: z.string().min(1, "ID do preço é obrigatório").startsWith("price_", "Deve começar com 'price_'"),
});

type StripePlanForm = z.infer<typeof stripePlanSchema>;

interface Plan {
  id: number;
  name: string;
  price: string;
  stripePriceId: string | null;
  isActive: boolean;
}

export default function StripeConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/admin/plans"],
  });

  const form = useForm<StripePlanForm>({
    resolver: zodResolver(stripePlanSchema),
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (data: { id: number; stripePriceId: string }) => {
      return apiRequest("PUT", `/api/admin/plans/${data.id}/stripe`, {
        stripePriceId: data.stripePriceId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Plano atualizado",
        description: "ID do Stripe configurado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setEditingPlan(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar plano",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    form.setValue("id", plan.id);
    form.setValue("stripePriceId", plan.stripePriceId || "");
  };

  const handleCancel = () => {
    setEditingPlan(null);
    form.reset();
  };

  const onSubmit = (data: StripePlanForm) => {
    updatePlanMutation.mutate({
      id: data.id,
      stripePriceId: data.stripePriceId,
    });
  };

  const getStatusBadge = (plan: Plan) => {
    if (!plan.isActive) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    if (plan.stripePriceId) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Configurado</Badge>;
    }
    return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Não configurado</Badge>;
  };

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
          <h1 className="text-3xl font-bold">Configuração Stripe</h1>
          <p className="text-muted-foreground">Configure os IDs dos planos do Stripe Dashboard</p>
        </div>
      </div>

      <Alert>
        <ExternalLink className="h-4 w-4" />
        <AlertDescription>
          <strong>Antes de configurar:</strong> Acesse o{" "}
          <a 
            href="https://dashboard.stripe.com/products" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            Stripe Dashboard
          </a>{" "}
          e crie os produtos/preços para cada plano. Copie os Price IDs (começam com "price_") e configure abaixo.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {plans?.map((plan) => (
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
                {plan.isActive && (
                  <Button
                    variant="outline"
                    onClick={() => handleEdit(plan)}
                    disabled={editingPlan?.id === plan.id}
                  >
                    {editingPlan?.id === plan.id ? "Editando..." : "Configurar"}
                  </Button>
                )}
              </div>
            </CardHeader>

            {editingPlan?.id === plan.id && (
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="stripePriceId">Price ID do Stripe</Label>
                    <Input
                      id="stripePriceId"
                      placeholder="price_1ABC123..."
                      {...form.register("stripePriceId")}
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

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={updatePlanMutation.isPending}
                    >
                      {updatePlanMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}

            {!editingPlan && plan.stripePriceId && (
              <CardContent>
                <div className="bg-muted p-3 rounded text-sm font-mono">
                  {plan.stripePriceId}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {plans?.every(plan => plan.stripePriceId || !plan.isActive) && (
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