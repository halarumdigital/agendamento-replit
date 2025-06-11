import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Settings, Palette, MessageSquare, Globe, Brain, Upload, X, Image } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { settingsSchema } from "@/lib/validations";
import type { GlobalSettings } from "@shared/schema";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fetchingModels, setFetchingModels] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useQuery<GlobalSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: openaiModels, isLoading: isLoadingModels, refetch: refetchModels } = useQuery<{ models: Array<{ id: string; name: string }> }>({
    queryKey: ["/api/openai/models"],
    enabled: false, // Only fetch when explicitly triggered
  });

  const fetchModels = async () => {
    setFetchingModels(true);
    try {
      await refetchModels();
      toast({
        title: "Modelos carregados",
        description: "Lista de modelos OpenAI atualizada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar modelos",
        description: error.message || "Não foi possível carregar os modelos da OpenAI",
        variant: "destructive",
      });
    } finally {
      setFetchingModels(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione uma imagem.",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;
    
    const formData = new FormData();
    formData.append('logo', logoFile);
    
    try {
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Falha no upload do logo');
      }
      
      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    form.setValue("logoUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFaviconSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione uma imagem.",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      setFaviconFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFaviconPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFavicon = async (): Promise<string | null> => {
    if (!faviconFile) return null;
    
    const formData = new FormData();
    formData.append('favicon', faviconFile);
    
    try {
      const response = await fetch('/api/upload/favicon', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Falha no upload do favicon');
      }
      
      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error('Error uploading favicon:', error);
      throw error;
    }
  };

  const removeFavicon = () => {
    setFaviconFile(null);
    setFaviconPreview("");
    form.setValue("faviconUrl", "");
    if (faviconInputRef.current) {
      faviconInputRef.current.value = "";
    }
  };

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      systemName: "",
      logoUrl: "",
      faviconUrl: "",
      primaryColor: "#2563eb",
      secondaryColor: "#64748b",
      backgroundColor: "#f8fafc",
      textColor: "#1e293b",
      evolutionApiUrl: "",
      evolutionApiGlobalKey: "",
      openaiApiKey: "",
      openaiModel: "gpt-4o",
      openaiTemperature: "0.7",
      openaiMaxTokens: "4000",
      smtpHost: "",
      smtpPort: "",
      smtpUser: "",
      smtpPassword: "",
      smtpFromEmail: "",
      smtpFromName: "",
      smtpSecure: "tls",
    },
    values: settings ? {
      systemName: settings.systemName,
      logoUrl: settings.logoUrl || "",
      faviconUrl: settings.faviconUrl || "",
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      backgroundColor: settings.backgroundColor,
      textColor: settings.textColor,
      evolutionApiUrl: settings.evolutionApiUrl || "",
      evolutionApiGlobalKey: settings.evolutionApiGlobalKey || "",
      openaiApiKey: (settings as any).openaiApiKey || "",
      openaiModel: (settings as any).openaiModel || "gpt-4o",
      openaiTemperature: (settings as any).openaiTemperature?.toString() || "0.7",
      openaiMaxTokens: (settings as any).openaiMaxTokens?.toString() || "4000",
      smtpHost: (settings as any).smtpHost || "",
      smtpPort: (settings as any).smtpPort || "",
      smtpUser: (settings as any).smtpUser || "",
      smtpPassword: (settings as any).smtpPassword || "",
      smtpFromEmail: (settings as any).smtpFromEmail || "",
      smtpFromName: (settings as any).smtpFromName || "",
      smtpSecure: (settings as any).smtpSecure || "tls",
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return await apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Configurações atualizadas",
        description: "As configurações foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar as configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    try {
      // Upload logo if a new file was selected
      let logoUrl = data.logoUrl || "";
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (!uploadedUrl) {
          throw new Error("Falha no upload do logo");
        }
        logoUrl = uploadedUrl;
      }

      // Upload favicon if a new file was selected
      let faviconUrl = data.faviconUrl || "";
      if (faviconFile) {
        const uploadedUrl = await uploadFavicon();
        if (!uploadedUrl) {
          throw new Error("Falha no upload do favicon");
        }
        faviconUrl = uploadedUrl;
      }

      // Ensure all fields are strings for the API
      const processedData = {
        ...data,
        logoUrl,
        faviconUrl,
        openaiModel: data.openaiModel || "gpt-4o",
        openaiTemperature: data.openaiTemperature?.toString() || "0.7",
        openaiMaxTokens: data.openaiMaxTokens?.toString() || "4000",
      };
      
      updateMutation.mutate(processedData);
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao fazer upload do logo",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Configurações</h1>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Aparência
              </TabsTrigger>
              <TabsTrigger value="evolution" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Evolution API
              </TabsTrigger>
              <TabsTrigger value="openai" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                OpenAI
              </TabsTrigger>
              <TabsTrigger value="smtp" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                SMTP
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Configurações Gerais
                  </CardTitle>
                  <CardDescription>
                    Configure as informações básicas do sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="systemName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Sistema</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome do sistema" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo do Sistema</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {/* Preview do logo atual */}
                            {(logoPreview || field.value || settings?.logoUrl) && (
                              <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                                <div className="relative">
                                  <img
                                    src={logoPreview || field.value || settings?.logoUrl || ""}
                                    alt="Logo atual"
                                    className="h-12 w-auto max-w-[150px] object-contain rounded border bg-white px-2"
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={removeLogo}
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Logo atual</p>
                                  <p className="text-xs text-gray-500">
                                    {logoFile ? logoFile.name : "Logo configurado"}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Área de upload */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="logo-upload"
                              />
                              <label htmlFor="logo-upload" className="cursor-pointer">
                                <div className="mx-auto flex flex-col items-center">
                                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                  <p className="text-sm font-medium text-gray-700 mb-1">
                                    Clique para selecionar uma imagem
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    PNG, JPG, GIF até 5MB
                                  </p>
                                </div>
                              </label>
                            </div>

                            {/* Campo de URL alternativo */}
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-600">
                                Ou insira uma URL da imagem:
                              </Label>
                              <Input 
                                placeholder="https://exemplo.com/logo.png" 
                                {...field}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Favicon Upload Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Favicon do Sistema
                  </CardTitle>
                  <CardDescription>
                    Adicione um favicon personalizado que aparecerá na aba do navegador.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="faviconUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Favicon</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {/* Preview do favicon atual */}
                            {(faviconPreview || field.value) && (
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="relative">
                                  <img 
                                    src={faviconPreview || field.value} 
                                    alt="Favicon preview" 
                                    className="w-8 h-8 rounded object-cover border"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={removeFavicon}
                                    className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-700">
                                    {faviconFile ? faviconFile.name : "Favicon configurado"}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Área de upload */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                              <input
                                ref={faviconInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFaviconSelect}
                                className="hidden"
                                id="favicon-upload"
                              />
                              <label htmlFor="favicon-upload" className="cursor-pointer">
                                <div className="mx-auto flex flex-col items-center">
                                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                  <p className="text-sm font-medium text-gray-700 mb-1">
                                    Clique para selecionar uma imagem
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    PNG, JPG, ICO até 5MB (recomendado: 32x32px)
                                  </p>
                                </div>
                              </label>
                            </div>

                            {/* Campo de URL alternativo */}
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-600">
                                Ou insira uma URL da imagem:
                              </Label>
                              <Input 
                                placeholder="https://exemplo.com/favicon.ico" 
                                {...field}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Personalização Visual
                  </CardTitle>
                  <CardDescription>
                    Customize as cores e aparência do sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor Primária</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input type="color" className="w-16 h-10 p-1" {...field} />
                            <Input placeholder="#2563eb" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor Secundária</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input type="color" className="w-16 h-10 p-1" {...field} />
                            <Input placeholder="#64748b" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="backgroundColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor de Fundo</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input type="color" className="w-16 h-10 p-1" {...field} />
                            <Input placeholder="#f8fafc" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="textColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor do Texto</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input type="color" className="w-16 h-10 p-1" {...field} />
                            <Input placeholder="#1e293b" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evolution" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Evolution API
                  </CardTitle>
                  <CardDescription>
                    Configure a integração com a Evolution API para WhatsApp.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="evolutionApiUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL da Evolution API</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.evolution.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="evolutionApiGlobalKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Global Key</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Digite a chave global da API" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-blue-900 mb-2">Como configurar:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• URL: Endereço completo da sua instância Evolution API</li>
                      <li>• Global Key: Chave de autenticação global da API</li>
                      <li>• Essas configurações são necessárias para integração com WhatsApp</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="openai" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Configuração OpenAI
                  </CardTitle>
                  <CardDescription>
                    Configure a integração com a OpenAI para funcionalidades de IA.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="openaiApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave da API OpenAI</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="sk-..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="openaiModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          <span>Modelo</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={fetchModels}
                            disabled={fetchingModels || isLoadingModels}
                            className="h-6 px-2 text-xs"
                          >
                            {fetchingModels || isLoadingModels ? "Carregando..." : "Carregar Modelos"}
                          </Button>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o modelo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {openaiModels?.models && openaiModels.models.length > 0 ? (
                              openaiModels.models.map((model: any) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="gpt-4o">GPT-4o (Mais avançado)</SelectItem>
                                <SelectItem value="gpt-4o-mini">GPT-4o Mini (Mais rápido)</SelectItem>
                                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Econômico)</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        {openaiModels?.models && openaiModels.models.length > 0 && (
                          <p className="text-xs text-green-600">
                            {openaiModels.models.length} modelos carregados da OpenAI API
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="openaiTemperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperatura (0.0 - 2.0)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            max="2"
                            placeholder="0.7" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="openaiMaxTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Máximo de Tokens</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            max="200000"
                            placeholder="4000" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-green-900 mb-2">Configuração OpenAI:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• <strong>API Key:</strong> Obtenha em platform.openai.com</li>
                      <li>• <strong>Temperatura:</strong> Controla a criatividade (0 = determinístico, 2 = muito criativo)</li>
                      <li>• <strong>Tokens:</strong> Limite máximo de tokens por resposta</li>
                      <li>• <strong>Modelo:</strong> GPT-4o recomendado para melhor performance</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="smtp" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Configurações SMTP
                  </CardTitle>
                  <CardDescription>
                    Configure o servidor de email para recuperação de senhas e notificações.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="smtpHost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servidor SMTP</FormLabel>
                        <FormControl>
                          <Input placeholder="smtp.gmail.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porta SMTP</FormLabel>
                        <FormControl>
                          <Input placeholder="587" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpUser"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuário SMTP</FormLabel>
                        <FormControl>
                          <Input placeholder="seu-email@gmail.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha SMTP</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Senha ou App Password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpFromEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Remetente</FormLabel>
                        <FormControl>
                          <Input placeholder="noreply@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpFromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Remetente</FormLabel>
                        <FormControl>
                          <Input placeholder="Sistema de Gestão" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpSecure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Segurança</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de segurança" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tls">TLS (Recomendado)</SelectItem>
                              <SelectItem value="ssl">SSL</SelectItem>
                              <SelectItem value="none">Nenhum</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-blue-900 mb-2">Configuração SMTP:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Gmail:</strong> smtp.gmail.com, porta 587, TLS, use App Password</li>
                      <li>• <strong>Outlook:</strong> smtp-mail.outlook.com, porta 587, TLS</li>
                      <li>• <strong>SendGrid:</strong> smtp.sendgrid.net, porta 587, TLS</li>
                      <li>• <strong>Mailgun:</strong> smtp.mailgun.org, porta 587, TLS</li>
                      <li>• <strong>TLS (587):</strong> Mais seguro e recomendado para a maioria dos provedores</li>
                      <li>• <strong>SSL (465):</strong> Para provedores que requerem SSL exclusivo</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
              className="w-full md:w-auto"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}