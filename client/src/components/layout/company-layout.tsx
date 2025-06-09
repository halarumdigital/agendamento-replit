import { Button } from "@/components/ui/button";
import { Building2, Home, Settings, Users, BarChart3, MessageSquare, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";

interface CompanyLayoutProps {
  children: React.ReactNode;
}

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  const [location, setLocation] = useLocation();
  const { company } = useCompanyAuth();

  const handleLogout = async () => {
    try {
      await fetch("/api/company/auth/logout", { method: "POST" });
      setLocation("/empresa");
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  const menuItems = [
    {
      icon: Home,
      label: "Dashboard",
      path: "/empresa/dashboard",
    },
    {
      icon: Users,
      label: "Usuários",
      path: "/empresa/usuarios",
    },
    {
      icon: MessageSquare,
      label: "WhatsApp",
      path: "/empresa/whatsapp",
    },
    {
      icon: BarChart3,
      label: "Relatórios",
      path: "/empresa/relatorios",
    },
    {
      icon: Settings,
      label: "Configurações",
      path: "/empresa/configuracoes",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {company?.fantasyName || "Empresa"}
              </h2>
              <p className="text-sm text-gray-500">Painel da Empresa</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <Building2 className="w-4 h-4 text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {company?.fantasyName || "Empresa"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {company?.email || "empresa@email.com"}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-gray-600 hover:text-gray-900"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}