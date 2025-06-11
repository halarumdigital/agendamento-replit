import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Calendar, 
  Settings, 
  MessageSquare, 
  Users, 
  Briefcase,
  Menu,
  LogOut,
  Home,
  Bell,
  Star,
  CheckSquare,
  Gift,
  Package,
  Ticket,
  DollarSign,
  BarChart3
} from "lucide-react";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { useGlobalTheme } from "@/hooks/use-global-theme";

interface CompanyLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/company/dashboard",
    icon: Home,
  },
  {
    title: "Agendamentos",
    href: "/company/appointments",
    icon: Calendar,
  },
  {
    title: "Serviços",
    href: "/company/services",
    icon: Briefcase,
  },
  {
    title: "Profissionais",
    href: "/company/professionals",
    icon: Users,
  },
  {
    title: "Clientes",
    href: "/company/clients",
    icon: Users,
  },
  {
    title: "Avaliações",
    href: "/company/reviews",
    icon: Star,
  },
  {
    title: "Tarefas",
    href: "/company/tasks",
    icon: CheckSquare,
  },
  {
    title: "Programa de pontos",
    href: "/company/points-program",
    icon: Gift,
  },
  {
    title: "Fidelidade",
    href: "/company/fidelidade",
    icon: Gift,
  },
  {
    title: "Estoque",
    href: "/company/estoque",
    icon: Package,
  },
  {
    title: "Mensagens",
    href: "/company/messages",
    icon: MessageSquare,
  },
  {
    title: "Cupons",
    href: "/company/cupons",
    icon: Ticket,
  },
  {
    title: "Financeiro",
    href: "/company/financial",
    icon: DollarSign,
  },
  {
    title: "Relatórios",
    href: "/company/relatorios",
    icon: BarChart3,
  },
  {
    title: "Configurações",
    href: "/company/settings",
    icon: Settings,
  },
];

function SidebarContent() {
  const [location] = useLocation();
  const { company } = useCompanyAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <h2 className="text-lg font-semibold">{company?.fantasyName || "Empresa"}</h2>
        <p className="text-sm text-muted-foreground">Painel de Controle</p>
      </div>
      
      <nav className="flex-1 space-y-2 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start"
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          );
        })}
      </nav>
      
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => {
            window.location.href = "/api/company/auth/logout";
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Aplica tema global dinamicamente
  useGlobalTheme();

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:fixed lg:inset-y-0 lg:z-50">
        <div className="flex h-full w-full flex-col bg-white border-r">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-md"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </>
  );
}