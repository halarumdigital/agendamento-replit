import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, CreditCard, Settings } from "lucide-react";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import CompanyLayout from "@/components/layout/company-layout";

export default function CompanyDashboard() {
  const { company, isLoading } = useCompanyAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Carregando...</CardTitle>
              <CardDescription>
                Obtendo informações da empresa.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Company Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informações da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Nome Fantasia</label>
                <p className="text-lg font-semibold">{company?.fantasyName || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Documento</label>
                <p className="text-lg font-semibold">{company?.document || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-lg font-semibold">{company?.email || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Ativo
                </Badge>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">Endereço</label>
              <p className="text-lg">{company?.address || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Premium</div>
              <p className="text-xs text-muted-foreground">
                Próximo vencimento em 30 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">
                +2 desde o mês passado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dias Restantes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">30</div>
              <p className="text-xs text-muted-foreground">
                Do período atual
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recursos Disponíveis</CardTitle>
              <CardDescription>
                Funcionalidades liberadas para sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>WhatsApp Integration</span>
                <Badge variant="default">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Relatórios Avançados</span>
                <Badge variant="default">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>API Access</span>
                <Badge variant="secondary">Limitado</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Suporte Prioritário</span>
                <Badge variant="default">Ativo</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>
                Acesse rapidamente as principais funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Gerenciar Usuários
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Configurações da Empresa
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                Histórico de Pagamentos
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Agendar Reunião
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyLayout>
  );
}