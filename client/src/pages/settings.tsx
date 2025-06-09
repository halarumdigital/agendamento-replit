import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Palette, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { settingsSchema } from "@/lib/validations";
import type { GlobalSettings } from "@shared/schema";
import { z } from "zod";

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
    },
    values: settings ? {
      systemName: settings.systemName,
      logoUrl: settings.logoUrl || "",
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      backgroundColor: settings.backgroundColor,
      textColor: settings.textColor,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      await apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar configurações",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações Globais</h1>
          <p className="text-slate-600 mt-1">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações Globais</h1>
        <p className="text-slate-600 mt-1">Personalize a aparência e configurações do sistema</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* System Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Identidade Visual
            </CardTitle>
            <CardDescription>
              Configure o nome e logotipo do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="systemName">Nome do Sistema</Label>
              <Input
                id="systemName"
                {...form.register("systemName")}
                placeholder="AdminPro"
              />
              {form.formState.errors.systemName && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.systemName.message}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Este nome será exibido no topo da aplicação
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">URL do Logo (opcional)</Label>
              <Input
                id="logoUrl"
                {...form.register("logoUrl")}
                placeholder="https://exemplo.com/logo.png"
              />
              {form.formState.errors.logoUrl && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.logoUrl.message}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Cole a URL de uma imagem online ou deixe em branco para usar o ícone padrão
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900">Upload de arquivo em desenvolvimento</p>
              <p className="text-xs text-slate-500 mt-1">
                Por enquanto, use a URL do logo acima
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Color Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Cores do Sistema
            </CardTitle>
            <CardDescription>
              Personalize as cores da interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    {...form.register("primaryColor")}
                    className="w-12 h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                  <Input
                    {...form.register("primaryColor")}
                    placeholder="#2563eb"
                    className="flex-1"
                  />
                </div>
                {form.formState.errors.primaryColor && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.primaryColor.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Cor Secundária</Label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    {...form.register("secondaryColor")}
                    className="w-12 h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                  <Input
                    {...form.register("secondaryColor")}
                    placeholder="#64748b"
                    className="flex-1"
                  />
                </div>
                {form.formState.errors.secondaryColor && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.secondaryColor.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="backgroundColor">Cor de Fundo</Label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    {...form.register("backgroundColor")}
                    className="w-12 h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                  <Input
                    {...form.register("backgroundColor")}
                    placeholder="#f8fafc"
                    className="flex-1"
                  />
                </div>
                {form.formState.errors.backgroundColor && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.backgroundColor.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="textColor">Cor do Texto</Label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    {...form.register("textColor")}
                    className="w-12 h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                  <Input
                    {...form.register("textColor")}
                    placeholder="#1e293b"
                    className="flex-1"
                  />
                </div>
                {form.formState.errors.textColor && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.textColor.message}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Pré-visualização</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: form.watch("primaryColor") }}
                  ></div>
                  <span className="text-sm text-slate-600">Elementos primários (botões, links)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: form.watch("secondaryColor") }}
                  ></div>
                  <span className="text-sm text-slate-600">Elementos secundários (bordas, ícones)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-6 h-6 border rounded"
                    style={{ backgroundColor: form.watch("backgroundColor") }}
                  ></div>
                  <span className="text-sm text-slate-600">Fundo da aplicação</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: form.watch("textColor") }}
                  ></div>
                  <span className="text-sm text-slate-600">Cor do texto</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={updateMutation.isPending}
            className="px-6"
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
