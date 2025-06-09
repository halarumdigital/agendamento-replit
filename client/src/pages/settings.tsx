import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

  const { data: settings, isLoading } = useQuery<GlobalSettings>({
    queryKey: ["/api/settings"],
  });

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
    updateMutation.mutate(data);
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