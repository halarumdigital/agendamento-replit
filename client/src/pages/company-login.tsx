import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useLocation } from "wouter";

const companyLoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type CompanyLoginFormData = z.infer<typeof companyLoginSchema>;

export default function CompanyLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string>("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Busca configurações públicas para obter a logo e cores
  const { data: settings } = useQuery({
    queryKey: ["/api/public-settings"],
    retry: false,
  });
  


  const form = useForm<CompanyLoginFormData>({
    resolver: zodResolver(companyLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: CompanyLoginFormData) => {
      const response = await apiRequest("/api/auth/company-login", "POST", data);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Login realizado",
        description: "Bem-vindo ao painel da empresa!",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      const errorMessage = "Email ou senha errada";
      setLoginError(errorMessage);
      toast({
        title: "Erro no login",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompanyLoginFormData) => {
    setLoginError("");
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
            {loginError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email", { required: "Email é obrigatório" })}
                  placeholder="Digite seu email"
                  disabled={loginMutation.isPending}
                  className="border-input focus:border-primary focus:ring-primary"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
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
                  disabled={loginMutation.isPending}
                  className="border-input focus:border-primary focus:ring-primary"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}