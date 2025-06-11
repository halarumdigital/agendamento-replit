import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useGlobalTheme } from "@/hooks/use-global-theme";
import { Building2, Mail, Lock, Eye, EyeOff } from "lucide-react";
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
  
  // Aplica tema global dinamicamente
  useGlobalTheme();

  // Aplica cores da configuração pública
  useEffect(() => {
    if (settings?.primaryColor) {
      const root = document.documentElement;
      
      const hexToHsl = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
            default: h = 0;
          }
          h /= 6;
        }

        return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
      };

      const primaryHsl = hexToHsl(settings.primaryColor);
      root.style.setProperty('--primary', `hsl(${primaryHsl})`);
      root.style.setProperty('--ring', `hsl(${primaryHsl})`);
      
      // Criar versão clara para accent
      const [h, s] = primaryHsl.split(',');
      root.style.setProperty('--accent', `hsl(${h}, ${s}, 96%)`);
      root.style.setProperty('--accent-foreground', `hsl(${primaryHsl})`);
    }
  }, [settings]);

  const form = useForm<CompanyLoginFormData>({
    resolver: zodResolver(companyLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: CompanyLoginFormData) => {
      const response = await apiRequest("/api/company/auth/login", "POST", data);
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
        <div className="text-center mb-8">
          {settings?.logoUrl ? (
            <div className="mb-4">
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className="w-full h-32 object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-foreground mb-2">Portal da Empresa</h1>
          <p className="text-muted-foreground">
            Acesse o painel da sua empresa com suas credenciais
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Login da Empresa</CardTitle>
            <CardDescription className="text-center">
              Digite suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="empresa@exemplo.com"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Digite sua senha"
                            className="pl-10 pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Problemas com acesso?{" "}
                <span className="text-primary hover:underline cursor-pointer">
                  Entre em contato com o suporte
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Acesso administrativo?{" "}
            <button
              onClick={() => setLocation("/administrador")}
              className="text-primary hover:underline"
            >
              Clique aqui
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}