import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch public settings for branding
  const { data: settings } = useQuery({
    queryKey: ["/api/public-settings"],
  });

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await apiRequest("/api/company/forgot-password", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccessMessage(result.message);
        form.reset();
        
        // Show reset URL in development mode
        if (result.resetUrl) {
          console.log("Reset URL:", result.resetUrl);
        }
      } else {
        const error = await response.json();
        setErrorMessage(error.message || "Erro ao processar solicitação");
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
              Recuperar Senha
            </CardTitle>
            <CardDescription className="mt-2">
              Digite seu email para receber instruções de recuperação de senha
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {successMessage && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <Mail className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert className="border-red-200 bg-red-50 text-red-800">
              <AlertDescription>{errorMessage}</AlertDescription>
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
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        disabled={isSubmitting}
                        {...field}
                      />
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
                {isSubmitting ? "Enviando..." : "Enviar Instruções"}
              </Button>
            </form>
          </Form>

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
        </CardContent>
      </Card>
    </div>
  );
}