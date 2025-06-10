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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings, Building2, Lock, User, MessageSquare, Trash2, Plus, Smartphone, QrCode, RefreshCw, Bot, Key, Gift, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { z } from "zod";
import { formatDocument, companyProfileSchema, companyPasswordSchema, companyAiAgentSchema, whatsappInstanceSchema, webhookConfigSchema } from "@/lib/validations";


type CompanyProfileData = z.infer<typeof companyProfileSchema>;
type CompanyPasswordData = z.infer<typeof companyPasswordSchema>;
type CompanyAiAgentData = z.infer<typeof companyAiAgentSchema>;
type WhatsappInstanceData = z.infer<typeof whatsappInstanceSchema>;
type WebhookConfigData = z.infer<typeof webhookConfigSchema>;

export default function CompanySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompanyAuth();
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [showQrDialog, setShowQrDialog] = useState(false);

  const profileForm = useForm<CompanyProfileData>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      fantasyName: "",
      document: "",
      address: "",
      email: "",
    },
    values: company ? {
      fantasyName: company.fantasyName || "",
      document: company.document || "",
      address: company.address || "",
      email: company.email || "",
    } : undefined,
  });

  const passwordForm = useForm<CompanyPasswordData>({
    resolver: zodResolver(companyPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const whatsappForm = useForm<WhatsappInstanceData>({
    resolver: zodResolver(whatsappInstanceSchema),
    defaultValues: {
      instanceName: "",
    },
  });

  const aiAgentForm = useForm<CompanyAiAgentData>({
    resolver: zodResolver(companyAiAgentSchema),
    defaultValues: {
      aiAgentPrompt: "",
    },
  });

  const webhookForm = useForm<WebhookConfigData>({
    resolver: zodResolver(webhookConfigSchema),
    defaultValues: {
      apiUrl: "",
      apiKey: "",
    },
  });

  // Update form when company data loads
  useEffect(() => {
    if (company?.aiAgentPrompt) {
      aiAgentForm.reset({
        aiAgentPrompt: company.aiAgentPrompt,
      });
    }
  }, [company?.aiAgentPrompt, aiAgentForm]);

  // WhatsApp instances query
  const { data: whatsappInstances = [], isLoading: isLoadingInstances } = useQuery<any[]>({
    queryKey: ["/api/company/whatsapp/instances"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: CompanyProfileData) => {
      await apiRequest("PUT", "/api/company/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado",
        description: "As informações da empresa foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company/auth/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar perfil.",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: CompanyPasswordData) => {
      await apiRequest("PUT", "/api/company/password", data);
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao alterar senha.",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: CompanyProfileData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: CompanyPasswordData) => {
    updatePasswordMutation.mutate(data);
  };

  const createInstanceMutation = useMutation({
    mutationFn: async (data: WhatsappInstanceData) => {
      return await apiRequest("POST", "/api/company/whatsapp/instances", data);
    },
    onSuccess: () => {
      toast({
        title: "Instância criada",
        description: "Instância do WhatsApp criada com sucesso.",
      });
      whatsappForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/company/whatsapp/instances"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar instância",
        variant: "destructive",
      });
    },
  });

  const deleteInstanceMutation = useMutation({
    mutationFn: async (instanceId: number) => {
      await apiRequest("DELETE", `/api/company/whatsapp/instances/${instanceId}`);
    },
    onSuccess: () => {
      toast({
        title: "Instância excluída",
        description: "Instância do WhatsApp excluída com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company/whatsapp/instances"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir instância",
        variant: "destructive",
      });
    },
  });

  const updateAiAgentMutation = useMutation({
    mutationFn: async (data: CompanyAiAgentData) => {
      await apiRequest("PUT", "/api/company/ai-agent", data);
    },
    onSuccess: () => {
      toast({
        title: "Agente IA configurado",
        description: "As configurações do agente IA foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company/auth/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar configurações do agente IA. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onWhatsappSubmit = (data: WhatsappInstanceData) => {
    createInstanceMutation.mutate(data);
  };

  const onAiAgentSubmit = (data: CompanyAiAgentData) => {
    updateAiAgentMutation.mutate(data);
  };

  const autoConfigureWebhookMutation = useMutation({
    mutationFn: async (instanceId: number) => {
      const response = await apiRequest("POST", `/api/company/whatsapp/${instanceId}/auto-configure-webhook`);
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Agente IA configurado",
        description: "O agente de IA foi conectado com sucesso ao WhatsApp usando as configurações globais.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company/whatsapp/instances"] });
      setSelectedInstance(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao configurar agente IA",
        description: error.message || "Evolution API não configurada pelo administrador",
        variant: "destructive",
      });
    },
  });

  const configureWebhookMutation = useMutation({
    mutationFn: async (instanceId: number) => {
      const response = await apiRequest("POST", `/api/company/whatsapp/${instanceId}/configure-webhook`);
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Agente IA configurado",
        description: "O agente de IA foi conectado com sucesso ao WhatsApp usando as configurações globais.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company/whatsapp/instances"] });
      setSelectedInstance(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao configurar agente IA",
        description: error.message || "Configure a Evolution API nas configurações do administrador primeiro",
        variant: "destructive",
      });
    },
  });

  const onWebhookSubmit = () => {
    if (selectedInstance) {
      configureWebhookMutation.mutate(selectedInstance.id);
    }
  };

  const fetchInstanceDetailsMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const response = await apiRequest("GET", `/api/company/whatsapp/instances/${instanceName}/details`);
      return response;
    },
    onSuccess: (data: any) => {
      console.log('API Response:', data);
      
      const instance = data.instance || data;
      const apiKey = instance?.apiKey;
      const apiUrl = instance?.apiUrl;
      
      toast({
        title: "Detalhes da Instância",
        description: `URL da API: ${apiUrl || 'Não configurada'}\nChave da API: ${apiKey ? apiKey.substring(0, 20) + '...' : 'Não configurada'}`,
      });

      // Show detailed info in console for copying
      console.log('=== DETALHES DA INSTÂNCIA ===');
      console.log('Resposta completa:', data);
      console.log('Nome da Instância:', instance?.instanceName);
      console.log('URL da Evolution API:', apiUrl);
      console.log('Chave da API:', apiKey);
      console.log('Status:', instance?.status);
      if (data.evolutionDetails) {
        console.log('Detalhes da Evolution API:', data.evolutionDetails);
      }
      console.log('==============================');
    },
    onError: (error: any) => {
      console.error('Error fetching instance details:', error);
      toast({
        title: "Erro ao buscar detalhes",
        description: error.message || "Falha ao buscar detalhes da instância",
        variant: "destructive",
      });
    },
  });

  const connectInstanceMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const response = await apiRequest("GET", `/api/company/whatsapp/instances/${instanceName}/connect`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log("API Response:", data);
      // Try different QR code fields from Evolution API
      const qrcode = data.qrcode || data.base64 || data.qr || data.qr_code;
      
      if (qrcode) {
        // If it's base64 without data URL prefix, add it
        const qrCodeUrl = qrcode.startsWith('data:') ? qrcode : `data:image/png;base64,${qrcode}`;
        setQrCodeData(qrCodeUrl);
        setShowQrDialog(true);
        toast({
          title: "Conectando instância",
          description: "Escaneie o QR code com seu WhatsApp.",
        });
      } else {
        toast({
          title: "Erro",
          description: "QR code não encontrado na resposta da API",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      let errorMessage = error.message || "Erro ao conectar instância";
      
      // Handle specific Evolution API errors
      if (error.message?.includes("Evolution API não configurada")) {
        errorMessage = "Configure a Evolution API nas configurações do administrador antes de conectar instâncias WhatsApp.";
      } else if (error.message?.includes("Instância não encontrada")) {
        errorMessage = "Esta instância não foi encontrada na Evolution API. Verifique se foi criada corretamente.";
      } else if (error.message?.includes("Erro da Evolution API")) {
        errorMessage = "Erro na comunicação com a Evolution API. Verifique as configurações da API.";
      }
      
      toast({
        title: "Erro de Conexão",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const checkStatusMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const response = await apiRequest("GET", `/api/company/whatsapp/instances/${instanceName}/status`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/whatsapp/instances"] });
      toast({
        title: "Status atualizado",
        description: `Status da instância: ${data.connectionStatus || 'Desconhecido'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao verificar status",
        description: error.message || "Erro ao verificar status da instância",
        variant: "destructive",
      });
    },
  });

  const disconnectInstanceMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const response = await apiRequest("POST", `/api/company/whatsapp/instances/${instanceName}/disconnect`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/whatsapp/instances"] });
      toast({
        title: "Instância desconectada",
        description: "Instância do WhatsApp desconectada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desconectar",
        description: error.message || "Erro ao desconectar instância",
        variant: "destructive",
      });
    },
  });

  // State for AI agent testing
  const [testMessage, setTestMessage] = useState("");
  const [agentResponse, setAgentResponse] = useState("");

  const testAgentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/company/ai-agent/test", {
        message: testMessage
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setAgentResponse(data.response);
      toast({
        title: "Teste realizado",
        description: "O agente IA respondeu com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste",
        description: error.message || "Erro ao testar o agente IA",
        variant: "destructive",
      });
    },
  });

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Carregando informações da empresa...</p>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="ai-agent" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              IA
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Lembretes
            </TabsTrigger>
            <TabsTrigger value="birthdays" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Aniversários
            </TabsTrigger>
          </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informações da Empresa
              </CardTitle>
              <CardDescription>
                Atualize as informações básicas da sua empresa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="fantasyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Fantasia</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da empresa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <label className="text-sm font-medium text-gray-500">Documento</label>
                      <Input 
                        value={formatDocument(company.document)} 
                        disabled 
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <Input 
                        value={company.email} 
                        disabled 
                        className="bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <Input 
                        value="Ativo" 
                        disabled 
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Endereço completo da empresa"
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Mantenha sua conta segura atualizando sua senha regularmente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha Atual</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Digite sua senha atual"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Digite sua nova senha"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Confirme sua nova senha"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending}
                    >
                      {updatePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conexões WhatsApp
              </CardTitle>
              <CardDescription>
                Crie e gerencie suas instâncias do WhatsApp Business.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...whatsappForm}>
                <form onSubmit={whatsappForm.handleSubmit(onWhatsappSubmit)} className="space-y-4">
                  <FormField
                    control={whatsappForm.control}
                    name="instanceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Instância</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: WhatsApp Principal"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={createInstanceMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {createInstanceMutation.isPending ? "Criando..." : "Criar Instância"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instâncias Ativas</CardTitle>
              <CardDescription>
                Lista de todas as suas instâncias do WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInstances ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Carregando instâncias...</p>
                </div>
              ) : (whatsappInstances as any[]).length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">Nenhuma instância criada</p>
                  <p className="text-sm text-gray-400">Crie sua primeira instância do WhatsApp acima.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(whatsappInstances as any[]).map((instance: any) => (
                    <div key={instance.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        <div>
                          <h4 className="font-medium">{instance.instanceName}</h4>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span>Status:</span>
                            <Badge variant={instance.status === 'connected' || instance.status === 'open' ? 'default' : 'secondary'}>
                              {instance.status === 'connected' || instance.status === 'open' ? 'Conectado' : 
                               instance.status === 'close' ? 'Desconectado' :
                               instance.status === 'connecting' ? 'Conectando' :
                               instance.status || 'Desconhecido'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => checkStatusMutation.mutate(instance.instanceName)}
                          disabled={checkStatusMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <QrCode className="w-4 h-4" />
                          {checkStatusMutation.isPending ? "Verificando..." : "Status"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchInstanceDetailsMutation.mutate(instance.instanceName)}
                          disabled={fetchInstanceDetailsMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <Key className="w-4 h-4" />
                          {fetchInstanceDetailsMutation.isPending ? "Buscando..." : "Ver Chave"}
                        </Button>
                        {instance.status === 'connected' || instance.status === 'open' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => disconnectInstanceMutation.mutate(instance.instanceName)}
                              disabled={disconnectInstanceMutation.isPending}
                              className="flex items-center gap-1"
                            >
                              <Smartphone className="w-4 h-4" />
                              {disconnectInstanceMutation.isPending ? "Desconectando..." : "Desconectar"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setSelectedInstance(instance);
                                
                                // Try to fetch the latest instance details with API credentials
                                try {
                                  const details = await apiRequest("GET", `/api/company/whatsapp/instances/${instance.instanceName}/details`) as any;
                                  webhookForm.reset({
                                    apiUrl: details?.instance?.apiUrl || (instance as any).apiUrl || "https://sua-evolution-api.com",
                                    apiKey: details?.instance?.apiKey || (instance as any).apiKey || "",
                                  });
                                } catch (error) {
                                  // Fallback to instance data if details fetch fails
                                  webhookForm.reset({
                                    apiUrl: (instance as any).apiUrl || "https://sua-evolution-api.com",
                                    apiKey: (instance as any).apiKey || "",
                                  });
                                }
                              }}
                              className="flex items-center gap-1"
                            >
                              <Bot className="w-4 h-4" />
                              {instance.webhook ? "Reconfigurar IA" : "Configurar IA"}
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => connectInstanceMutation.mutate(instance.instanceName)}
                            disabled={connectInstanceMutation.isPending}
                            className="flex items-center gap-1"
                          >
                            <Smartphone className="w-4 h-4" />
                            {connectInstanceMutation.isPending ? "Conectando..." : "Conectar"}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteInstanceMutation.mutate(instance.id)}
                          disabled={deleteInstanceMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Preferências do Sistema
              </CardTitle>
              <CardDescription>
                Configure suas preferências de uso do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Notificações por Email</label>
                    <p className="text-sm text-gray-500">Receber notificações importantes por email</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configurar
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Tema do Sistema</label>
                    <p className="text-sm text-gray-500">Escolha entre modo claro ou escuro</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Claro
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Idioma</label>
                    <p className="text-sm text-gray-500">Idioma da interface do sistema</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Português (BR)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-agent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Configuração do Agente IA
              </CardTitle>
              <CardDescription>
                Configure o prompt personalizado para o agente de IA da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...aiAgentForm}>
                <form onSubmit={aiAgentForm.handleSubmit(onAiAgentSubmit)} className="space-y-6">
                  <FormField
                    control={aiAgentForm.control}
                    name="aiAgentPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prompt do Agente IA</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Exemplo: Você é um assistente virtual especializado em atendimento ao cliente para uma empresa de tecnologia. Sempre seja educado, profissional e forneça respostas precisas sobre nossos produtos e serviços..."
                            className="min-h-[200px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-sm text-gray-500">
                          <p>• O prompt deve descrever como o agente IA deve se comportar</p>
                          <p>• Inclua informações sobre sua empresa, produtos ou serviços</p>
                          <p>• Defina o tom de voz e estilo de comunicação desejado</p>
                          <p>• Mínimo de 10 caracteres</p>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateAiAgentMutation.isPending}
                      className="min-w-[140px]"
                    >
                      {updateAiAgentMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar Configurações"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Testar Agente IA
              </CardTitle>
              <CardDescription>
                Teste seu agente IA para verificar como ele responde com o prompt configurado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {company?.aiAgentPrompt ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mensagem de teste</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite uma mensagem para testar o agente..."
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && testAgentMutation.mutate()}
                      />
                      <Button 
                        onClick={() => testAgentMutation.mutate()}
                        disabled={testAgentMutation.isPending || !testMessage.trim()}
                        className="min-w-[100px]"
                      >
                        {testAgentMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          "Testar"
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {agentResponse && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="text-sm font-medium text-gray-700 mb-2">Resposta do Agente:</div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">{agentResponse}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
                  <Bot className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">Nenhum prompt configurado</p>
                  <p className="text-sm text-gray-500">Configure um prompt acima para testar o agente IA</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Importantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Como funciona o Agente IA</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• O agente utiliza as configurações globais de IA definidas pelo administrador</li>
                  <li>• Seu prompt personalizado será usado em todas as conversas</li>
                  <li>• As respostas são geradas com base no modelo de IA configurado</li>
                  <li>• O agente pode ser integrado com WhatsApp e outros canais</li>
                </ul>
              </div>
              
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-2">Dicas para um bom prompt</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Seja específico sobre o papel do agente</li>
                  <li>• Inclua instruções sobre como lidar com diferentes situações</li>
                  <li>• Defina limites e diretrizes de comunicação</li>
                  <li>• Teste diferentes versões para otimizar as respostas</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Lembretes de Agendamento
              </CardTitle>
              <CardDescription>
                Configure lembretes automáticos para agendamentos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">Funcionalidade em desenvolvimento</p>
                <p className="text-sm text-gray-500">Lembretes automáticos serão implementados em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="birthdays" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-600" />
                Mensagens de Aniversário
              </CardTitle>
              <CardDescription>
                Envie mensagens automáticas para clientes no dia do aniversário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                <h4 className="font-semibold text-pink-900 mb-3">Mensagem Personalizada</h4>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Que este novo ano de vida seja repleto de alegrias, conquistas e momentos especiais.&#10;&#10;Para comemorar, que tal agendar um horário especial conosco? 🎉✨&#10;&#10;Feliz aniversário! 🎂"
                    className="min-h-[120px] bg-white"
                    defaultValue="Que este novo ano de vida seja repleto de alegrias, conquistas e momentos especiais.&#10;&#10;Para comemorar, que tal agendar um horário especial conosco? 🎉✨&#10;&#10;Feliz aniversário! 🎂"
                  />
                  <p className="text-sm text-pink-700">
                    Use <strong>{"{NOME}"}</strong> para o nome do cliente e <strong>{"{EMPRESA}"}</strong> para o nome da empresa
                  </p>
                  <div className="flex gap-3">
                    <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                      <Gift className="w-4 h-4 mr-2" />
                      Salvar Mensagem
                    </Button>
                    <Button size="sm" variant="outline">
                      Testar Função
                    </Button>
                    <Button size="sm" variant="outline">
                      Atualizar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gift className="w-5 h-5 text-pink-600" />
                      Aniversariantes de Hoje
                      <Badge variant="secondary" className="bg-pink-100 text-pink-700">0</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <p className="text-gray-600">Nenhum aniversariante hoje</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Aniversariantes do Mês
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">0</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <p className="text-gray-600">Nenhum aniversariante este mês</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Calendar className="w-5 h-5" />
                    Histórico de Aniversários
                  </CardTitle>
                  <CardDescription>
                    Mensagens de aniversário enviadas recentemente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhuma mensagem de aniversário enviada ainda</p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
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
            <div className="flex flex-col items-center space-y-4">
              {qrCodeData ? (
                <div className="bg-white p-4 rounded-lg border">
                  <img 
                    src={qrCodeData} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64 object-contain"
                  />
                </div>
              ) : (
                <div className="w-64 h-64 bg-gray-100 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Gerando QR code...</p>
                  </div>
                </div>
              )}
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  1. Abra o WhatsApp no seu celular
                </p>
                <p className="text-sm text-gray-600">
                  2. Toque em Menu (⋮) &gt; Dispositivos conectados
                </p>
                <p className="text-sm text-gray-600">
                  3. Toque em "Conectar um dispositivo"
                </p>
                <p className="text-sm text-gray-600">
                  4. Aponte seu celular para esta tela para capturar o código
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Webhook Configuration Dialog */}
        <Dialog open={!!selectedInstance} onOpenChange={() => setSelectedInstance(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Configurar Agente IA - {selectedInstance?.instanceName}</DialogTitle>
              <DialogDescription>
                O agente IA será configurado automaticamente usando as configurações globais da Evolution API definidas pelo administrador.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Como funciona</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• O webhook será configurado automaticamente na Evolution API</li>
                  <li>• Mensagens recebidas no WhatsApp serão processadas pelo agente IA</li>
                  <li>• As respostas serão enviadas automaticamente usando seu prompt personalizado</li>
                  <li>• Utiliza as configurações globais definidas pelo administrador</li>
                </ul>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-2">URL do Webhook gerada</h4>
                <p className="text-sm text-amber-800 mb-2">Esta URL será configurada automaticamente:</p>
                <code className="text-xs bg-white p-2 rounded border block">
                  {window.location.origin}/api/webhook/whatsapp/{selectedInstance?.instanceName}
                </code>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedInstance(null)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={onWebhookSubmit}
                  disabled={configureWebhookMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Bot className="w-4 h-4" />
                  {configureWebhookMutation.isPending ? "Configurando..." : "Configurar Agente IA"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}