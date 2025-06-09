import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import AdminLayout from "@/components/layout/admin-layout";
import CompanyLayout from "./components/layout/company-layout";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import CompanyLogin from "@/pages/company-login";
import CompanyDashboard from "@/pages/company-dashboard";
import CompanySettings from "@/pages/company-settings";
import CompanyServices from "@/pages/company-services";
import CompanyProfessionals from "@/pages/company-professionals";
import DashboardAppointments from "@/pages/dashboard-appointments";
import Dashboard from "@/pages/dashboard";
import Companies from "@/pages/companies";
import Plans from "@/pages/plans";
import SettingsPage from "@/pages/settings";
import Status from "@/pages/status";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminLoading } = useAuth();

  return (
    <Switch>
      {/* Company Routes */}
      <Route path="/" component={CompanyLogin} />
      <Route path="/dashboard">
        <CompanyLayout>
          <CompanyDashboard />
        </CompanyLayout>
      </Route>
      <Route path="/company/dashboard">
        <CompanyLayout>
          <CompanyDashboard />
        </CompanyLayout>
      </Route>
      <Route path="/company/appointments">
        <CompanyLayout>
          <DashboardAppointments />
        </CompanyLayout>
      </Route>
      <Route path="/company/services">
        <CompanyLayout>
          <CompanyServices />
        </CompanyLayout>
      </Route>
      <Route path="/company/professionals">
        <CompanyLayout>
          <CompanyProfessionals />
        </CompanyLayout>
      </Route>
      <Route path="/configuracoes">
        <CompanyLayout>
          <CompanySettings />
        </CompanyLayout>
      </Route>
      
      {/* Admin Login Route */}
      <Route path="/administrador" component={isAdminAuthenticated ? () => <AdminLayout><Dashboard /></AdminLayout> : Login} />
      
      {/* Protected Admin Routes */}
      {isAdminAuthenticated && (
        <>
          <Route path="/administrador/empresas">
            <AdminLayout>
              <Companies />
            </AdminLayout>
          </Route>
          <Route path="/administrador/planos">
            <AdminLayout>
              <Plans />
            </AdminLayout>
          </Route>
          <Route path="/administrador/status">
            <AdminLayout>
              <Status />
            </AdminLayout>
          </Route>
          <Route path="/administrador/configuracoes">
            <AdminLayout>
              <SettingsPage />
            </AdminLayout>
          </Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
