import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  User, 
  Building2, 
  Lock, 
  MessageSquare, 
  Smartphone, 
  QrCode, 
  Bell,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Settings,
  Edit3,
  X,
  Calendar
} from "lucide-react";

// Schemas
const companyProfileSchema = z.object({
  fantasyName: z.string().min(1, "Nome fantasia é obrigatório"),
  document: z.string().min(1, "CNPJ é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  email: z.string().email("Email inválido"),
});

const companyPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

const companyAiAgentSchema = z.object({
  aiAgentPrompt: z.string().min(1, "Prompt do agente AI é obrigatório"),
});

const whatsappInstanceSchema = z.object({
  instanceName: z.string().min(1, "Nome da instância é obrigatório"),
  apiUrl: z.string().url("URL da API inválida").optional().or(z.literal("")),
  apiKey: z.string().optional(),
});

const webhookConfigSchema = z.object({
  evolutionApiUrl: z.string().url("URL da Evolution API inválida").optional().or(z.literal("")),
  evolutionApiKey: z.string().optional(),
});

const birthdayMessageSchema = z.object({
  messageTemplate: z.string().min(1, "Template da mensagem é obrigatório"),
});

// Interfaces
interface ReminderSettings {
  id: number;
  companyId: number;
  reminderType: string;
  isActive: boolean;
  messageTemplate: string;
  createdAt: string;
  updatedAt: string;
}

interface ReminderHistory {
  id: number;
  companyId: number;
  appointmentId: number;
  reminderType: string;
  clientPhone: string;
  message: string;
  sentAt: string;
  status: string;
  whatsappInstanceId: number;
}

type CompanyProfileData = z.infer<typeof companyProfileSchema>;
type CompanyPasswordData = z.infer<typeof companyPasswordSchema>;
type CompanyAiAgentData = z.infer<typeof companyAiAgentSchema>;
type WhatsappInstanceData = z.infer<typeof whatsappInstanceSchema>;
type WebhookConfigData = z.infer<typeof webhookConfigSchema>;
type BirthdayMessageData = z.infer<typeof birthdayMessageSchema>;

export default function CompanySettings() {
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [editingSettings, setEditingSettings] = useState<{ [key: string]: ReminderSettings }>({});

  const queryClient = useQueryClient();

  // Queries
  const { data: company } = useQuery({
    queryKey: ["/api/company/profile"],
  });

  const { data: whatsappInstances } = useQuery({
    queryKey: ["/api/whatsapp/instances"],
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: birthdayMessage } = useQuery({
    queryKey: ["/api/birthday-message"],
  });

  const { data: birthdayHistory = [] } = useQuery({
    queryKey: ["/api/birthday-message/history"],
  });

  const { data: reminderSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/reminder/settings"],
  });

  const { data: reminderHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/reminder/history"],
  });

  // Forms
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

  const webhookForm = useForm<WebhookConfigData>({
    resolver: zodResolver(webhookConfigSchema),
    defaultValues: {
      evolutionApiUrl: "",
      evolutionApiKey: "",
    },
  });

  const birthdayForm = useForm<BirthdayMessageData>({
    resolver: zodResolver(birthdayMessageSchema),
    defaultValues: {
      messageTemplate: birthdayMessage?.messageTemplate || "",
    },
  });

  // Mutations
  const profileMutation = useMutation({
    mutationFn: async (data: CompanyProfileData) => {
      const response = await fetch("/api/company/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar perfil");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Perfil atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/company/profile"] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar perfil", variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: CompanyPasswordData) => {
      const response = await fetch("/api/company/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar senha");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Senha atualizada com sucesso!" });
      passwordForm.reset();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar senha", variant: "destructive" });
    },
  });

  const aiAgentMutation = useMutation({
    mutationFn: async (data: CompanyAiAgentData) => {
      const response = await fetch("/api/company/ai-agent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar agente AI");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Agente AI atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/company/profile"] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar agente AI", variant: "destructive" });
    },
  });

  const whatsappMutation = useMutation({
    mutationFn: async (data: WhatsappInstanceData) => {
      const response = await fetch("/api/whatsapp/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar instância");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Instância criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/instances"] });
      whatsappForm.reset();
    },
    onError: () => {
      toast({ title: "Erro ao criar instância", variant: "destructive" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ReminderSettings> }) => {
      const response = await fetch(`/api/reminder/settings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar configuração");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configuração atualizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/reminder/settings"] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar configuração", variant: "destructive" });
    },
  });

  const testReminderMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/reminder/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erro ao enviar teste");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Lembrete de teste enviado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao enviar lembrete de teste", variant: "destructive" });
    },
  });

  const saveBirthdayMutation = useMutation({
    mutationFn: async (data: BirthdayMessageData) => {
      const response = await fetch("/api/birthday-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao salvar mensagem");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Mensagem de aniversário salva com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/birthday-message"] });
    },
    onError: () => {
      toast({ title: "Erro ao salvar mensagem", variant: "destructive" });
    },
  });

  const testBirthdayMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/birthday-message/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erro ao enviar teste");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Mensagem de teste enviada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao enviar mensagem de teste", variant: "destructive" });
    },
  });

  const sendBirthdayMutation = useMutation({
    mutationFn: async ({ clientId, clientName, clientPhone }: { clientId: number; clientName: string; clientPhone: string }) => {
      const response = await fetch("/api/birthday-message/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientName, clientPhone }),
      });
      if (!response.ok) throw new Error("Erro ao enviar mensagem");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Mensagem de aniversário enviada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/birthday-message/history"] });
    },
    onError: () => {
      toast({ title: "Erro ao enviar mensagem de aniversário", variant: "destructive" });
    },
  });

  // Handlers
  const onProfileSubmit = (data: CompanyProfileData) => {
    profileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: CompanyPasswordData) => {
    passwordMutation.mutate(data);
  };

  const onWhatsappSubmit = (data: WhatsappInstanceData) => {
    whatsappMutation.mutate(data);
  };

  const onAiAgentSubmit = (data: CompanyAiAgentData) => {
    aiAgentMutation.mutate(data);
  };

  const onBirthdayMessageSubmit = (data: BirthdayMessageData) => {
    saveBirthdayMutation.mutate(data);
  };

  const handleConnectWhatsapp = async (instanceId: number) => {
    try {
      const response = await fetch(`/api/whatsapp/qr/${instanceId}`);
      const data = await response.json();
      setQrCode(data.qrCode);
      setShowQrDialog(true);
    } catch (error) {
      toast({ title: "Erro ao gerar QR Code", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-gray-600">Gerencie as configurações e preferências da sua empresa</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="ai-agent" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Agente AI
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
                          <Input placeholder="Nome da empresa" {...field} />
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
                          <Input placeholder="00.000.000/0000-00" {...field} />
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
                          <Input placeholder="Endereço completo" {...field} />
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
                          <Input type="email" placeholder="email@empresa.com" {...field} />
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

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte
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
                          <Input type="password" placeholder="Digite sua senha atual" {...field} />
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
                          <Input type="password" placeholder="Digite a nova senha" {...field} />
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
                          <Input type="password" placeholder="Confirme a nova senha" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={passwordMutation.isPending}>
                    {passwordMutation.isPending ? "Atualizando..." : "Atualizar Senha"}
                  </Button>
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
                Gerencie suas conexões WhatsApp para envio de mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...whatsappForm}>
                <form onSubmit={whatsappForm.handleSubmit(onWhatsappSubmit)} className="space-y-4">
                  <FormField
                    control={whatsappForm.control}
                    name="instanceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Instância</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: empresa-principal" {...field} />
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
                        <FormLabel>URL da API (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.evolutionapi.com" {...field} />
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
                        <FormLabel>Chave da API (Opcional)</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Sua chave da API" {...field} />
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

              {whatsappInstances && (whatsappInstances as any[]).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Instâncias Ativas</h3>
                  <div className="grid gap-4">
                    {(whatsappInstances as any[]).map((instance: any) => (
                      <Card key={instance.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{instance.instanceName}</h4>
                            <p className="text-sm text-gray-500">
                              Status: {instance.status === "open" ? "Conectado" : "Desconectado"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={instance.status === "open" ? "default" : "destructive"}>
                              {instance.status === "open" ? "Ativo" : "Inativo"}
                            </Badge>
                            {instance.status !== "open" && (
                              <Button
                                size="sm"
                                onClick={() => handleConnectWhatsapp(instance.id)}
                              >
                                <QrCode className="w-4 h-4 mr-1" />
                                Conectar
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-agent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Agente AI</CardTitle>
              <CardDescription>
                Configure o comportamento do seu agente de atendimento automático
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...aiAgentForm}>
                <form onSubmit={aiAgentForm.handleSubmit(onAiAgentSubmit)} className="space-y-4">
                  <FormField
                    control={aiAgentForm.control}
                    name="aiAgentPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prompt do Agente AI</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Defina como o agente AI deve se comportar e responder aos clientes..."
                            className="min-h-[200px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={aiAgentMutation.isPending}>
                    {aiAgentMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </form>
              </Form>
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
          
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurações
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6 mt-6">
              {settingsLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Carregando configurações...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(reminderSettings as ReminderSettings[])?.map((setting) => {
                    const isEditing = editingSettings[setting.reminderType];
                    const currentSetting = isEditing || setting;
                    
                    return (
                      <Card key={setting.id} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                setting.reminderType === 'confirmation' ? 'bg-green-100' :
                                setting.reminderType === 'day_before' ? 'bg-yellow-100' :
                                'bg-red-100'
                              }`}>
                                {setting.reminderType === 'confirmation' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                                 setting.reminderType === 'day_before' ? <Clock className="w-5 h-5 text-yellow-600" /> :
                                 <AlertCircle className="w-5 h-5 text-red-600" />}
                              </div>
                              <div>
                                <CardTitle className="text-lg">
                                  {setting.reminderType === 'confirmation' ? 'Confirmação de Agendamento' :
                                   setting.reminderType === 'day_before' ? 'Lembrete 24h Antes' :
                                   'Lembrete 1h Antes'}
                                </CardTitle>
                                <CardDescription>
                                  {setting.reminderType === 'confirmation' ? 'Enviado imediatamente após criar o agendamento' :
                                   setting.reminderType === 'day_before' ? 'Enviado automaticamente 24 horas antes do agendamento' :
                                   'Enviado automaticamente 1 hora antes do agendamento'}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={currentSetting.isActive}
                                onCheckedChange={(checked) => {
                                  const updatedSetting = { ...currentSetting, isActive: checked };
                                  if (isEditing) {
                                    setEditingSettings({
                                      ...editingSettings,
                                      [setting.reminderType]: updatedSetting
                                    });
                                  } else {
                                    updateSettingsMutation.mutate({
                                      id: setting.id,
                                      data: { isActive: checked }
                                    });
                                  }
                                }}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (isEditing) {
                                    updateSettingsMutation.mutate({
                                      id: setting.id,
                                      data: editingSettings[setting.reminderType]
                                    });
                                    setEditingSettings(prev => {
                                      const newState = { ...prev };
                                      delete newState[setting.reminderType];
                                      return newState;
                                    });
                                  } else {
                                    setEditingSettings({
                                      ...editingSettings,
                                      [setting.reminderType]: { ...setting }
                                    });
                                  }
                                }}
                              >
                                <Edit3 className="w-4 h-4 mr-1" />
                                {isEditing ? "Salvar" : "Editar"}
                              </Button>
                              {isEditing && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSettings(prev => {
                                      const newState = { ...prev };
                                      delete newState[setting.reminderType];
                                      return newState;
                                    });
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Template da Mensagem
                            </label>
                            <Textarea
                              value={currentSetting.messageTemplate}
                              onChange={(e) => {
                                if (isEditing) {
                                  setEditingSettings({
                                    ...editingSettings,
                                    [setting.reminderType]: {
                                      ...currentSetting,
                                      messageTemplate: e.target.value
                                    }
                                  });
                                } else {
                                  setEditingSettings({
                                    ...editingSettings,
                                    [setting.reminderType]: {
                                      ...setting,
                                      messageTemplate: e.target.value
                                    }
                                  });
                                }
                              }}
                              placeholder="Digite o template da mensagem..."
                              className="min-h-[100px]"
                              disabled={!isEditing && !editingSettings[setting.reminderType]}
                            />
                            <div className="mt-2 text-xs text-gray-500">
                              <p className="font-medium">Variáveis disponíveis:</p>
                              <p><code className="bg-gray-100 px-1 rounded">{'{empresa}'}</code> - Nome da empresa</p>
                              <p><code className="bg-gray-100 px-1 rounded">{'{servico}'}</code> - Nome do serviço</p>
                              <p><code className="bg-gray-100 px-1 rounded">{'{horario}'}</code> - Data e hora do agendamento</p>
                              <p><code className="bg-gray-100 px-1 rounded">{'{profissional}'}</code> - Nome do profissional</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                        <Send className="w-5 h-5" />
                        Teste do Sistema
                      </CardTitle>
                      <CardDescription className="text-blue-600">
                        Envie um lembrete de teste para verificar se o sistema está funcionando
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => testReminderMutation.mutate()}
                        disabled={testReminderMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {testReminderMutation.isPending ? "Testando..." : "Enviar Teste"}
                      </Button>
                      <p className="text-sm text-gray-500 mt-2">
                        Um lembrete de teste será enviado para validar o funcionamento do sistema.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Histórico de Lembretes Enviados
                  </CardTitle>
                  <CardDescription>
                    Visualize todos os lembretes que foram enviados automaticamente pelo sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Carregando histórico...</p>
                    </div>
                  ) : (reminderHistory as ReminderHistory[])?.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">Nenhum lembrete enviado ainda</p>
                      <p className="text-sm text-gray-400">Os lembretes enviados aparecerão aqui</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(reminderHistory as ReminderHistory[])?.map((history) => (
                        <div key={history.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                history.reminderType === 'confirmation' ? 'bg-green-100' :
                                history.reminderType === 'day_before' ? 'bg-yellow-100' :
                                'bg-red-100'
                              }`}>
                                {history.reminderType === 'confirmation' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                                 history.reminderType === 'day_before' ? <Clock className="w-4 h-4 text-yellow-600" /> :
                                 <AlertCircle className="w-4 h-4 text-red-600" />}
                              </div>
                              <div>
                                <h4 className="font-medium">
                                  {history.reminderType === 'confirmation' ? 'Confirmação' :
                                   history.reminderType === 'day_before' ? '24h Antes' :
                                   '1h Antes'}
                                </h4>
                                <p className="text-sm text-gray-500">Para: {history.clientPhone}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={history.status === 'sent' ? 'default' : 'destructive'}
                                  className={`${
                                    history.status === 'sent' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {history.status === 'sent' ? 'Enviado' : 'Falha'}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {new Date(history.sentAt).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded border">
                            <p className="text-sm text-gray-700">{history.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
              Escaneie o QR Code com seu WhatsApp para conectar a instância
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {qrCode && (
              <img src={qrCode} alt="QR Code" className="w-64 h-64" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}