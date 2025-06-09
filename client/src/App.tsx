import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import AdminLayout from "@/components/layout/admin-layout";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import CompanyLogin from "@/pages/company-login";
import CompanyDashboard from "@/pages/company-dashboard";
import CompanySettings from "@/pages/company-settings";
import Dashboard from "@/pages/dashboard";
import Companies from "@/pages/companies";
import Plans from "@/pages/plans";
import SettingsPage from "@/pages/settings";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminLoading } = useAuth();

  return (
    <Switch>
      {/* Company Routes */}
      <Route path="/" component={CompanyLogin} />
      <Route path="/dashboard" component={CompanyDashboard} />
      <Route path="/configuracoes" component={CompanySettings} />
      
      {/* Admin Routes */}
      {!isAdminAuthenticated ? (
        <Route path="/administrador*" component={Login} />
      ) : (
        <>
          <Route path="/administrador">
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </Route>
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
          <Route path="/administrador/configuracoes">
            <AdminLayout>
              <SettingsPage />
            </AdminLayout>
          </Route>
          <Route path="/administrador/chat">
            <AdminLayout>
              <Chat />
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
