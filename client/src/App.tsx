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
import Dashboard from "@/pages/dashboard";
import Companies from "@/pages/companies";
import Plans from "@/pages/plans";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Login} />
      ) : (
        <>
          <Route path="/">
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </Route>
          <Route path="/companies">
            <AdminLayout>
              <Companies />
            </AdminLayout>
          </Route>
          <Route path="/plans">
            <AdminLayout>
              <Plans />
            </AdminLayout>
          </Route>
          <Route path="/settings">
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
