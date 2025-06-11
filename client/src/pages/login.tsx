import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface LoginFormData {
  username: string;
  password: string;
}

export default function Login() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
              <Settings className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sistema Administrativo
          </h1>
          <p className="text-slate-600 mt-2">
            Acesso restrito para administradores
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Login de Administrador
            </CardTitle>
            <CardDescription>
              Faça login com suas credenciais de administrador
            </CardDescription>
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