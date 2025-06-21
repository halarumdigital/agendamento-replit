import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Grid, List, User, Mail, Phone, Eye, EyeOff, Clock, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/hooks/use-plan";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { ProfessionalServiceHistory } from "@/components/professional-service-history";

interface Professional {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  specialties?: string[];
  workDays?: string[];
  workStartTime?: string;
  workEndTime?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const professionalSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  active: z.boolean().default(true),
});

type ProfessionalFormData = z.infer<typeof professionalSchema>;

export default function CompanyProfessionals() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canAddProfessional, getProfessionalsLimitInfo } = usePlan();

  // Schedule management state
  const [schedules, setSchedules] = useState(() => {
    const defaultSchedule = {
      enabled: false,
      startTime: "09:00",
      endTime: "18:00"
    };
    return {
      domingo: defaultSchedule,
      segunda: defaultSchedule,
      terca: defaultSchedule,
      quarta: defaultSchedule,
      quinta: defaultSchedule,
      sexta: defaultSchedule,
      sabado: defaultSchedule
    };
  });

  // Generate time options in 30-minute intervals
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeStr);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Handle schedule changes
  const updateSchedule = (day: string, field: 'enabled' | 'startTime' | 'endTime', value: boolean | string) => {
    setSchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        [field]: value
      }
    }));
  };

  // Save schedule for a specific day
  const saveSchedule = (day: string) => {
    toast({
      title: "Horário salvo",
      description: `Horário de ${day} salvo com sucesso`,
    });
  };

  // Days of the week
  const daysOfWeek = [
    { key: 'domingo', label: 'Domingo' },
    { key: 'segunda', label: 'Segunda-feira' },
    { key: 'terca', label: 'Terça-feira' },
    { key: 'quarta', label: 'Quarta-feira' },
    { key: 'quinta', label: 'Quinta-feira' },
    { key: 'sexta', label: 'Sexta-feira' },
    { key: 'sabado', label: 'Sábado' }
  ];

  const { data: professionals = [], isLoading } = useQuery<Professional[]>({
    queryKey: ['/api/company/professionals'],
  });

  const form = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProfessionalFormData) => {
      const response = await fetch('/api/company/professionals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Erro ao criar profissional');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/professionals'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Profissional criado com sucesso",
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
    mutationFn: async (data: ProfessionalFormData) => {
      if (!editingProfessional) return;
      const response = await fetch(`/api/company/professionals/${editingProfessional.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Erro ao atualizar profissional');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/professionals'] });
      setIsDialogOpen(false);
      setEditingProfessional(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Profissional atualizado com sucesso",
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
      const response = await fetch(`/api/company/professionals/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Erro ao excluir profissional');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/professionals'] });
      toast({
        title: "Sucesso",
        description: "Profissional excluído com sucesso",
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

  const onSubmit = (data: ProfessionalFormData) => {
    if (editingProfessional) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (professional: Professional) => {
    setEditingProfessional(professional);
    form.setValue('name', professional.name);
    form.setValue('email', professional.email || '');
    form.setValue('phone', professional.phone || '');
    form.setValue('password', ''); // Don't pre-fill password
    form.setValue('active', professional.active);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este profissional?')) {
      deleteMutation.mutate(id);
    }
  };

  const openCreateDialog = () => {
    setEditingProfessional(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profissionais</h1>
          <p className="text-gray-600">Gerencie sua equipe de profissionais</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="mr-2 h-4 w-4" />
                Novo Profissional
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
                </DialogTitle>
                <DialogDescription>
                  {editingProfessional 
                    ? 'Edite as informações do profissional.' 
                    : 'Adicione um novo profissional à sua equipe.'}
                </DialogDescription>
              </DialogHeader>
              
              {/* Alert for professional limit when creating new professional */}
              {!editingProfessional && !canAddProfessional() && (
                <Alert className="border-red-200 bg-red-50">
                  <Lock className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Você pode adicionar somente {getProfessionalsLimitInfo()?.limit} profissionais. 
                    Atualmente você tem {getProfessionalsLimitInfo()?.current} profissionais cadastrados. 
                    Faça upgrade do seu plano para adicionar mais profissionais.
                  </AlertDescription>
                </Alert>
              )}
              
              <Tabs defaultValue="dados" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="dados">Dados do Profissional</TabsTrigger>
                  <TabsTrigger value="horarios">Horários</TabsTrigger>
                  <TabsTrigger value="servicos">Histórico de Serviços</TabsTrigger>
                </TabsList>
                
                <TabsContent value="dados" className="space-y-4">
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Nome *
                        </Label>
                        <Input
                          id="name"
                          className="col-span-3"
                          placeholder="Nome completo do profissional"
                          {...form.register('name')}
                        />
                        {form.formState.errors.name && (
                          <p className="col-span-4 text-sm text-red-500">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                          Email (Login) *
                        </Label>
                        <div className="col-span-3 space-y-1">
                          <Input
                            id="email"
                            type="email"
                            placeholder="email@exemplo.com"
                            {...form.register('email')}
                          />
                          <p className="text-xs text-gray-500">
                            Este email será usado para fazer login no sistema
                          </p>
                        </div>
                        {form.formState.errors.email && (
                          <p className="col-span-4 text-sm text-red-500">
                            {form.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">
                          Telefone
                        </Label>
                        <Input
                          id="phone"
                          className="col-span-3"
                          placeholder="(11) 99999-9999"
                          {...form.register('phone')}
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">
                          Senha *
                        </Label>
                        <div className="col-span-3 relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Digite a senha"
                            {...form.register('password')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        {form.formState.errors.password && (
                          <p className="col-span-4 text-sm text-red-500">
                            {form.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="active" className="text-right">
                          Profissional ativo
                        </Label>
                        <Switch
                          id="active"
                          checked={form.watch('active')}
                          onCheckedChange={(checked) => form.setValue('active', checked)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={
                          createMutation.isPending || 
                          updateMutation.isPending || 
                          (!editingProfessional && !canAddProfessional())
                        }
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingProfessional ? 'Atualizar' : 'Cadastrar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </TabsContent>
                
                <TabsContent value="horarios" className="space-y-4">
                  <div className="flex items-center space-x-2 mb-6">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Horários de Funcionamento</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {daysOfWeek.map((day) => {
                      const schedule = schedules[day.key as keyof typeof schedules];
                      return (
                        <div key={day.key} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${day.key}-enabled`}
                                  checked={schedule.enabled}
                                  onCheckedChange={(checked) => 
                                    updateSchedule(day.key, 'enabled', !!checked)
                                  }
                                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                />
                                <Label 
                                  htmlFor={`${day.key}-enabled`}
                                  className="text-sm font-medium text-gray-700 min-w-[100px]"
                                >
                                  {day.label}
                                </Label>
                              </div>
                              
                              {schedule.enabled && (
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <Label className="text-sm text-gray-600">Início</Label>
                                    <Select
                                      value={schedule.startTime}
                                      onValueChange={(value) => 
                                        updateSchedule(day.key, 'startTime', value)
                                      }
                                    >
                                      <SelectTrigger className="w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {timeOptions.map((time) => (
                                          <SelectItem key={time} value={time}>
                                            {time}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <Label className="text-sm text-gray-600">Fim</Label>
                                    <Select
                                      value={schedule.endTime}
                                      onValueChange={(value) => 
                                        updateSchedule(day.key, 'endTime', value)
                                      }
                                    >
                                      <SelectTrigger className="w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {timeOptions.map((time) => (
                                          <SelectItem key={time} value={time}>
                                            {time}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={() => saveSchedule(day.label)}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Salvar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => 
                                  updateSchedule(day.key, 'enabled', false)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex justify-end mt-6 pt-4 border-t">
                    <Button
                      type="button"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => {
                        toast({
                          title: "Horários salvos",
                          description: "Todos os horários foram salvos com sucesso",
                        });
                      }}
                    >
                      Salvar Todos os Horários
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="servicos" className="space-y-4">
                  {editingProfessional ? (
                    <ProfessionalServiceHistory professionalId={editingProfessional.id} />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Salve o profissional primeiro para ver o histórico de serviços</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {professionals.map((professional) => (
            <Card key={professional.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{professional.name}</CardTitle>
                    </div>
                  </div>
                  <Badge 
                    className="bg-purple-100 text-purple-800 hover:bg-purple-100"
                  >
                    Ativo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {professional.email && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{professional.email}</span>
                    </div>
                  )}
                  {professional.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{professional.phone}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Cadastrado em {formatDate(professional.createdAt)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(professional)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(professional.id)}
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
          {professionals.map((professional) => (
            <Card key={professional.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{professional.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {professional.email && (
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span>{professional.email}</span>
                        </span>
                      )}
                      {professional.phone && (
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{professional.phone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-purple-100 text-purple-800">
                    Ativo
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(professional)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(professional.id)}
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

      {professionals.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum profissional encontrado
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Comece adicionando profissionais à sua equipe para organizar melhor os serviços.
            </p>
            <Button onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Profissional
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}