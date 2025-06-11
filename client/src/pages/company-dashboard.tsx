import { Building2, Users, Calendar, CreditCard, Settings, FileText, User, MessageSquare } from "lucide-react";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";

export default function CompanyDashboard() {
  const { company, isLoading } = useCompanyAuth();
  
  console.log("✅ CompanyDashboard carregado - versão atualizada");

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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-96">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Carregando...</h3>
          <p className="text-sm text-gray-500">
            Obtendo informações da empresa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-red-600">🔥 DASHBOARD ATUALIZADO 🔥</h1>
        <p className="text-lg text-blue-600 font-semibold">
          NOVA VERSÃO - {new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </div>

      {/* Company Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Informações da Empresa</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Nome Fantasia</p>
            <p className="font-semibold text-gray-900">{company?.fantasyName || "Salão"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Documento</p>
            <p className="font-semibold text-gray-900">{company?.document || "573.286.450-40"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Email</p>
            <p className="font-semibold text-gray-900">{company?.email || "damasceno02@hotmail.com"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Ativo
            </span>
          </div>
        </div>
        
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-1">Endereço</p>
          <p className="text-gray-900">{company?.address || "asasasa"}</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Plano Atual</p>
              <CreditCard className="w-5 h-5 text-gray-400 mt-1" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">Premium</div>
          <p className="text-sm text-gray-500">Próximo vencimento em 30 dias</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Usuários Ativos</p>
              <Users className="w-5 h-5 text-gray-400 mt-1" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">5</div>
          <p className="text-sm text-gray-500">+2 desde o mês passado</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Dias Restantes</p>
              <Calendar className="w-5 h-5 text-gray-400 mt-1" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">30</div>
          <p className="text-sm text-gray-500">Do período atual</p>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recursos Disponíveis */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Recursos Disponíveis</h3>
          <p className="text-sm text-gray-500 mb-6">Funcionalidades liberadas para sua empresa</p>
          
          <div className="space-y-4">
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

        {/* Ações Rápidas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ações Rápidas</h3>
          <p className="text-sm text-gray-500 mb-6">Acesse rapidamente as principais funcionalidades</p>
          
          <div className="space-y-3">
            <button className="w-full flex items-center px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <User className="w-4 h-4 mr-3 text-gray-500" />
              <span className="text-gray-700">Gerenciar Usuários</span>
            </button>
            <button className="w-full flex items-center px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4 mr-3 text-gray-500" />
              <span className="text-gray-700">Configurações da Empresa</span>
            </button>
            <button className="w-full flex items-center px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <FileText className="w-4 h-4 mr-3 text-gray-500" />
              <span className="text-gray-700">Histórico de Pagamentos</span>
            </button>
            <button className="w-full flex items-center px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <MessageSquare className="w-4 h-4 mr-3 text-gray-500" />
              <span className="text-gray-700">Agendar Reunião</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}