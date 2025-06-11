import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Gift, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertLoyaltyCampaignSchema } from "@shared/schema";
import type { LoyaltyCampaign, Service } from "@shared/schema";

const formSchema = insertLoyaltyCampaignSchema.omit({
  companyId: true,
}).extend({
  conditionType: z.enum(["services", "amount"]),
  rewardType: z.enum(["service", "discount"]),
});

type FormData = z.infer<typeof formSchema>;

export default function CompanyLoyalty() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<LoyaltyCampaign | null>(null);
  const { toast } = useToast();

  // Queries
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery<LoyaltyCampaign[]>({
    queryKey: ["/api/loyalty-campaigns"],
  });

  const { data: services = [], isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ["/api/company/services"],
  });

  const { data: rewardsHistory = [], isLoading: isLoadingHistory } = useQuery<any[]>({
    queryKey: ["/api/loyalty-rewards-history"],
  });

  // Form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      conditionType: "services",
      conditionValue: 1,
      rewardType: "discount",
      rewardValue: 10,
      rewardServiceId: undefined,
      active: true,
    },
  });

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("/api/loyalty-campaigns", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty-campaigns"] });
      setIsModalOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Campanha de fidelidade criada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar campanha de fidelidade.",
        variant: "destructive",
      });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FormData> }) =>
      apiRequest(`/api/loyalty-campaigns/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty-campaigns"] });
      setIsModalOpen(false);
      setEditingCampaign(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Campanha atualizada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar campanha.",
        variant: "destructive",
      });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/loyalty-campaigns/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty-campaigns"] });
      toast({
        title: "Sucesso",
        description: "Campanha excluída com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir campanha.",
        variant: "destructive",
      });
    },
  });

  const toggleCampaignMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiRequest(`/api/loyalty-campaigns/${id}/toggle`, "PATCH", { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty-campaigns"] });
      toast({
        title: "Sucesso",
        description: "Status da campanha atualizado!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da campanha.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormData) => {
    if (editingCampaign) {
      updateCampaignMutation.mutate({ id: editingCampaign.id, data });
    } else {
      createCampaignMutation.mutate(data);
    }
  };

  const handleEdit = (campaign: LoyaltyCampaign) => {
    setEditingCampaign(campaign);
    form.reset({
      name: campaign.name,
      conditionType: campaign.conditionType as "services" | "amount",
      conditionValue: campaign.conditionValue,
      rewardType: campaign.rewardType as "service" | "discount",
      rewardValue: campaign.rewardValue,
      rewardServiceId: campaign.rewardServiceId || undefined,
      active: campaign.active || false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta campanha?")) {
      deleteCampaignMutation.mutate(id);
    }
  };

  const handleToggle = (id: number, active: boolean) => {
    toggleCampaignMutation.mutate({ id, active: !active });
  };

  const getRewardText = (campaign: LoyaltyCampaign) => {
    if (campaign.rewardType === "service") {
      const service = services.find(s => s.id === campaign.rewardServiceId);
      return service ? `Serviço: ${service.name}` : "Serviço não encontrado";
    }
    return `Desconto: ${campaign.rewardValue}%`;
  };

  const getConditionText = (campaign: LoyaltyCampaign) => {
    if (campaign.conditionType === "services") {
      return `${campaign.conditionValue || 0} serviços`;
    }
    return `R$ ${(campaign.conditionValue || 0).toFixed(2)}`;
  };

  if (isLoadingCampaigns || isLoadingServices) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programa de Fidelidade</h1>
          <p className="text-muted-foreground">
            Crie campanhas de fidelidade para recompensar seus clientes mais fiéis
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCampaign(null);
              form.reset();
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCampaign ? "Editar Campanha" : "Nova Campanha de Fidelidade"}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Campanha</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 10 cortes = 1 grátis" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conditionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Condição</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="services">Quantidade de Serviços</SelectItem>
                          <SelectItem value="amount">Valor Gasto</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conditionValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("conditionType") === "services" ? "Quantidade de Serviços" : "Valor em R$"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder={form.watch("conditionType") === "services" ? "10" : "500"}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rewardType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Recompensa</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a recompensa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="service">Serviço Grátis</SelectItem>
                          <SelectItem value="discount">Desconto Percentual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("rewardType") === "service" && (
                  <FormField
                    control={form.control}
                    name="rewardServiceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serviço de Recompensa</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o serviço" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingServices ? (
                              <SelectItem value="loading" disabled>Carregando serviços...</SelectItem>
                            ) : services.length === 0 ? (
                              <SelectItem value="empty" disabled>Nenhum serviço encontrado</SelectItem>
                            ) : (
                              services.map((service) => (
                                <SelectItem key={service.id} value={service.id.toString()}>
                                  {service.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("rewardType") === "discount" && (
                  <FormField
                    control={form.control}
                    name="rewardValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentual de Desconto (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="10"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Campanha Ativa</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          A campanha estará disponível para os clientes
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
                  >
                    {editingCampaign ? "Atualizar" : "Criar"} Campanha
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.filter(c => c.active).length}</div>
            <p className="text-xs text-muted-foreground">
              de {campaigns.length} campanhas totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recompensas Entregues</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rewardsHistory.length}</div>
            <p className="text-xs text-muted-foreground">
              recompensas utilizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.length > 0 ? Math.round((rewardsHistory.length / campaigns.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              efetividade das campanhas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas de Fidelidade</CardTitle>
          <CardDescription>
            Gerencie suas campanhas de fidelidade e acompanhe o engajamento dos clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma campanha</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece criando sua primeira campanha de fidelidade.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{campaign.name}</h3>
                      <Badge variant={campaign.active ? "default" : "secondary"}>
                        {campaign.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span>Condição: {getConditionText(campaign)}</span>
                      <span className="mx-2">•</span>
                      <span>Recompensa: {getRewardText(campaign)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={campaign.active || false}
                      onCheckedChange={() => handleToggle(campaign.id, campaign.active || false)}
                      disabled={toggleCampaignMutation.isPending}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(campaign)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(campaign.id)}
                      disabled={deleteCampaignMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}