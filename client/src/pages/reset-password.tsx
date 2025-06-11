import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState("");
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Fetch public settings for branding
  const { data: settings } = useQuery({
    queryKey: ["/api/public-settings"],
  });

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Extract token from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      validateToken(tokenParam);
    } else {
      setErrorMessage("Token de recuperação não encontrado");
      setIsValidatingToken(false);
    }
  }, []);

  const validateToken = async (tokenValue: string) => {
    try {
      const response = await apiRequest(`/api/company/validate-reset-token/${tokenValue}`);
      
      if (response.ok) {
        const result = await response.json();
        setTokenValid(result.valid);
        setUserEmail(result.email || "");
        if (!result.valid) {
          setErrorMessage(result.message || "Token inválido ou expirado");
        }
      } else {
        const error = await response.json();
        setErrorMessage(error.message || "Token inválido ou expirado");
        setTokenValid(false);
      }
    } catch (error) {
      console.error("Error validating token:", error);
      setErrorMessage("Erro ao validar token. Tente novamente.");
      setTokenValid(false);
    } finally {
      setIsValidatingToken(false);
    }
  };

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setErrorMessage("Token de recuperação não encontrado");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await apiRequest("/api/company/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          newPassword: data.newPassword,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccessMessage(result.message);
        form.reset();
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation("/company/login");
        }, 3000);
      } else {
        const error = await response.json();
        setErrorMessage(error.message || "Erro ao redefinir senha");
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = settings?.primaryColor || "#2563eb";
  const secondaryColor = settings?.secondaryColor || "#64748b";
  const systemName = settings?.systemName || "Sistema";

  if (isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Validando token...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-4 text-center">
            {settings?.logoUrl && (
              <div className="flex justify-center">
                <img 
                  src={settings.logoUrl} 
                  alt={systemName}
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}
            <div>
              <CardTitle 
                className="text-2xl font-bold"
                style={{ color: primaryColor }}
              >
                Token Inválido
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert className="border-red-200 bg-red-50 text-red-800">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>

            <div className="text-center space-y-2">
              <Link 
                href="/company/forgot-password" 
                className="inline-block w-full"
              >
                <Button 
                  className="w-full"
                  style={{ 
                    backgroundColor: primaryColor,
                    borderColor: primaryColor 
                  }}
                >
                  Solicitar Nova Recuperação
                </Button>
              </Link>
              
              <Link 
                href="/company/login" 
                className="inline-flex items-center text-sm hover:underline justify-center w-full"
                style={{ color: secondaryColor }}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar ao Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          {settings?.logoUrl && (
            <div className="flex justify-center">
              <img 
                src={settings.logoUrl} 
                alt={systemName}
                className="h-16 w-auto object-contain"
              />
            </div>
          )}
          <div>
            <CardTitle 
              className="text-2xl font-bold"
              style={{ color: primaryColor }}
            >
              Redefinir Senha
            </CardTitle>
            <CardDescription className="mt-2">
              {userEmail && `Redefinindo senha para: ${userEmail}`}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {successMessage && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {successMessage}
                <br />
                <span className="text-sm">Redirecionando para o login...</span>
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert className="border-red-200 bg-red-50 text-red-800">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {!successMessage && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Digite sua nova senha"
                            disabled={isSubmitting}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirme sua nova senha"
                            disabled={isSubmitting}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  style={{ 
                    backgroundColor: primaryColor,
                    borderColor: primaryColor 
                  }}
                >
                  {isSubmitting ? "Redefinindo..." : "Redefinir Senha"}
                </Button>
              </form>
            </Form>
          )}

          {!successMessage && (
            <div className="text-center space-y-2">
              <Link 
                href="/company/login" 
                className="inline-flex items-center text-sm hover:underline"
                style={{ color: secondaryColor }}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar ao Login
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}