import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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