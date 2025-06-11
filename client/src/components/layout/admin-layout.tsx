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
        
        <main className="flex-1">
          <div className="px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
