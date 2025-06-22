import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const tourStepSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  targetElement: z.string().min(1, "Elemento alvo é obrigatório"),
  placement: z.enum(['top', 'bottom', 'left', 'right']).default('bottom'),
  stepOrder: z.number().min(1, "Ordem deve ser maior que 0"),
  isActive: z.boolean().default(true)
});

type TourStepFormData = z.infer<typeof tourStepSchema>;

interface TourStep {
  id: number;
  title: string;
  description: string;
  targetElement: string;
  placement: string;
  stepOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminTourConfig() {
  const [editingStep, setEditingStep] = useState<TourStep | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<TourStepFormData>({
    resolver: zodResolver(tourStepSchema),
    defaultValues: {
      title: "",
      description: "",
      targetElement: "",
      placement: "bottom",
      stepOrder: 1,
      isActive: true
    }
  });

  // Fetch tour steps
  const { data: tourSteps = [], isLoading } = useQuery({
    queryKey: ['/api/admin/tour/steps'],
    queryFn: () => fetch('/api/admin/tour/steps').then(res => res.json())
  });

  // Create tour step mutation
  const createStepMutation = useMutation({
    mutationFn: async (data: TourStepFormData) => {
      const response = await fetch('/api/admin/tour/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Erro ao criar etapa');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Etapa criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tour/steps'] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao criar etapa", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Update tour step mutation
  const updateStepMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TourStepFormData }) => {
      const response = await fetch(`/api/admin/tour/steps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Erro ao atualizar etapa');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Etapa atualizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tour/steps'] });
      setIsDialogOpen(false);
      setEditingStep(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao atualizar etapa", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Delete tour step mutation
  const deleteStepMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/tour/steps/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Erro ao excluir etapa');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Etapa excluída com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tour/steps'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao excluir etapa", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (data: TourStepFormData) => {
    if (editingStep) {
      updateStepMutation.mutate({ id: editingStep.id, data });
    } else {
      createStepMutation.mutate(data);
    }
  };

  const handleEdit = (step: TourStep) => {
    setEditingStep(step);
    form.reset({
      title: step.title,
      description: step.description,
      targetElement: step.targetElement,
      placement: step.placement as any,
      stepOrder: step.stepOrder,
      isActive: step.isActive
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta etapa do tour?")) {
      deleteStepMutation.mutate(id);
    }
  };

  const handleNewStep = () => {
    setEditingStep(null);
    form.reset();
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Carregando configurações do tour...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Configuração do Tour Guiado</h1>
          <p className="text-muted-foreground">
            Configure as etapas do tour que será exibido para novas empresas
          </p>
        </div>
        <Button onClick={handleNewStep}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Etapa
        </Button>
      </div>

      <div className="grid gap-6">
        {tourSteps.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma etapa de tour configurada ainda.
              </p>
              <Button onClick={handleNewStep} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira etapa
              </Button>
            </CardContent>
          </Card>
        ) : (
          tourSteps
            .sort((a: TourStep, b: TourStep) => a.stepOrder - b.stepOrder)
            .map((step: TourStep) => (
              <Card key={step.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      Etapa {step.stepOrder}
                    </Badge>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <Badge variant={step.isActive ? "default" : "secondary"}>
                      {step.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(step)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(step.id)}
                      disabled={deleteStepMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">
                    {step.description}
                  </CardDescription>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <strong>Elemento alvo:</strong> {step.targetElement}
                    </div>
                    <div>
                      <strong>Posicionamento:</strong> {step.placement}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStep ? "Editar Etapa do Tour" : "Nova Etapa do Tour"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Bem-vindo ao sistema" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stepOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem da Etapa</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição detalhada desta etapa do tour..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetElement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Elemento Alvo (CSS Selector)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: .sidebar-nav, #dashboard-card"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="placement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posicionamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o posicionamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="top">Acima</SelectItem>
                          <SelectItem value="bottom">Abaixo</SelectItem>
                          <SelectItem value="left">À esquerda</SelectItem>
                          <SelectItem value="right">À direita</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Etapa Ativa</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Etapas inativas não serão exibidas no tour
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

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createStepMutation.isPending || updateStepMutation.isPending}
                >
                  {editingStep ? "Atualizar" : "Criar"} Etapa
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}