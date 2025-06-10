import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Star, Gift } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ClientWithPoints {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  totalPoints: number;
}

interface PointsCampaign {
  id: number;
  name: string;
  requiredPoints: number;
  rewardServiceId: number;
  rewardService: {
    name: string;
    price: string;
  };
  active: boolean;
}

interface Service {
  id: number;
  name: string;
  price: string;
}

const editPointsSchema = z.object({
  pointsChange: z.number().min(-9999).max(9999),
  description: z.string().min(1, "Descrição é obrigatória"),
});

const campaignSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  requiredPoints: z.number().min(1, "Pontos necessários deve ser maior que 0"),
  rewardServiceId: z.number().min(1, "Serviço de recompensa é obrigatório"),
});

type EditPointsFormData = z.infer<typeof editPointsSchema>;
type CampaignFormData = z.infer<typeof campaignSchema>;

export default function CompanyPointsProgram() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditPointsDialogOpen, setIsEditPointsDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithPoints | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<PointsCampaign | null>(null);

  const editPointsForm = useForm<EditPointsFormData>({
    resolver: zodResolver(editPointsSchema),
    defaultValues: {
      pointsChange: 0,
      description: "",
    },
  });

  const campaignForm = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      requiredPoints: 0,
      rewardServiceId: 0,
    },
  });

  // Queries
  const { data: clientsWithPoints = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/company/client-points'],
  });

  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['/api/company/points-campaigns'],
  });

  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['/api/company/services'],
  });

  // Mutations
  const updatePointsMutation = useMutation({
    mutationFn: async (data: { clientId: number; pointsChange: number; description: string }) => {
      return await apiRequest('PATCH', `/api/company/client-points/${data.clientId}`, {
        pointsChange: data.pointsChange,
        description: data.description,
      });
    },
    onSuccess: () => {
      toast({
        title: "Pontos atualizados",
        description: "Os pontos do cliente foram atualizados com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/company/client-points'] });
      setIsEditPointsDialogOpen(false);
      editPointsForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar os pontos.",
        variant: "destructive",
      });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      return await apiRequest('POST', '/api/company/points-campaigns', data);
    },
    onSuccess: () => {
      toast({
        title: "Campanha criada",
        description: "A campanha foi criada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/company/points-campaigns'] });
      setIsCampaignDialogOpen(false);
      campaignForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a campanha.",
        variant: "destructive",
      });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      return await apiRequest('PUT', `/api/company/points-campaigns/${editingCampaign?.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Campanha atualizada",
        description: "A campanha foi atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/company/points-campaigns'] });
      setIsCampaignDialogOpen(false);
      setEditingCampaign(null);
      campaignForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar a campanha.",
        variant: "destructive",
      });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/company/points-campaigns/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Campanha excluída",
        description: "A campanha foi excluída com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/company/points-campaigns'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir a campanha.",
        variant: "destructive",
      });
    },
  });

  const handleEditPoints = (client: ClientWithPoints) => {
    setSelectedClient(client);
    editPointsForm.reset({
      pointsChange: 0,
      description: "",
    });
    setIsEditPointsDialogOpen(true);
  };

  const handleEditCampaign = (campaign: PointsCampaign) => {
    setEditingCampaign(campaign);
    campaignForm.reset({
      name: campaign.name,
      requiredPoints: campaign.requiredPoints,
      rewardServiceId: campaign.rewardServiceId,
    });
    setIsCampaignDialogOpen(true);
  };

  const openCreateCampaignDialog = () => {
    setEditingCampaign(null);
    campaignForm.reset({
      name: "",
      requiredPoints: 0,
      rewardServiceId: 0,
    });
    setIsCampaignDialogOpen(true);
  };

  const onSubmitEditPoints = (data: EditPointsFormData) => {
    if (!selectedClient) return;
    
    updatePointsMutation.mutate({
      clientId: selectedClient.id,
      pointsChange: data.pointsChange,
      description: data.description,
    });
  };

  const onSubmitCampaign = (data: CampaignFormData) => {
    if (editingCampaign) {
      updateCampaignMutation.mutate(data);
    } else {
      createCampaignMutation.mutate(data);
    }
  };

  const handleDeleteCampaign = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta campanha?")) {
      deleteCampaignMutation.mutate(id);
    }
  };

  if (isLoadingClients || isLoadingCampaigns || isLoadingServices) {
    return (
      <div className="p-6">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Programa de Pontos</h1>
          <p className="text-gray-600">Gerencie os pontos dos clientes e campanhas de fidelidade</p>
        </div>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clients">Pontos dos Clientes</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientsWithPoints.map((client: ClientWithPoints) => (
              <Card key={client.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {client.totalPoints} pontos
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {client.phone && (
                      <p className="text-sm text-gray-600">📱 {client.phone}</p>
                    )}
                    {client.email && (
                      <p className="text-sm text-gray-600">✉️ {client.email}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPoints(client)}
                    className="w-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Pontos
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {clientsWithPoints.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum cliente com pontos
                </h3>
                <p className="text-gray-600 text-center">
                  Os pontos são acumulados automaticamente quando os clientes utilizam serviços.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateCampaignDialog} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign: PointsCampaign) => (
              <Card key={campaign.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <Badge 
                      className={
                        campaign.active 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {campaign.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600">
                      <Gift className="h-4 w-4 inline mr-1" />
                      Pontos necessários: {campaign.requiredPoints}
                    </p>
                    <p className="text-sm text-gray-600">
                      🎁 Recompensa: {campaign.rewardService.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      💰 Valor: R$ {Number(campaign.rewardService.price).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCampaign(campaign)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="flex-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {campaigns.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Gift className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma campanha criada
                </h3>
                <p className="text-gray-600 text-center mb-4">
                  Crie campanhas para recompensar seus clientes mais fiéis.
                </p>
                <Button onClick={openCreateCampaignDialog} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Campanha
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para editar pontos */}
      <Dialog open={isEditPointsDialogOpen} onOpenChange={setIsEditPointsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Pontos - {selectedClient?.name}</DialogTitle>
            <DialogDescription>
              Adicione ou remova pontos do cliente. Use valores negativos para retirar pontos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editPointsForm.handleSubmit(onSubmitEditPoints)}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="current-points">Pontos Atuais</Label>
                <Input
                  id="current-points"
                  value={selectedClient?.totalPoints || 0}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="points-change">Alterar Pontos</Label>
                <Input
                  id="points-change"
                  type="number"
                  placeholder="Ex: 100 ou -50"
                  {...editPointsForm.register('pointsChange', { valueAsNumber: true })}
                />
                {editPointsForm.formState.errors.pointsChange && (
                  <p className="text-sm text-red-500">
                    {editPointsForm.formState.errors.pointsChange.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  placeholder="Ex: Ajuste manual, promoção especial..."
                  {...editPointsForm.register('description')}
                />
                {editPointsForm.formState.errors.description && (
                  <p className="text-sm text-red-500">
                    {editPointsForm.formState.errors.description.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditPointsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updatePointsMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Salvar Alteração
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar/editar campanha */}
      <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
            </DialogTitle>
            <DialogDescription>
              {editingCampaign 
                ? 'Edite as informações da campanha de pontos.' 
                : 'Crie uma nova campanha de pontos para recompensar seus clientes.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={campaignForm.handleSubmit(onSubmitCampaign)}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Nome da Campanha</Label>
                <Input
                  id="campaign-name"
                  placeholder="Ex: Cliente VIP, Promoção de Verão..."
                  {...campaignForm.register('name')}
                />
                {campaignForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {campaignForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="required-points">Pontos Necessários</Label>
                <Input
                  id="required-points"
                  type="number"
                  min="1"
                  placeholder="Ex: 100"
                  {...campaignForm.register('requiredPoints', { valueAsNumber: true })}
                />
                {campaignForm.formState.errors.requiredPoints && (
                  <p className="text-sm text-red-500">
                    {campaignForm.formState.errors.requiredPoints.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward-service">Serviço de Recompensa</Label>
                <Select
                  value={campaignForm.watch('rewardServiceId')?.toString() || ""}
                  onValueChange={(value) => campaignForm.setValue('rewardServiceId', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service: Service) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name} - R$ {Number(service.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {campaignForm.formState.errors.rewardServiceId && (
                  <p className="text-sm text-red-500">
                    {campaignForm.formState.errors.rewardServiceId.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCampaignDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {editingCampaign ? 'Atualizar' : 'Criar'} Campanha
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}