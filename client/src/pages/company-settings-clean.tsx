import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings, Building2, Bot, Smartphone, Bell, Clock, CheckCircle, Send, Calendar, QrCode, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { z } from "zod";
import { formatDocument, companyProfileSchema, companyPasswordSchema, companyAiAgentSchema, whatsappInstanceSchema } from "@/lib/validations";

const reminderSettingsSchema = z.object({
  messageTemplate: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres"),
  isActive: z.boolean(),
});

interface ReminderSettings {
  id: number;
  companyId: number;
  reminderType: string;
  isActive: boolean;
  messageTemplate: string;
  createdAt: string;
  updatedAt: string;
}

type CompanyProfileData = z.infer<typeof companyProfileSchema>;
type CompanyPasswordData = z.infer<typeof companyPasswordSchema>;
type CompanyAiAgentData = z.infer<typeof companyAiAgentSchema>;
type WhatsappInstanceData = z.infer<typeof whatsappInstanceSchema>;
type ReminderSettingsData = z.infer<typeof reminderSettingsSchema>;

export default function CompanySettings() {
  const { company, isLoading: companyLoading } = useCompanyAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingSettings, setEditingSettings] = useState<{ [key: string]: ReminderSettings }>({});
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);

  // React Hook Form setup
  const profileForm = useForm<CompanyProfileData>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      fantasyName: company?.fantasyName || "",
      document: company?.document || "",
      address: company?.address || "",
      email: company?.email || "",
    },
  });

  const passwordForm = useForm<CompanyPasswordData>({
    resolver: zodResolver(companyPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const aiAgentForm = useForm<CompanyAiAgentData>({
    resolver: zodResolver(companyAiAgentSchema),
    defaultValues: {
      aiAgentPrompt: company?.aiAgentPrompt || "",
    },
  });

  const whatsappForm = useForm<WhatsappInstanceData>({
    resolver: zodResolver(whatsappInstanceSchema),
    defaultValues: {
      instanceName: "",
      apiUrl: "",
      apiKey: "",
    },
  });

  const form = useForm<ReminderSettingsData>({
    resolver: zodResolver(reminderSettingsSchema),
    defaultValues: {
      messageTemplate: "",
      isActive: true,
    },
  });

  // Queries
  const { data: whatsappInstances, isLoading: instancesLoading } = useQuery({
    queryKey: [`/api/companies/${company?.id}/whatsapp-instances`],
    enabled: !!company?.id,
  });

  const { data: reminderSettings, isLoading: settingsLoading } = useQuery({
    queryKey: [`/api/companies/${company?.id}/reminder-settings`],
    enabled: !!company?.id,
  });

  // Mutations
  const profileMutation = useMutation({
    mutationFn: async (data: CompanyProfileData) => {
      return await apiRequest(`/api/companies/${company?.id}`, {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: () => {
      toast({ title: "Perfil atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${company?.id}`] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar perfil", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ type, data }: { type: string; data: any }) => {
      return await apiRequest(`/api/companies/${company?.id}/reminder-settings/${type}`, {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: () => {
      toast({ title: "Configuração salva com sucesso!" });
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${company?.id}/reminder-settings`] });
    },
    onError: () => {
      toast({ title: "Erro ao salvar configuração", variant: "destructive" });
    },
  });

  const whatsappMutation = useMutation({
    mutationFn: async (data: WhatsappInstanceData) => {
      return await apiRequest(`/api/companies/${company?.id}/whatsapp-instances`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({ title: "Instância WhatsApp criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${company?.id}/whatsapp-instances`] });
      whatsappForm.reset();
    },
    onError: () => {
      toast({ title: "Erro ao criar instância WhatsApp", variant: "destructive" });
    },
  });

  // Effects
  useEffect(() => {
    if (company) {
      profileForm.reset({
        fantasyName: company.fantasyName,
        document: company.document,
        address: company.address,
        email: company.email,
      });
      aiAgentForm.reset({
        aiAgentPrompt: company.aiAgentPrompt || "",
      });
    }
  }, [company, profileForm, aiAgentForm]);

  // Helper functions
  const toggleEdit = (type: string) => {
    const setting = reminderSettings?.find((s: any) => s.reminderType === type);
    if (editingSettings[type]) {
      setEditingSettings(prev => {
        const newState = { ...prev };
        delete newState[type];
        return newState;
      });
    } else {
      setEditingSettings(prev => ({
        ...prev,
        [type]: setting || {
          id: 0,
          companyId: company?.id || 0,
          reminderType: type,
          isActive: true,
          messageTemplate: "",
          createdAt: "",
          updatedAt: "",
        }
      }));
      form.reset({
        messageTemplate: setting?.messageTemplate || "",
        isActive: setting?.isActive ?? true,
      });
    }
  };

  const saveReminderSetting = (type: string, data: ReminderSettingsData) => {
    updateMutation.mutate({ type, data });
    setEditingSettings(prev => {
      const newState = { ...prev };
      delete newState[type];
      return newState;
    });
  };

  const updateReminderSetting = (type: string, updates: Partial<ReminderSettingsData>) => {
    updateMutation.mutate({ type, data: updates });
  };

  const onProfileSubmit = (data: CompanyProfileData) => {
    profileMutation.mutate(data);
  };

  const onWhatsappSubmit = (data: WhatsappInstanceData) => {
    whatsappMutation.mutate(data);
  };

  if (companyLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Configurações da Empresa</h1>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="ai-agent" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            IA
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Lembretes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Atualize as informações básicas da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="fantasyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="document"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            onChange={(e) => field.onChange(formatDocument(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={profileMutation.isPending}>
                    {profileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-agent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agente de IA</CardTitle>
              <CardDescription>
                Configure o prompt do agente de IA para atendimento automático
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...aiAgentForm}>
                <form onSubmit={aiAgentForm.handleSubmit(() => {})} className="space-y-4">
                  <FormField
                    control={aiAgentForm.control}
                    name="aiAgentPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prompt do Agente</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={6} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Salvar Configurações</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Instâncias WhatsApp</CardTitle>
              <CardDescription>
                Gerencie suas conexões WhatsApp Business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...whatsappForm}>
                <form onSubmit={whatsappForm.handleSubmit(onWhatsappSubmit)} className="space-y-4">
                  <FormField
                    control={whatsappForm.control}
                    name="instanceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Instância</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Atendimento Principal" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={whatsappForm.control}
                    name="apiUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL da API</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://sua-api.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={whatsappForm.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave da API</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={whatsappMutation.isPending}>
                    {whatsappMutation.isPending ? "Criando..." : "Criar Instância"}
                  </Button>
                </form>
              </Form>

              {instancesLoading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Carregando instâncias...</p>
                </div>
              ) : whatsappInstances && whatsappInstances.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Instâncias Ativas</h3>
                  {whatsappInstances.map((instance: any) => (
                    <div key={instance.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{instance.instanceName}</h4>
                          <p className="text-sm text-gray-600">{instance.apiUrl}</p>
                          <Badge variant={instance.status === 'connected' ? 'default' : 'secondary'}>
                            {instance.status || 'Desconectado'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedInstance(instance);
                              setShowQrDialog(true);
                            }}
                          >
                            <QrCode className="w-4 h-4 mr-2" />
                            QR Code
                          </Button>
                          <Button size="sm" variant="outline">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reconectar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma instância WhatsApp configurada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <Bell className="w-6 h-6" />
              Sistema de Lembretes Automáticos
            </h2>
            <p className="text-gray-600 mb-6">
              Configure templates de mensagens automáticas para confirmação e lembretes de agendamentos via WhatsApp
            </p>
          </div>
          
          <div className="space-y-6">
            {settingsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Carregando configurações...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {['confirmation', 'reminder_24h', 'reminder_1h'].map((type) => {
                  const setting = reminderSettings?.find((s: any) => s.reminderType === type);
                  const isEditing = editingSettings[type];
                  
                  return (
                    <Card key={type}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {type === 'confirmation' && <CheckCircle className="w-5 h-5 text-green-600" />}
                            {type === 'reminder_24h' && <Calendar className="w-5 h-5 text-blue-600" />}
                            {type === 'reminder_1h' && <Clock className="w-5 h-5 text-orange-600" />}
                            <span>
                              {type === 'confirmation' && 'Confirmação de Agendamento'}
                              {type === 'reminder_24h' && 'Lembrete 24 Horas Antes'}
                              {type === 'reminder_1h' && 'Lembrete 1 Hora Antes'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={setting?.isActive || false}
                              onCheckedChange={(checked) => updateReminderSetting(type, { isActive: checked })}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleEdit(type)}
                            >
                              {isEditing ? 'Cancelar' : 'Editar'}
                            </Button>
                          </div>
                        </CardTitle>
                        <CardDescription>
                          {type === 'confirmation' && 'Mensagem enviada imediatamente após confirmação do agendamento'}
                          {type === 'reminder_24h' && 'Mensagem enviada 24 horas antes do agendamento'}
                          {type === 'reminder_1h' && 'Mensagem enviada 1 hora antes do agendamento'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isEditing ? (
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit((data) => saveReminderSetting(type, data))} className="space-y-4">
                              <FormField
                                control={form.control}
                                name="messageTemplate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Template da Mensagem</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        {...field}
                                        rows={4}
                                        placeholder="Digite o template da mensagem..."
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-medium text-blue-900 mb-2">Variáveis Disponíveis:</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                                  <div>• {{nomeEmpresa}} - Nome da empresa</div>
                                  <div>• {{nomeCliente}} - Nome do cliente</div>
                                  <div>• {{servico}} - Serviço agendado</div>
                                  <div>• {{profissional}} - Profissional responsável</div>
                                  <div>• {{dataHora}} - Data e hora do agendamento</div>
                                  <div>• {{endereco}} - Endereço da empresa</div>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button type="submit" disabled={updateMutation.isPending}>
                                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => toggleEdit(type)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </form>
                          </Form>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium">Template Atual:</Label>
                              <div className="mt-1 p-3 bg-gray-50 rounded border text-sm">
                                {setting?.messageTemplate || 'Nenhum template configurado'}
                              </div>
                            </div>
                            
                            <div className="bg-gray-50 p-3 rounded border">
                              <Label className="text-sm font-medium">Prévia da Mensagem:</Label>
                              <div className="mt-1 text-sm text-gray-600">
                                {setting?.messageTemplate ? 
                                  setting.messageTemplate
                                    .replace(/\{\{nomeEmpresa\}\}/g, company?.fantasyName || '[Nome da Empresa]')
                                    .replace(/\{\{nomeCliente\}\}/g, '[Nome do Cliente]')
                                    .replace(/\{\{servico\}\}/g, '[Serviço]')
                                    .replace(/\{\{profissional\}\}/g, '[Profissional]')
                                    .replace(/\{\{dataHora\}\}/g, '[Data e Hora]')
                                    .replace(/\{\{endereco\}\}/g, company?.address || '[Endereço]')
                                  : 'Configure um template para visualizar a prévia'
                                }
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="w-5 h-5 text-purple-600" />
                      Teste do Sistema
                    </CardTitle>
                    <CardDescription>
                      Envie um lembrete de teste para validar o funcionamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => {
                        toast({
                          title: "Teste iniciado",
                          description: "Um lembrete de teste será enviado em breve.",
                        });
                      }}
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Teste
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      Um lembrete de teste será enviado para validar o funcionamento do sistema.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR code abaixo com seu WhatsApp para conectar a instância.
            </DialogDescription>
          </DialogHeader>
          
          {selectedInstance?.qrCode ? (
            <div className="flex flex-col items-center space-y-4">
              <div 
                className="qr-code-container p-4 bg-white rounded-lg border"
                dangerouslySetInnerHTML={{ __html: selectedInstance.qrCode }}
              />
              <p className="text-sm text-gray-600 text-center">
                Abra o WhatsApp no seu celular, vá em Menu > Dispositivos conectados > 
                Conectar um dispositivo e escaneie este código QR
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 py-8">
              <QrCode className="w-16 h-16 text-gray-400" />
              <p className="text-gray-500">QR Code não disponível</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowQrDialog(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}