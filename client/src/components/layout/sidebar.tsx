import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart3, 
  Building, 
  Tags, 
  Settings, 
  LogOut, 
  User,
  X,
  Menu
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  systemName?: string;
  logoUrl?: string;
}

export default function Sidebar({ systemName = "AdminPro", logoUrl }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Empresas", href: "/companies", icon: Building },
    { name: "Planos", href: "/plans", icon: Tags },
    { name: "Configurações", href: "/settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between h-16 px-4">
          <Button variant="ghost" size="sm" onClick={toggleMobile}>
            <Menu className="h-6 w-6" />
          </Button>
          <span className="text-lg font-semibold text-slate-800">{systemName}</span>
          <div></div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="text-lg font-semibold text-slate-800">{systemName}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <a className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                    ${active 
                      ? 'text-blue-700 bg-blue-50' 
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                    }
                  `}>
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </a>
                </Link>
              );
            })}
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center px-3 py-2">
              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Avatar" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {user?.firstName || user?.lastName 
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : 'Administrador'
                  }
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.email || 'admin@sistema.com'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="mt-2 w-full justify-start text-slate-600 hover:text-slate-800 hover:bg-slate-100"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sair
            </Button>
          </div>
        </nav>
      </aside>
    </>
  );
}
