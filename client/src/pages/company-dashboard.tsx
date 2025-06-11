import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, CreditCard, Settings } from "lucide-react";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";

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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1 px-6 py-6">
        {/* Header do Dashboard */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
        </div>

        {/* Company Info Card */}
        <div className="bg-white rounded shadow-sm p-5 border border-gray-100 mb-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
            <Building2 className="w-5 h-5" />
            Informações da Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Nome Fantasia</label>
              <p className="text-lg font-semibold text-gray-800">{company?.fantasyName || "Salão"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Documento</label>
              <p className="text-lg font-semibold text-gray-800">{company?.document || "573.286.450-40"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-lg font-semibold text-gray-800">{company?.email || "damasceno02@hotmail.com"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Ativo
              </span>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-500">Endereço</label>
            <p className="text-lg text-gray-800">{company?.address || "asasasa"}</p>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded shadow-sm p-5 border border-gray-100">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
              <h4 className="text-sm font-medium text-gray-600">Plano Atual</h4>
              <CreditCard className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-800">Premium</div>
            <p className="text-xs text-gray-500">
              Próximo vencimento em 30 dias
            </p>
          </div>

          <div className="bg-white rounded shadow-sm p-5 border border-gray-100">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
              <h4 className="text-sm font-medium text-gray-600">Usuários Ativos</h4>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-800">5</div>
            <p className="text-xs text-gray-500">
              +2 desde o mês passado
            </p>
          </div>

          <div className="bg-white rounded shadow-sm p-5 border border-gray-100">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
              <h4 className="text-sm font-medium text-gray-600">Dias Restantes</h4>
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-800">30</div>
            <p className="text-xs text-gray-500">
              Do período atual
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded shadow-sm p-5 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Recursos Disponíveis</h4>
            <p className="text-sm text-gray-500 mb-4">
              Funcionalidades liberadas para sua empresa
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">WhatsApp Integration</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Ativo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Relatórios Avançados</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Ativo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">API Access</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Limitado
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Suporte Prioritário</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Ativo
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow-sm p-5 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Ações Rápidas</h4>
            <p className="text-sm text-gray-500 mb-4">
              Acesse rapidamente as principais funcionalidades
            </p>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-start px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Users className="w-4 h-4 mr-2" />
                Gerenciar Usuários
              </button>
              <button className="w-full flex items-center justify-start px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Settings className="w-4 h-4 mr-2" />
                Configurações da Empresa
              </button>
              <button className="w-full flex items-center justify-start px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <CreditCard className="w-4 h-4 mr-2" />
                Histórico de Pagamentos
              </button>
              <button className="w-full flex items-center justify-start px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Calendar className="w-4 h-4 mr-2" />
                Agendar Reunião
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}