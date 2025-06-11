import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";

interface CompanyLoginFormData {
  email: string;
  password: string;
}

export default function CompanyLogin() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  
  // Busca configurações públicas para obter a logo e cores
  const { data: settings } = useQuery({
    queryKey: ["/api/public-settings"],
    retry: false,
  });

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
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: CompanyLoginFormData) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/company-login", data);
      
      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!",
      });
      
      // Redirect to company dashboard
      setLocation("/dashboard");
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-4 pb-4">
            <div className="text-center">
              {settings?.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt="Logo" 
                  className="w-full h-32 object-contain mx-auto mb-4"
                />
              ) : (
                <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
                  <Lock className="w-8 h-8 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground">
                {settings?.systemName || "Sistema de Gestão"}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Faça login para acessar sua conta
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email", { required: "Email é obrigatório" })}
                  placeholder="Digite seu email"
                  disabled={isLoading}
                  className="border-input focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password", { required: "Senha é obrigatória" })}
                  placeholder="Digite sua senha"
                  disabled={isLoading}
                  className="border-input focus:border-primary focus:ring-primary"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="text-center mt-4">
              <Link 
                href="/company/forgot-password" 
                className="text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}