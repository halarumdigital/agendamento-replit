import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Phone, Plus, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Professional {
  id: number;
  name: string;
  email: string;
  companyId: number;
}

interface Appointment {
  id: number;
  clientName: string;
  clientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
  price: number;
  serviceName: string;
  professionalName: string;
  statusName: string;
  statusColor: string;
}

export default function ProfessionalDashboard() {
  const [, setLocation] = useLocation();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar configurações globais para aplicar as cores
  const { data: settings } = useQuery({
    queryKey: ["/api/public-settings"],
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Aplicar cores globais
  useEffect(() => {
    if (settings?.primaryColor) {
      const root = document.documentElement;
      const primaryHsl = settings.primaryColor;
      
      // Definir a cor primária
      root.style.setProperty('--primary', primaryHsl);
      
      // Extrair H, S, L para criar variações
      const hslMatch = primaryHsl.match(/(\d+),\s*(\d+)%,\s*(\d+)%/);
      if (hslMatch) {
        const [, h, s, l] = hslMatch;
        
        // Criar cor primária mais clara para hover
        root.style.setProperty('--primary-foreground', 'hsl(0, 0%, 100%)');
        
        // Definir cor de accent baseada na primária
        root.style.setProperty('--accent', `hsl(${h}, ${s}%, 96%)`);
        root.style.setProperty('--accent-foreground', `hsl(${primaryHsl})`);
      }
    }
  }, [settings]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/professional/status");
        const data = await response.json();
        
        if (data.isAuthenticated) {
          setProfessional(data.professional);
        } else {
          setLocation("/profissional/login");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setLocation("/profissional/login");
      }
    };
    
    checkAuth();
  }, [setLocation]);

  // Fetch appointments
  const { data: appointments = [], isLoading: appointmentsLoading, error: appointmentsError } = useQuery({
    queryKey: ["/api/professional/appointments"],
    enabled: !!professional,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/professional/logout", {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Erro ao fazer logout");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Logout realizado com sucesso",
      });
      setLocation("/profissional/login");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao fazer logout",
        description: error.message,
      });
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  const getStatusColor = (color: string) => {
    return color || "#6b7280";
  };

  if (!professional) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dashboard do Profissional
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Bem-vindo, {professional.name}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {logoutMutation.isPending ? "Saindo..." : "Sair"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions */}
        <div className="mb-8">
          <Button
            onClick={() => setLocation("/profissional/novo-agendamento")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>

        {/* Error handling */}
        {appointmentsError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              Erro ao carregar agendamentos. Tente recarregar a página.
            </AlertDescription>
          </Alert>
        )}

        {/* Appointments */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Meus Agendamentos</h2>
            
            {appointmentsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhum agendamento encontrado
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Você ainda não tem agendamentos. Crie seu primeiro agendamento!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {appointments.map((appointment: Appointment) => (
                  <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{appointment.clientName}</CardTitle>
                        <Badge 
                          style={{ 
                            backgroundColor: getStatusColor(appointment.statusColor),
                            color: 'white'
                          }}
                        >
                          {appointment.statusName}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(appointment.appointmentDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(appointment.appointmentTime)}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full bg-blue-500"
                          ></div>
                          <span className="font-medium">{appointment.serviceName}</span>
                          <span className="text-sm text-gray-500">R$ {appointment.price}</span>
                        </div>
                        
                        {appointment.clientPhone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="h-4 w-4" />
                            {appointment.clientPhone}
                          </div>
                        )}
                        
                        {appointment.notes && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            <strong>Observações:</strong> {appointment.notes}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}