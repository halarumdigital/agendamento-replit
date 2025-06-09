import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings, Building2, Lock, User, MessageSquare, Trash2, Plus, Smartphone, QrCode, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { z } from "zod";
import { formatDocument } from "@/lib/validations";
import CompanyLayout from "@/components/layout/company-layout";

const companyProfileSchema = z.object({
  fantasyName: z.string().min(1, "Nome fantasia é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
});

const companyPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

const whatsappInstanceSchema = z.object({
  instanceName: z.string().min(1, "Nome da instância é obrigatório"),
});

type CompanyProfileData = z.infer<typeof companyProfileSchema>;
type CompanyPasswordData = z.infer<typeof companyPasswordSchema>;
type WhatsappInstanceData = z.infer<typeof whatsappInstanceSchema>;

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
      address: "",
    },
    values: company ? {
      fantasyName: company.fantasyName,
      address: company.address,
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

  const onWhatsappSubmit = (data: WhatsappInstanceData) => {
    createInstanceMutation.mutate(data);
  };

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
    <CompanyLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Configurações da Empresa</h1>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Preferências
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
                          <p className="text-sm text-gray-500">
                            Status: <Badge variant={instance.status === 'connected' || instance.status === 'open' ? 'default' : 'secondary'}>
                              {instance.status === 'connected' || instance.status === 'open' ? 'Conectado' : 
                               instance.status === 'close' ? 'Desconectado' :
                               instance.status === 'connecting' ? 'Conectando' :
                               instance.status || 'Desconhecido'}
                            </Badge>
                          </p>
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
                        {instance.status !== 'connected' && instance.status !== 'open' && (
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
      </div>
    </CompanyLayout>
  );
}