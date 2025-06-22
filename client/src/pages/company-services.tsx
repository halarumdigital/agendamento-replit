import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Grid, List } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: number;
  name: string;
  description?: string;
  duration: number;
  price: string | number;
  color: string;
  points: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const serviceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  duration: z.number().min(1, "Duração deve ser maior que 0"),
  price: z.number().min(0, "Preço deve ser maior ou igual a 0"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor deve ser um código hexadecimal válido"),
  points: z.number().min(0, "Pontos devem ser maior ou igual a 0").default(0),
  isActive: z.boolean().default(true),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

const colorPalette = [
  '#ef4444', '#14b8a6', '#3b82f6', '#84cc16', '#f59e0b',
  '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f97316',
  '#6366f1', '#a855f7', '#f43f5e', '#22d3ee', '#eab308'
];

export default function CompanyServices() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['/api/company/services'],
  });

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 30,
      price: 0,
      color: "#3b82f6",
      points: 0,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const response = await fetch('/api/company/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Erro ao criar serviço');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/services'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Serviço criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      if (!editingService) return;
      const response = await fetch(`/api/company/services/${editingService.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Erro ao atualizar serviço');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/services'] });
      setIsDialogOpen(false);
      setEditingService(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Serviço atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/company/services/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Erro ao excluir serviço');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/services'] });
      toast({
        title: "Sucesso",
        description: "Serviço excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ServiceFormData) => {
    if (editingService) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    form.setValue('name', service.name);
    form.setValue('description', service.description || '');
    form.setValue('duration', service.duration);
    form.setValue('price', typeof service.price === 'string' ? parseFloat(service.price) : service.price);
    form.setValue('color', service.color);
    form.setValue('points', service.points || 0);
    form.setValue('isActive', service.isActive);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      deleteMutation.mutate(id);
    }
  };

  const openCreateDialog = () => {
    setEditingService(null);
    form.reset();
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 lg:mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 responsive-title">Serviços</h1>
          <p className="text-sm sm:text-base text-gray-600 responsive-text">Gerencie seus serviços e preços</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="touch-target"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="touch-target"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700 touch-target small-mobile-button">
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Novo Serviço</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="dialog-content max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {editingService 
                    ? 'Edite as informações do serviço.' 
                    : 'Adicione um novo serviço à sua empresa.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="form-container">
                <div className="grid gap-3 sm:gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                    <Label htmlFor="name" className="text-left sm:text-right text-sm font-medium">
                      Nome do Serviço
                    </Label>
                    <Input
                      id="name"
                      className="col-span-3"
                      placeholder="Ex: Corte de Cabelo"
                      {...form.register('name')}
                    />
                    {form.formState.errors.name && (
                      <p className="col-span-4 text-sm text-red-500">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="duration" className="text-right">
                      Duração (minutos)
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      className="col-span-3"
                      {...form.register('duration', { valueAsNumber: true })}
                    />
                    {form.formState.errors.duration && (
                      <p className="col-span-4 text-sm text-red-500">
                        {form.formState.errors.duration.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">
                      Preço (R$)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      className="col-span-3"
                      {...form.register('price', { valueAsNumber: true })}
                    />
                    {form.formState.errors.price && (
                      <p className="col-span-4 text-sm text-red-500">
                        {form.formState.errors.price.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                    <Label htmlFor="points" className="text-left sm:text-right text-sm font-medium">
                      Pontos de Fidelidade
                    </Label>
                    <Input
                      id="points"
                      type="number"
                      min="0"
                      className="col-span-1 sm:col-span-3 mobile-input"
                      placeholder="0"
                      {...form.register('points', { valueAsNumber: true })}
                    />
                    {form.formState.errors.points && (
                      <p className="col-span-1 sm:col-span-4 text-sm text-red-500">
                        {form.formState.errors.points.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                    <Label className="text-left sm:text-right text-sm font-medium">
                      Cor do Serviço
                    </Label>
                    <div className="col-span-1 sm:col-span-3">
                      <div className="grid grid-cols-5 gap-2 mb-3">
                        {colorPalette.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-lg border-2 touch-target ${
                              form.watch('color') === color ? 'border-gray-800' : 'border-gray-200'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => form.setValue('color', color)}
                          />
                        ))}
                      </div>
                      <Input
                        type="text"
                        value={form.watch('color')}
                        onChange={(e) => form.setValue('color', e.target.value)}
                        placeholder="#3b82f6"
                        className="mobile-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                    <Label htmlFor="isActive" className="text-left sm:text-right text-sm font-medium">
                      Serviço ativo
                    </Label>
                    <Switch
                      id="isActive"
                      checked={form.watch('isActive')}
                      onCheckedChange={(checked) => form.setValue('isActive', checked)}
                    />
                  </div>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="small-mobile-button">
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 small-mobile-button"
                  >
                    {editingService ? 'Atualizar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {services.map((service) => (
            <Card key={service.id} className="relative mobile-card">
              <CardHeader className="pb-3 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: service.color }}
                    />
                    <CardTitle className="text-base sm:text-lg responsive-title truncate">{service.name}</CardTitle>
                  </div>
                  <Badge 
                    className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs self-start sm:self-center"
                  >
                    Ativo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    Duração: {service.duration}min
                  </p>
                  <p className="text-lg font-semibold text-green-600">
                    R$ {Number(service.price).toFixed(2)}
                  </p>
                  <p className="text-sm text-blue-600 font-medium">
                    {service.points || 0} pontos de fidelidade
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(service)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(service.id)}
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
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: service.color }}
                  />
                  <div>
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-sm text-gray-600">
                      {service.duration}min • R$ {Number(service.price).toFixed(2)} • {service.points || 0} pontos
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={service.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {service.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(service)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(service.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {services.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum serviço encontrado
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Comece criando seu primeiro serviço para organizar melhor sua empresa.
            </p>
            <Button onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Serviço
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}