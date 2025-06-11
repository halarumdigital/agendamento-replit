import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { formatDocument } from "@/lib/validations";
import { Building2, MapPin, Mail, Lock, User, Phone } from "lucide-react";

const registerSchema = z.object({
  fantasyName: z.string().min(2, "Nome fantasia deve ter pelo menos 2 caracteres"),
  document: z.string().min(11, "CNPJ/CPF é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
  address: z.string().min(5, "Endereço é obrigatório"),
  phone: z.string().optional(),
  zipCode: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      fantasyName: "",
      document: "",
      email: "",
      password: "",
      confirmPassword: "",
      address: "",
      phone: "",
      zipCode: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatDocument(value);
    form.setValue("document", formatted);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      
      await apiRequest("POST", "/api/public/register", registerData);
      
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Agora você pode escolher seu plano de assinatura.",
      });
      
      // Redirecionar para a página de planos
      setLocation("/assinatura");
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Falha ao realizar cadastro",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Cadastre sua Empresa
            </CardTitle>
            <CardDescription className="text-gray-600">
              Preencha os dados abaixo para criar sua conta e ter acesso ao sistema de gestão
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Dados da Empresa */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Dados da Empresa</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fantasyName">Nome Fantasia *</Label>
                    <Input
                      id="fantasyName"
                      {...form.register("fantasyName")}
                      placeholder="Digite o nome fantasia"
                    />
                    {form.formState.errors.fantasyName && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.fantasyName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document">CNPJ / CPF *</Label>
                    <Input
                      id="document"
                      {...form.register("document")}
                      onChange={handleDocumentChange}
                      placeholder="00.000.000/0000-00"
                    />
                    {form.formState.errors.document && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.document.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Endereço</h3>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço Completo *</Label>
                  <Input
                    id="address"
                    {...form.register("address")}
                    placeholder="Digite o endereço completo"
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.address.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Celular *</Label>
                    <Input
                      id="phone"
                      {...form.register("phone")}
                      placeholder="(11) 99999-9999"
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP *</Label>
                    <Input
                      id="zipCode"
                      {...form.register("zipCode")}
                      placeholder="00000-000"
                    />
                    {form.formState.errors.zipCode && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.zipCode.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      {...form.register("number")}
                      placeholder="123"
                    />
                    {form.formState.errors.number && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.number.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      {...form.register("neighborhood")}
                      placeholder="Centro"
                    />
                    {form.formState.errors.neighborhood && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.neighborhood.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      {...form.register("city")}
                      placeholder="São Paulo"
                    />
                    {form.formState.errors.city && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.city.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      {...form.register("state")}
                      placeholder="SP"
                      maxLength={2}
                    />
                    {form.formState.errors.state && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.state.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dados de Acesso */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Dados de Acesso</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="contato@empresa.com"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      {...form.register("password")}
                      placeholder="Digite uma senha segura"
                    />
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...form.register("confirmPassword")}
                    placeholder="Digite a senha novamente"
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-center pt-6">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full max-w-md h-12 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isLoading ? "Processando..." : "Avançar"}
                </Button>
              </div>

              <div className="text-center text-sm text-gray-600">
                Já tem uma conta?{" "}
                <Link href="/admin/login" className="text-blue-600 hover:underline">
                  Fazer login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}