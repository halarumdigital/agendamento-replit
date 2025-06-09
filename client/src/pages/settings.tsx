import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Settings, Palette, MessageSquare, Globe, Brain } from "lucide-react";
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

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      systemName: "",
      logoUrl: "",
      primaryColor: "#2563eb",
      secondaryColor: "#64748b",
      backgroundColor: "#f8fafc",
      textColor: "#1e293b",
      evolutionApiUrl: "",
      evolutionApiGlobalKey: "",
      openaiApiKey: "",
      openaiModel: "gpt-4o",
      openaiTemperature: 0.7,
      openaiMaxTokens: 4000,
    },
    values: settings ? {
      systemName: settings.systemName,
      logoUrl: settings.logoUrl || "",
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      backgroundColor: settings.backgroundColor,
      textColor: settings.textColor,
      evolutionApiUrl: settings.evolutionApiUrl || "",
      evolutionApiGlobalKey: settings.evolutionApiGlobalKey || "",
      openaiApiKey: (settings as any).openaiApiKey || "",
      openaiModel: (settings as any).openaiModel || "gpt-4o",
      openaiTemperature: parseFloat((settings as any).openaiTemperature) || 0.7,
      openaiMaxTokens: (settings as any).openaiMaxTokens || 4000,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      await apiRequest("PUT", "/api/settings", data);
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

  const onSubmit = (data: SettingsFormData) => {
    // Convert string values to numbers for OpenAI fields and ensure required defaults
    const processedData = {
      ...data,
      openaiModel: data.openaiModel || "gpt-4o",
      openaiTemperature: data.openaiTemperature ? parseFloat(data.openaiTemperature.toString()) : 0.7,
      openaiMaxTokens: data.openaiMaxTokens ? parseInt(data.openaiMaxTokens.toString()) : 4000,
    };
    updateMutation.mutate(processedData);
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
            <TabsList className="grid w-full grid-cols-4">
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
                        <FormLabel>URL do Logo (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://exemplo.com/logo.png" {...field} />
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
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
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