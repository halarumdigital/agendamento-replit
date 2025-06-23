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

  console.log("ProfessionalDashboard rendering, professional:", professional);

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
        console.log("Checking professional authentication...");
        const response = await fetch("/api/auth/professional/status");
        const data = await response.json();
        console.log("Auth response:", data);
        
        if (data.isAuthenticated) {
          console.log("Professional authenticated:", data.professional);
          setProfessional(data.professional);
        } else {
          console.log("Professional not authenticated, redirecting to login");
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

  console.log("Appointments data:", appointments);
  console.log("Appointments loading:", appointmentsLoading);
  console.log("Appointments error:", appointmentsError);

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

  console.log("Render check - professional state:", professional);

  if (!professional) {
    console.log("Professional not found, showing loading...");
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  console.log("Professional found, rendering dashboard...");

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">
                Dashboard do Profissional
              </h1>
              <p className="text-blue-100">
                Bem-vindo, {professional.name}
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded text-white"
            >
              {logoutMutation.isPending ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Actions */}
        <div className="mb-6">
          <button
            onClick={() => setLocation("/profissional/novo-agendamento")}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            + Novo Agendamento
          </button>
        </div>

        {/* Appointments */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Meus Agendamentos</h2>
          
          {appointmentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Carregando agendamentos...</p>
            </div>
          ) : appointmentsError ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              Erro ao carregar agendamentos. Tente recarregar a página.
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded">
              <p className="text-gray-600">Nenhum agendamento encontrado</p>
              <p className="text-gray-500 text-sm">Você ainda não tem agendamentos.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {appointments.map((appointment: Appointment) => (
                <div key={appointment.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{appointment.clientName}</h3>
                    <span 
                      className="px-2 py-1 rounded text-white text-sm"
                      style={{ backgroundColor: appointment.statusColor || "#6b7280" }}
                    >
                      {appointment.statusName}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>📅 {formatDate(appointment.appointmentDate)}</div>
                    <div>🕐 {formatTime(appointment.appointmentTime)}</div>
                    <div>✂️ {appointment.serviceName} - R$ {appointment.price}</div>
                    {appointment.clientPhone && (
                      <div>📞 {appointment.clientPhone}</div>
                    )}
                    {appointment.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <strong>Observações:</strong> {appointment.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}