import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings, Building2, Lock, User, MessageSquare, Trash2, Plus, Smartphone, QrCode, RefreshCw, Bot, Key, Gift, Calendar, Bell, Clock, CheckCircle, Send, XCircle, LogOut } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { z } from "zod";
import { formatDocument, companyProfileSchema, companyPasswordSchema, companyAiAgentSchema, whatsappInstanceSchema, webhookConfigSchema, companySettingsSchema } from "@/lib/validations";

const birthdayMessageSchema = z.object({
  messageTemplate: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres"),
  isActive: z.boolean().default(true),
});

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
type CompanySettingsData = z.infer<typeof companySettingsSchema>;

export default function CompanySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompanyAuth();
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [editingSettings, setEditingSettings] = useState<{ [key: string]: ReminderSettings }>({});

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
      phoneNumber: "",
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

  const companySettingsForm = useForm<CompanySettingsData>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      birthdayMessage: "",
      aiAgentPrompt: "",
    },
    values: company ? {
      birthdayMessage: company.birthdayMessage || "",
      aiAgentPrompt: company.aiAgentPrompt || "",
    } : undefined,
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

  // Reminder queries
  const { data: reminderSettings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/company/reminder-settings'],
  });

  const { data: reminderHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['/api/company/reminder-history'],
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

  const onCompanySettingsSubmit = (data: CompanySettingsData) => {
    updateCompanySettingsMutation.mutate(data);
  };

  const createInstanceMutation = useMutation({
    mutationFn: async (data: WhatsappInstanceData) => {
      return await apiRequest("/api/company/whatsapp/instances", "POST", data);
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
      await apiRequest(`/api/company/whatsapp/instances/${instanceId}`, "DELETE");
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
      await apiRequest("/api/company/ai-agent", "PUT", data);
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

  const onBirthdayMessageSubmit = (data: BirthdayMessageData) => {
    createBirthdayMessageMutation.mutate(data);
  };

  const configureWebhookMutation = useMutation({
    mutationFn: async (instanceId: number) => {
      const response = await apiRequest(`/api/company/whatsapp/instances/${instanceId}/configure-webhook`, "POST");
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/whatsapp/instances"] });
      setShowWebhookDialog(false);
      setSelectedInstance(null);
      toast({
        title: "Agente IA configurado",
        description: "Webhook configurado com sucesso na Evolution API.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na configuração",
        description: error.message || "Erro ao configurar webhook do agente IA",
        variant: "destructive",
      });
    },
  });

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

  // Function to poll for QR code updates from database
  const pollForQrCode = async (instanceName: string): Promise<string | null> => {
    try {
      const instances = await apiRequest("GET", "/api/company/whatsapp/instances");
      const instance = instances.find((inst: any) => inst.instanceName === instanceName);
      return instance?.qrCode || null;
    } catch (error) {
      console.error("Error polling for QR code:", error);
      return null;
    }
  };

  // Function to refresh instance status from database
  const refreshInstanceStatus = async (instanceName: string) => {
    try {
      const response = await apiRequest(`/api/company/whatsapp/instances/${instanceName}/refresh-status`, "GET");
      if (response.ok) {
        const statusData = await response.json();
        // Refresh the instances list to update UI
        queryClient.invalidateQueries({ queryKey: ["/api/company/whatsapp/instances"] });
        return statusData.status;
      }
    } catch (error) {
      console.error("Error refreshing instance status:", error);
    }
    return null;
  };

  const connectInstanceMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      console.log(`🚀 Connecting instance: ${instanceName}`);
      // Trigger connection in Evolution API
      const result = await apiRequest(`/api/company/whatsapp/instances/${instanceName}/connect`, "GET");
      console.log("📱 Connect API Response:", result);
      return result;
    },
    onSuccess: async (data: any) => {
      console.log("✅ Connect API Success:", data);
      
      // Show modal immediately
      setShowQrDialog(true);
      
      // Check for QR code in multiple possible fields
      const qrCode = data.qrcode || data.base64 || data.qr || data.qr_code || 
                    data.data?.qrcode || data.data?.base64;
      
      console.log(`🔍 QR code found: ${!!qrCode}, Length: ${qrCode?.length || 0}`);
      console.log("🔍 QR code preview:", qrCode?.substring(0, 100));
      
      if (qrCode && qrCode.length > 100) {
        // QR code received directly from API
        console.log("✅ Setting QR code directly from API response");
        setQrCodeData(qrCode);
        toast({
          title: "QR code gerado",
          description: "Escaneie o QR code com seu WhatsApp.",
        });
      } else {
        // QR code not available yet, start polling
        console.log("⏳ QR code not ready, starting polling...");
        setQrCodeData("");
        toast({
          title: "Gerando QR code",
          description: "Aguarde enquanto o QR code é gerado...",
        });
        
        const instanceName = data.instanceName || selectedInstance?.instanceName;
        console.log(`📡 Polling for instance: ${instanceName}`);
        
        // Poll for QR code with timeout
        let attempts = 0;
        const maxAttempts = 15; // 30 seconds total
        
        const pollInterval = setInterval(async () => {
          attempts++;
          console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}`);
          const updatedQrCode = await pollForQrCode(instanceName);
          
          if (updatedQrCode && updatedQrCode.length > 100) {
            console.log("✅ QR code found via polling!");
            clearInterval(pollInterval);
            setQrCodeData(updatedQrCode);
            toast({
              title: "QR code gerado",
              description: "Escaneie o QR code com seu WhatsApp.",
            });
          } else if (attempts >= maxAttempts) {
            console.log("❌ Polling timeout reached");
            clearInterval(pollInterval);
            toast({
              title: "Timeout",
              description: "QR code não foi gerado. Tente novamente.",
              variant: "destructive",
            });
          }
        }, 2000); // Check every 2 seconds
      }

      // Start status polling to detect when connection is established
      const instanceName = data.instanceName || selectedInstance?.instanceName;
      if (instanceName) {
        const statusPollInterval = setInterval(async () => {
          const currentStatus = await refreshInstanceStatus(instanceName);
          if (currentStatus === 'connected') {
            clearInterval(statusPollInterval);
            setShowQrDialog(false);
            toast({
              title: "WhatsApp conectado!",
              description: "Sua instância WhatsApp foi conectada com sucesso.",
            });
          }
        }, 3000); // Check every 3 seconds

        // Clear status polling after 2 minutes
        setTimeout(() => {
          clearInterval(statusPollInterval);
        }, 120000);
      }
    },
    onError: (error: any) => {
      let errorMessage = error.message || "Erro ao conectar instância";
      
      if (error.message?.includes("Evolution API não configurada")) {
        errorMessage = "Configure a Evolution API nas configurações do administrador antes de conectar instâncias WhatsApp.";
      } else if (error.message?.includes("Instância não encontrada")) {
        errorMessage = "Esta instância não foi encontrada na Evolution API. Verifique se foi criada corretamente.";
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
      const response = await apiRequest(`/api/company/whatsapp/instances/${instanceName}/disconnect`, "POST");
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

  const getQrCodeMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const response = await apiRequest(`/api/company/whatsapp/instances/${instanceName}/qrcode`, "GET");
      return response;
    },
    onSuccess: (data: any) => {
      if (data.qrcode) {
        setQrCodeData(data.qrcode);
        setShowQrDialog(true);
        toast({
          title: "QR Code gerado",
          description: "Escaneie o QR code com seu WhatsApp para conectar.",
        });
      } else {
        toast({
          title: "QR Code não disponível",
          description: "A instância pode já estar conectada ou não estar pronta.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao buscar QR Code",
        description: error.message || "Erro ao buscar QR code da instância",
        variant: "destructive",
      });
    },
  });

  // State for AI agent testing
  const [testMessage, setTestMessage] = useState("");
  const [agentResponse, setAgentResponse] = useState("");
  
  // State for birthday message testing
  const [testPhoneNumber, setTestPhoneNumber] = useState("");

  // Birthday messaging form
  const birthdayForm = useForm<BirthdayMessageData>({
    resolver: zodResolver(birthdayMessageSchema),
    defaultValues: {
      messageTemplate: "Que este novo ano de vida seja repleto de alegrias, conquistas e momentos especiais.\n\nPara comemorar, que tal agendar um horário especial conosco? 🎉✨\n\nFeliz aniversário! 🎂",
      isActive: true,
    },
  });

  // Birthday messages queries
  const { data: birthdayMessages = [] } = useQuery<any[]>({
    queryKey: ["/api/company/birthday-messages"],
  });

  const { data: birthdayHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/company/birthday-message-history"],
  });

  // Client data for birthday functionality
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/company/clients"],
  });

  // Update form when birthday messages are loaded
  useEffect(() => {
    if (birthdayMessages.length > 0) {
      const activeMessage = birthdayMessages.find((msg: any) => msg.isActive) || birthdayMessages[0];
      birthdayForm.reset({
        messageTemplate: activeMessage.messageTemplate,
        isActive: activeMessage.isActive,
      });
    }
  }, [birthdayMessages, birthdayForm]);

  const createBirthdayMessageMutation = useMutation({
    mutationFn: async (data: BirthdayMessageData) => {
      return await apiRequest("POST", "/api/company/birthday-messages", data);
    },
    onSuccess: () => {
      toast({
        title: "Mensagem salva",
        description: "Mensagem de aniversário configurada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company/birthday-messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar mensagem",
        description: error.message || "Erro ao configurar mensagem de aniversário",
        variant: "destructive",
      });
    },
  });

  const sendBirthdayMessageMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest(`/api/company/send-birthday-message/${clientId}`, "POST");
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Mensagem enviada",
        description: `Mensagem de aniversário enviada para ${data.client}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company/birthday-message-history"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Erro ao enviar mensagem de aniversário",
        variant: "destructive",
      });
    },
  });

  const testBirthdayMessageMutation = useMutation({
    mutationFn: async () => {
      if (!testPhoneNumber.trim()) {
        throw new Error("Número de telefone é obrigatório para o teste");
      }
      const response = await apiRequest("POST", "/api/company/test-birthday-message", {
        testPhoneNumber: testPhoneNumber.trim()
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: data.success ? "Mensagem de teste enviada" : "Erro no teste",
        description: data.message || `Mensagem enviada para ${testPhoneNumber}`,
        variant: data.success ? "default" : "destructive",
      });
      if (data.success) {
        setTestPhoneNumber(""); // Limpar o campo apenas se bem-sucedido
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste",
        description: error.message || "Erro ao testar mensagem de aniversário",
        variant: "destructive",
      });
    },
  });

  const testAgentMutation = useMutation({
    mutationFn: async () => {
      console.log("Testing AI agent with message:", testMessage);
      const response = await apiRequest("/api/company/ai-agent/test", "POST", {
        message: testMessage
      });
      console.log("AI test response:", response);
      return response;
    },
    onSuccess: (data: any) => {
      setAgentResponse(data.response);
      toast({
        title: "Teste realizado",
        description: "O agente IA respondeu com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("AI Test Error:", error);
      toast({
        title: "Erro no teste",
        description: error.message || "Erro ao testar o agente IA",
        variant: "destructive",
      });
    },
  });

  // Reminder mutations
  const updateReminderSettingsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ReminderSettings> }) => {
      const response = await apiRequest(`/api/company/reminder-settings/${id}`, "PUT", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/reminder-settings'] });
      toast({
        title: "Configurações atualizadas",
        description: "As configurações de lembrete foram atualizadas com sucesso.",
      });
      setEditingSettings({});
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações de lembrete.",
        variant: "destructive",
      });
    },
  });

  const testReminderMutation = useMutation({
    mutationFn: async (phoneNumber?: string) => {
      const response = await apiRequest("/api/company/test-reminder", "POST", { 
        testPhone: phoneNumber 
      });
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/reminder-history'] });
      toast({
        title: data.success ? "Teste realizado" : "Erro no teste",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao testar função de lembrete.",
        variant: "destructive",
      });
    },
  });

  const updateCompanySettingsMutation = useMutation({
    mutationFn: async (data: CompanySettingsData) => {
      return await apiRequest("/api/company/settings-update", "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/auth/profile"] });
      toast({
        title: "Sucesso",
        description: "Configurações atualizadas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações.",
        variant: "destructive",
      });
    },
  });

  const configureWhatsappMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const settingsPayload = {
        rejectCall: true,
        msgCall: "I do not accept calls",
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: true,
        syncFullHistory: false,
        readStatus: true
      };
      
      return await apiRequest(`/api/company/whatsapp/instances/${instanceName}/configure`, "POST", settingsPayload);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Configurações do WhatsApp aplicadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/company/whatsapp/instances'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao configurar WhatsApp.",
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
              <Smartphone className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="company-settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Lembretes
            </TabsTrigger>
            <TabsTrigger value="ai-agent" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              IA
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

        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Instâncias do WhatsApp
              </CardTitle>
              <CardDescription>
                Gerencie suas instâncias de WhatsApp para envio de mensagens automáticas.
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
                          <Input placeholder="Ex: principal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={whatsappForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 5511999999999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
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
              <CardTitle className="flex items-center justify-between">
                <span>Instâncias Configuradas</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/company/whatsapp/instances'] });
                    whatsappInstances.forEach(instance => {
                      refreshInstanceStatus(instance.instanceName);
                    });
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar Status
                </Button>
              </CardTitle>
              <CardDescription>
                Lista de todas as instâncias WhatsApp configuradas para sua empresa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInstances ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : whatsappInstances.length > 0 ? (
                <div className="space-y-4">
                  {whatsappInstances.map((instance: any) => {
                    const isConnected = instance.status === "connected" || instance.status === "open";
                    const isConnecting = instance.status === "connecting";
                    
                    return (
                      <div key={instance.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium">{instance.instanceName}</h3>
                              <Badge 
                                variant={isConnected ? "default" : isConnecting ? "secondary" : "outline"}
                                className={isConnected ? "bg-green-600" : isConnecting ? "bg-yellow-500" : ""}
                              >
                                {isConnected ? "Conectado" : isConnecting ? "Conectando..." : "Desconectado"}
                              </Badge>
                            </div>

                            {instance.webhook && (
                              <p className="text-xs text-blue-600 mt-1">
                                Webhook: {instance.webhook}
                              </p>
                            )}
                            
                            <p className="text-xs text-gray-500 mt-1">
                              Status: {instance.status || 'desconhecido'} | Última atualização: {instance.updatedAt ? new Date(instance.updatedAt).toLocaleString('pt-BR') : 'N/A'}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refreshInstanceStatus(instance.instanceName)}
                                className="flex items-center gap-2"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Verificar
                              </Button>
                              
                              {!isConnected && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInstance(instance);
                                    getQrCodeMutation.mutate(instance.instanceName);
                                  }}
                                  disabled={getQrCodeMutation.isPending}
                                  className="flex items-center gap-2"
                                >
                                  <QrCode className="w-4 h-4" />
                                  {getQrCodeMutation.isPending ? "Gerando..." : "Gerar QR Code"}
                                </Button>
                              )}
                              
                              {isConnected && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Add disconnect functionality
                                    fetch(`/api/company/whatsapp/instances/${instance.instanceName}/disconnect`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' }
                                    }).then(() => {
                                      queryClient.invalidateQueries({ queryKey: ['/api/company/whatsapp/instances'] });
                                      refreshInstanceStatus(instance.instanceName);
                                    });
                                  }}
                                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                                >
                                  <LogOut className="w-4 h-4" />
                                  Desconectar
                                </Button>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedInstance(instance);
                                  setShowWebhookDialog(true);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Bot className="w-4 h-4" />
                                Configurar IA
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => configureWhatsappMutation.mutate(instance.instanceName)}
                                disabled={configureWhatsappMutation.isPending}
                                className="flex items-center gap-2"
                              >
                                <Settings className="w-4 h-4" />
                                {configureWhatsappMutation.isPending ? "Configurando..." : "Configurar WhatsApp"}
                              </Button>
                              
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteInstanceMutation.mutate(instance.id)}
                                disabled={deleteInstanceMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed">
                  <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhuma instância configurada</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Crie sua primeira instância WhatsApp para começar a enviar mensagens
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company-settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Mensagem de Aniversário
              </CardTitle>
              <CardDescription>
                Configure a mensagem personalizada que será enviada aos seus clientes no aniversário deles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...companySettingsForm}>
                <form onSubmit={companySettingsForm.handleSubmit(onCompanySettingsSubmit)} className="space-y-6">
                  <FormField
                    control={companySettingsForm.control}
                    name="birthdayMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem de Aniversário</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Exemplo: Olá {NOME}! A equipe da {EMPRESA} deseja um feliz aniversário! 🎉🎂 Que este novo ano de vida seja repleto de alegrias e conquistas!"
                            className="min-h-[120px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-sm text-gray-500">
                          <p>• Use <code className="bg-gray-100 px-1 rounded">{"{NOME}"}</code> para inserir o nome do cliente</p>
                          <p>• Use <code className="bg-gray-100 px-1 rounded">{"{EMPRESA}"}</code> para inserir o nome da sua empresa</p>
                          <p>• A mensagem será enviada automaticamente via WhatsApp no aniversário</p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companySettingsForm.control}
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
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateCompanySettingsMutation.isPending}
                      className="min-w-[140px]"
                    >
                      {updateCompanySettingsMutation.isPending ? (
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
                <Form {...birthdayForm}>
                  <form onSubmit={birthdayForm.handleSubmit(onBirthdayMessageSubmit)} className="space-y-4">
                    <FormField
                      control={birthdayForm.control}
                      name="messageTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Digite sua mensagem de aniversário personalizada..."
                              className="min-h-[120px] bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-sm text-pink-700">
                      Use <strong>{"{NOME}"}</strong> para o nome do cliente e <strong>{"{EMPRESA}"}</strong> para o nome da empresa
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="bg-pink-600 hover:bg-pink-700"
                        disabled={createBirthdayMessageMutation.isPending}
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        {createBirthdayMessageMutation.isPending ? "Salvando..." : "Salvar Mensagem"}
                      </Button>
                    </div>
                    
                    {/* Test section */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                      <h5 className="font-medium text-gray-900 mb-3">Testar Mensagem</h5>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite o número para teste (ex: 5511999999999)"
                          value={testPhoneNumber}
                          onChange={(e) => setTestPhoneNumber(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline"
                          onClick={() => testBirthdayMessageMutation.mutate()}
                          disabled={testBirthdayMessageMutation.isPending || !testPhoneNumber.trim()}
                        >
                          {testBirthdayMessageMutation.isPending ? "Enviando..." : "Enviar Teste"}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        A mensagem será enviada via WhatsApp para o número informado
                      </p>
                    </div>
                  </form>
                </Form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gift className="w-5 h-5 text-pink-600" />
                      Aniversariantes de Hoje
                      <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                        {clients.filter(client => {
                          if (!client.birthDate) return false;
                          const today = new Date();
                          const todayMonth = today.getMonth() + 1; // 1-12
                          const todayDay = today.getDate();
                          
                          // Extract date components directly from ISO string
                          const dateString = client.birthDate.toString();
                          if (dateString.includes('T')) {
                            const datePart = dateString.split('T')[0];
                            const [year, month, day] = datePart.split('-').map(Number);
                            return month === todayMonth && day === todayDay;
                          }
                          return false;
                        }).length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clients.filter(client => {
                      if (!client.birthDate) return false;
                      const today = new Date();
                      const todayMonth = today.getMonth() + 1; // 1-12
                      const todayDay = today.getDate();
                      
                      // Extract date components directly from ISO string
                      const dateString = client.birthDate.toString();
                      if (dateString.includes('T')) {
                        const datePart = dateString.split('T')[0];
                        const [year, month, day] = datePart.split('-').map(Number);
                        return month === todayMonth && day === todayDay;
                      }
                      return false;
                    }).length > 0 ? (
                      <div className="space-y-3">
                        {clients.filter(client => {
                          if (!client.birthDate) return false;
                          const today = new Date();
                          const todayMonth = today.getMonth() + 1; // 1-12
                          const todayDay = today.getDate();
                          
                          // Extract date components directly from ISO string
                          const dateString = client.birthDate.toString();
                          if (dateString.includes('T')) {
                            const datePart = dateString.split('T')[0];
                            const [year, month, day] = datePart.split('-').map(Number);
                            return month === todayMonth && day === todayDay;
                          }
                          return false;
                        }).map(client => (
                          <div key={client.id} className="bg-pink-50 p-3 rounded-lg border border-pink-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-pink-900">{client.name}</p>
                                <p className="text-sm text-pink-600">{client.phone || 'Sem telefone'}</p>
                              </div>
                              <Button 
                                size="sm" 
                                className="bg-pink-600 hover:bg-pink-700"
                                onClick={() => sendBirthdayMessageMutation.mutate(client.id)}
                                disabled={sendBirthdayMessageMutation.isPending}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-600">Nenhum aniversariante hoje</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Aniversariantes do Mês
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {clients.filter(client => {
                          if (!client.birthDate) return false;
                          const today = new Date();
                          const todayMonth = today.getMonth() + 1; // 1-12
                          
                          // Extract date components directly from ISO string
                          const dateString = client.birthDate.toString();
                          if (dateString.includes('T')) {
                            const datePart = dateString.split('T')[0];
                            const [year, month, day] = datePart.split('-').map(Number);
                            return month === todayMonth;
                          }
                          return false;
                        }).length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clients.filter(client => {
                      if (!client.birthDate) return false;
                      const today = new Date();
                      const todayMonth = today.getMonth() + 1; // 1-12
                      
                      // Extract date components directly from ISO string
                      const dateString = client.birthDate.toString();
                      if (dateString.includes('T')) {
                        const datePart = dateString.split('T')[0];
                        const [year, month, day] = datePart.split('-').map(Number);
                        return month === todayMonth;
                      }
                      return false;
                    }).length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {clients.filter(client => {
                          if (!client.birthDate) return false;
                          const today = new Date();
                          const todayMonth = today.getMonth() + 1; // 1-12
                          
                          // Extract date components directly from ISO string
                          const dateString = client.birthDate.toString();
                          if (dateString.includes('T')) {
                            const datePart = dateString.split('T')[0];
                            const [year, month, day] = datePart.split('-').map(Number);
                            return month === todayMonth;
                          }
                          return false;
                        }).map(client => {
                          // Extract date for display
                          const dateString = client.birthDate!.toString();
                          let displayDate = '';
                          let isToday = false;
                          if (dateString.includes('T')) {
                            const datePart = dateString.split('T')[0];
                            const [year, month, day] = datePart.split('-').map(Number);
                            displayDate = `${day.toString().padStart(2, '0')} de ${['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][month - 1]}`;
                            
                            // Check if it's today
                            const today = new Date();
                            const todayMonth = today.getMonth() + 1;
                            const todayDay = today.getDate();
                            isToday = month === todayMonth && day === todayDay;
                          }
                          return (
                            <div key={client.id} className={`p-2 rounded border ${isToday ? 'bg-pink-50 border-pink-200' : 'bg-blue-50 border-blue-200'}`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className={`font-medium ${isToday ? 'text-pink-900' : 'text-blue-900'}`}>{client.name}</p>
                                  <p className={`text-sm ${isToday ? 'text-pink-600' : 'text-blue-600'}`}>
                                    {displayDate}
                                    {isToday && ' - Hoje!'}
                                  </p>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-pink-500' : 'bg-blue-500'}`}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-600">Nenhum aniversariante este mês</p>
                      </div>
                    )}
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
                  {birthdayHistory.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {(birthdayHistory as any[]).map((history: any) => (
                        <div key={history.id} className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-green-900">{history.clientName}</p>
                              <p className="text-sm text-green-600">{history.clientPhone}</p>
                              <p className="text-xs text-green-500 mt-1">
                                Enviado em {new Date(history.sentAt).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={history.status === 'sent' ? 'default' : 'destructive'} 
                                className={history.status === 'sent' ? 'bg-green-600' : ''}
                              >
                                {history.status === 'sent' ? 'Enviado' : 'Erro'}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-2 p-2 bg-white rounded border border-green-100">
                            <p className="text-sm text-gray-700 line-clamp-2">{history.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">Nenhuma mensagem de aniversário enviada ainda</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Sistema de Lembretes
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Sistema Ativo
                </Badge>
              </CardTitle>
              <CardDescription>
                Envia lembretes automáticos via WhatsApp para os clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Automático</p>
                    <p className="text-sm text-yellow-700">
                      Os lembretes são enviados automaticamente pelo sistema. Certifique-se de que há uma instância de WhatsApp conectada e ativa.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Lembrete de 1 dia
                    </CardTitle>
                    <CardDescription>
                      Enviado 24 horas antes do agendamento para lembrar o cliente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {settingsLoading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                      </div>
                    ) : (
                      <>
                        {(reminderSettings as ReminderSettings[])
                          .filter(setting => setting.reminderType === '24h')
                          .map(setting => (
                            <div key={setting.id}>
                              <div className="flex items-center justify-between mb-3">
                                <Label htmlFor={`active-${setting.id}`}>Ativo</Label>
                                <Switch
                                  id={`active-${setting.id}`}
                                  checked={setting.isActive}
                                  onCheckedChange={(checked) => {
                                    updateReminderSettingsMutation.mutate({
                                      id: setting.id,
                                      data: { isActive: checked }
                                    });
                                  }}
                                  disabled={updateReminderSettingsMutation.isPending}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`template-${setting.id}`}>Template da Mensagem</Label>
                                <Textarea
                                  id={`template-${setting.id}`}
                                  value={editingSettings[setting.id]?.messageTemplate ?? setting.messageTemplate}
                                  onChange={(e) => {
                                    setEditingSettings(prev => ({
                                      ...prev,
                                      [setting.id]: {
                                        ...setting,
                                        messageTemplate: e.target.value
                                      }
                                    }));
                                  }}
                                  className="min-h-[100px]"
                                  placeholder="Digite o template da mensagem..."
                                />
                                {editingSettings[setting.id] && (
                                  <div className="flex gap-2 mt-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        updateReminderSettingsMutation.mutate({
                                          id: setting.id,
                                          data: { messageTemplate: editingSettings[setting.id].messageTemplate }
                                        });
                                      }}
                                      disabled={updateReminderSettingsMutation.isPending}
                                    >
                                      Salvar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingSettings(prev => {
                                          const newSettings = { ...prev };
                                          delete newSettings[setting.id];
                                          return newSettings;
                                        });
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      Lembrete de 1 hora
                    </CardTitle>
                    <CardDescription>
                      Enviado 1 hora antes do agendamento como lembrete final
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {settingsLoading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                      </div>
                    ) : (
                      <>
                        {(reminderSettings as ReminderSettings[])
                          .filter(setting => setting.reminderType === '1h')
                          .map(setting => (
                            <div key={setting.id}>
                              <div className="flex items-center justify-between mb-3">
                                <Label htmlFor={`active-${setting.id}`}>Ativo</Label>
                                <Switch
                                  id={`active-${setting.id}`}
                                  checked={setting.isActive}
                                  onCheckedChange={(checked) => {
                                    updateReminderSettingsMutation.mutate({
                                      id: setting.id,
                                      data: { isActive: checked }
                                    });
                                  }}
                                  disabled={updateReminderSettingsMutation.isPending}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`template-${setting.id}`}>Template da Mensagem</Label>
                                <Textarea
                                  id={`template-${setting.id}`}
                                  value={editingSettings[setting.id]?.messageTemplate ?? setting.messageTemplate}
                                  onChange={(e) => {
                                    setEditingSettings(prev => ({
                                      ...prev,
                                      [setting.id]: {
                                        ...setting,
                                        messageTemplate: e.target.value
                                      }
                                    }));
                                  }}
                                  className="min-h-[100px]"
                                  placeholder="Digite o template da mensagem..."
                                />
                                {editingSettings[setting.id] && (
                                  <div className="flex gap-2 mt-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        updateReminderSettingsMutation.mutate({
                                          id: setting.id,
                                          data: { messageTemplate: editingSettings[setting.id].messageTemplate }
                                        });
                                      }}
                                      disabled={updateReminderSettingsMutation.isPending}
                                    >
                                      Salvar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingSettings(prev => {
                                          const newSettings = { ...prev };
                                          delete newSettings[setting.id];
                                          return newSettings;
                                        });
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4 mt-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Send className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Teste da Função de Lembrete</p>
                      <p className="text-sm text-blue-700 mb-3">
                        Envie uma mensagem de teste via WhatsApp para verificar a integração
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="test-phone">Número de telefone para teste</Label>
                        <Input
                          id="test-phone"
                          type="tel"
                          placeholder="Ex: (11) 99999-9999"
                          value={testPhoneNumber}
                          onChange={(e) => setTestPhoneNumber(e.target.value)}
                          className="max-w-xs"
                        />
                        <p className="text-xs text-blue-600">
                          Digite um número válido do WhatsApp para testar a integração
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => testReminderMutation.mutate(testPhoneNumber)}
                    disabled={testReminderMutation.isPending || !testPhoneNumber.trim()}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {testReminderMutation.isPending ? "Testando..." : "Testar Função"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/company/reminder-settings'] })}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Clock className="w-5 h-5" />
                Histórico de Lembretes
              </CardTitle>
              <CardDescription>
                Lembretes enviados recentemente pelo sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (reminderHistory as ReminderHistory[]).length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(reminderHistory as ReminderHistory[]).map((history) => (
                    <div key={history.id} className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-green-900">{history.clientPhone}</p>
                            <Badge 
                              variant={history.status === 'sent' ? 'default' : 'destructive'} 
                              className={history.status === 'sent' ? 'bg-green-600' : ''}
                            >
                              {history.status === 'sent' ? 'Enviado' : 'Erro'}
                            </Badge>
                          </div>
                          <p className="text-sm text-green-600 mb-2">
                            Tipo: {history.reminderType === '24h' ? '1 dia antes' : '1 hora antes'}
                          </p>
                          <p className="text-xs text-green-500">
                            Enviado em {new Date(history.sentAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {history.status === 'sent' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-white rounded border border-green-100">
                        <p className="text-sm text-gray-700">{history.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhum lembrete enviado ainda</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Os lembretes aparecerão aqui quando forem enviados automaticamente
                  </p>
                </div>
              )}
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
        <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
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
                  onClick={() => setShowWebhookDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (selectedInstance) {
                      configureWebhookMutation.mutate(selectedInstance.id);
                    }
                  }}
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