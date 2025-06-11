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
import CompanyDashboard from "@/pages/company-dashboard-new";
import CompanySettings from "@/pages/company-settings";
import CompanyServices from "@/pages/company-services";
import CompanyProfessionals from "@/pages/company-professionals";
import CompanyClients from "@/pages/company-clients";
import CompanyReminders from "@/pages/company-reminders";
import CompanyReviews from "@/pages/company-reviews";
import CompanyTasks from "@/pages/company-tasks";
import CompanyPointsProgram from "@/pages/company-points-program";
import CompanyLoyalty from "@/pages/company-loyalty";
import CompanyInventory from "@/pages/company-inventory";
import CompanyMessages from "@/pages/company-messages";
import CompanyCoupons from "@/pages/company-coupons";
import CompanyFinancial from "@/pages/company-financial";
import CompanyReports from "@/pages/company-reports";
import DashboardAppointments from "@/pages/dashboard-appointments";
import Dashboard from "@/pages/dashboard";
import Companies from "@/pages/companies";
import Plans from "@/pages/plans";
import Admins from "@/pages/admins";
import SettingsPage from "@/pages/settings";
import Status from "@/pages/status";
import PublicReview from "@/pages/public-review";
import ResetPassword from "@/pages/reset-password";
import Register from "@/pages/register";
import Subscription from "@/pages/subscription";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminLoading } = useAuth();

  return (
    <Switch>
      {/* Company Routes */}
      <Route path="/" component={CompanyLogin} />
      <Route path="/company" component={CompanyLogin} />
      <Route path="/company/login" component={CompanyLogin} />
      <Route path="/company/auth/login" component={CompanyLogin} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/cadastro" component={Register} />
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
      <Route path="/company/clients">
        <CompanyLayout>
          <CompanyClients />
        </CompanyLayout>
      </Route>
      <Route path="/company/settings">
        <CompanyLayout>
          <CompanySettings />
        </CompanyLayout>
      </Route>
      <Route path="/company/reminders">
        <CompanyLayout>
          <CompanyReminders />
        </CompanyLayout>
      </Route>
      <Route path="/company/reviews">
        <CompanyLayout>
          <CompanyReviews />
        </CompanyLayout>
      </Route>
      <Route path="/company/tasks">
        <CompanyLayout>
          <CompanyTasks />
        </CompanyLayout>
      </Route>
      <Route path="/company/points-program">
        <CompanyLayout>
          <CompanyPointsProgram />
        </CompanyLayout>
      </Route>
      <Route path="/company/fidelidade">
        <CompanyLayout>
          <CompanyLoyalty />
        </CompanyLayout>
      </Route>
      <Route path="/company/estoque">
        <CompanyLayout>
          <CompanyInventory />
        </CompanyLayout>
      </Route>
      <Route path="/company/messages">
        <CompanyLayout>
          <CompanyMessages />
        </CompanyLayout>
      </Route>
      <Route path="/company/cupons">
        <CompanyLayout>
          <CompanyCoupons />
        </CompanyLayout>
      </Route>
      <Route path="/company/financial">
        <CompanyLayout>
          <CompanyFinancial />
        </CompanyLayout>
      </Route>
      <Route path="/company/relatorios">
        <CompanyLayout>
          <CompanyReports />
        </CompanyLayout>
      </Route>

      
      {/* Public Routes (no authentication required) */}
      <Route path="/assinatura" component={Subscription} />
      <Route path="/review/:token" component={PublicReview} />
      
      {/* Admin Login Routes */}
      <Route path="/login" component={Login} />
      <Route path="/administrador" component={isAdminAuthenticated ? () => <AdminLayout><Dashboard /></AdminLayout> : Login} />
      
      {/* Protected Admin Routes */}
      {isAdminAuthenticated && (
        <>
          <Route path="/admin/companies">
            <AdminLayout>
              <Companies />
            </AdminLayout>
          </Route>
          <Route path="/administrador/empresas">
            <AdminLayout>
              <Companies />
            </AdminLayout>
          </Route>
          <Route path="/admin/plans">
            <AdminLayout>
              <Plans />
            </AdminLayout>
          </Route>
          <Route path="/administrador/planos">
            <AdminLayout>
              <Plans />
            </AdminLayout>
          </Route>
          <Route path="/admin/status">
            <AdminLayout>
              <Status />
            </AdminLayout>
          </Route>
          <Route path="/administrador/status">
            <AdminLayout>
              <Status />
            </AdminLayout>
          </Route>
          <Route path="/admin/settings">
            <AdminLayout>
              <SettingsPage />
            </AdminLayout>
          </Route>
          <Route path="/administrador/configuracoes">
            <AdminLayout>
              <SettingsPage />
            </AdminLayout>
          </Route>
          <Route path="/admin/admins">
            <AdminLayout>
              <Admins />
            </AdminLayout>
          </Route>
          <Route path="/administrador/administradores">
            <AdminLayout>
              <Admins />
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
