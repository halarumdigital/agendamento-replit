import { Building2, Users, Calendar, CreditCard, Settings, FileText, User, MessageSquare } from "lucide-react";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";

export default function CompanyDashboardNew() {
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
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header com ícone laranja */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-orange-500">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold text-orange-600">DASHBOARD ATUALIZADO</h1>
          <div className="text-orange-500">
            🔥
          </div>
        </div>
        <p className="text-sm text-gray-500">
          NOVA VERSÃO - {new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </div>

      {/* Card Informações da Empresa */}
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

      {/* Cards de Métricas */}
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

      {/* Seções lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recursos Disponíveis */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recursos Disponíveis</h3>
          <p className="text-sm text-gray-500 mb-4">Funcionalidades liberadas para sua empresa</p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">WhatsApp Integration</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Ativo
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Relatórios Avançados</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Ativo
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">API Access</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Limitado
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Suporte Prioritário</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Ativo
              </span>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <p className="text-sm text-gray-500 mb-4">Acesse rapidamente as principais funcionalidades</p>
          
          <div className="space-y-4">
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">Gerenciar Usuários</span>
            </button>
            
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">Configurações da Empresa</span>
            </button>
            
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">Histórico de Pagamentos</span>
            </button>
            
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">Agendar Reunião</span>
            </button>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Login realizado</span>
                <span className="text-green-600 font-medium">Bem-vindo ao painel da empresa!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}