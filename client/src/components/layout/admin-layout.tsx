import { useQuery } from "@tanstack/react-query";
import Sidebar from "./sidebar";
import { useGlobalTheme } from "@/hooks/use-global-theme";
import type { GlobalSettings } from "@shared/schema";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: settings } = useQuery<GlobalSettings>({
    queryKey: ["/api/settings"],
  });
  
  // Aplica tema global dinamicamente
  useGlobalTheme();

  return (
    <div className="min-h-screen flex">
      <Sidebar 
        systemName={settings?.systemName} 
        logoUrl={settings?.logoUrl || undefined}
      />
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile top spacing */}
        <div className="lg:hidden h-16"></div>
        
        <main className="flex-1 pb-16 lg:pb-8">
          <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
            {children}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 px-4 py-2 z-40">
          <div className="text-xs text-gray-500 text-center">
            Agenday ©2025 - Versão 1.0 - Powered by Halarum
          </div>
        </footer>
      </div>
    </div>
  );
}
