import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useGlobalTheme } from "@/hooks/use-global-theme";
import { Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface LoginFormData {
  username: string;
  password: string;
}

export default function Login() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Aplica tema global dinamicamente
  useGlobalTheme();

  // Busca configurações públicas para obter a logo
  const { data: settings } = useQuery({
    queryKey: ["/api/public-settings"],
    retry: false,
  });

  const form = useForm<LoginFormData>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/login", data);
      
      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!",
      });
      
      // Redirect to admin dashboard
      window.location.href = "/administrador";
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao fazer login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="pb-4">
            {settings?.logoUrl && (
              <div className="text-center mb-4">
                <img 
                  src={settings.logoUrl} 
                  alt="Logo" 
                  className="w-full h-32 object-contain mx-auto"
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  {...form.register("username", { required: "Usuário é obrigatório" })}
                  placeholder="Digite seu usuário"
                  disabled={isLoading}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password", { required: "Senha é obrigatória" })}
                  placeholder="Digite sua senha"
                  disabled={isLoading}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Credenciais de Demonstração:
              </h4>
              <p className="text-sm text-blue-700">
                <strong>Usuário:</strong> admin<br />
                <strong>Senha:</strong> admin123
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}