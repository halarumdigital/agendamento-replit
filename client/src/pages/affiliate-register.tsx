import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, UserPlus } from "lucide-react";

export default function AffiliateRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: ""
  });

  const formatPhone = (value: string) => {
    // Remove all non-digit characters
    const cleanValue = value.replace(/\D/g, '');
    
    // Apply formatting
    if (cleanValue.length <= 2) {
      return cleanValue;
    } else if (cleanValue.length <= 7) {
      return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2)}`;
    } else {
      return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7, 11)}`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // Format phone number automatically
      const formattedPhone = formatPhone(value);
      setFormData(prev => ({
        ...prev,
        [name]: formattedPhone
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validatePhone = (phone: string) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it has 11 digits (DDD + 9 digits)
    if (cleanPhone.length !== 11) {
      return false;
    }
    
    // Valid DDD codes in Brazil
    const validDDDs = [
      11, 12, 13, 14, 15, 16, 17, 18, 19, // São Paulo
      21, 22, 24, // Rio de Janeiro
      27, 28, // Espírito Santo
      31, 32, 33, 34, 35, 37, 38, // Minas Gerais
      41, 42, 43, 44, 45, 46, // Paraná
      47, 48, 49, // Santa Catarina
      51, 53, 54, 55, // Rio Grande do Sul
      61, // Distrito Federal
      62, 64, // Goiás
      63, // Tocantins
      65, 66, // Mato Grosso
      67, // Mato Grosso do Sul
      68, // Acre
      69, // Rondônia
      71, 73, 74, 75, 77, // Bahia
      79, // Sergipe
      81, 87, // Pernambuco
      82, // Alagoas
      83, // Paraíba
      84, // Rio Grande do Norte
      85, 88, // Ceará
      86, 89, // Piauí
      91, 93, 94, // Pará
      92, 97, // Amazonas
      95, // Roraima
      96, // Amapá
      98, 99  // Maranhão
    ];
    
    const ddd = parseInt(cleanPhone.substring(0, 2));
    if (!validDDDs.includes(ddd)) {
      return false;
    }
    
    // Check if the first digit after DDD is 9 (mobile)
    if (cleanPhone[2] !== '9') {
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.email || !formData.password || !formData.phone) {
        toast({
          title: "Erro",
          description: "Por favor, preencha todos os campos obrigatórios, incluindo o telefone.",
          variant: "destructive",
        });
        return;
      }

      // Validate phone with DDD
      if (!validatePhone(formData.phone)) {
        toast({
          title: "Erro",
          description: "Por favor, informe um telefone válido com DDD (ex: 11999999999).",
          variant: "destructive",
        });
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem.",
          variant: "destructive",
        });
        return;
      }

      if (formData.password.length < 6) {
        toast({
          title: "Erro",
          description: "A senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: `Conta de afiliado criada com sucesso! Seu código é: ${data.affiliate.affiliateCode}`,
        });
        setLocation('/affiliate/login');
      } else {
        toast({
          title: "Erro",
          description: data.message || "Erro ao criar conta de afiliado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error registering affiliate:', error);
      toast({
        title: "Erro",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Cadastro de Afiliado</CardTitle>
          <CardDescription>
            Crie sua conta de afiliado e comece a ganhar comissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Seu nome completo"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
              <p className="text-sm text-gray-600">Informe um número válido com DDD (ex: 11999999999)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirme sua senha"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              style={{ backgroundColor: '#5e6d8d' }}
            >
              {isLoading ? "Criando conta..." : "Criar Conta de Afiliado"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href="/affiliate/login" className="text-blue-600 hover:underline">
                Fazer login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}