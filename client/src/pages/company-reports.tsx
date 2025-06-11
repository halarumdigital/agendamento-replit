import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Users, Scissors, TrendingUp, Phone, Mail, User, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: number;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  professionalName: string;
  date: string;
  time: string;
  status: string;
  price?: number;
}

interface ClientReport {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  totalAppointments: number;
  totalSpent: number;
  lastAppointment: string;
  appointments: Appointment[];
}

interface ProfessionalReport {
  professionalName: string;
  totalAppointments: number;
  totalRevenue: number;
  services: {
    serviceName: string;
    count: number;
    revenue: number;
  }[];
  appointments: Appointment[];
}

interface ServiceReport {
  serviceName: string;
  totalAppointments: number;
  totalRevenue: number;
  averagePrice: number;
  appointments: Appointment[];
}

interface TotalReport {
  totalAppointments: number;
  totalRevenue: number;
  totalClients: number;
  totalProfessionals: number;
  averageAppointmentValue: number;
  topService: string;
  topProfessional: string;
  topClient: string;
}

export default function CompanyReports() {
  const [activeTab, setActiveTab] = useState("clients");

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/company/appointments/detailed"],
    queryFn: () => {
      return fetch('/api/company/appointments/detailed', {
        method: 'GET',
        credentials: 'include',
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Erro ao buscar agendamentos');
        }
        return res.json();
      });
    },
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/company/clients"],
    queryFn: () => {
      return fetch('/api/company/clients', {
        method: 'GET',
        credentials: 'include',
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Erro ao buscar clientes');
        }
        return res.json();
      });
    },
  });

  const { data: professionals = [], isLoading: professionalsLoading } = useQuery({
    queryKey: ["/api/company/professionals"],
    queryFn: () => {
      return fetch('/api/company/professionals', {
        method: 'GET',
        credentials: 'include',
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Erro ao buscar profissionais');
        }
        return res.json();
      });
    },
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/company/services"],
    queryFn: () => {
      return fetch('/api/company/services', {
        method: 'GET',
        credentials: 'include',
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Erro ao buscar serviços');
        }
        return res.json();
      });
    },
  });

  // Processar dados para relatórios
  const generateClientReports = (): ClientReport[] => {
    const clientMap = new Map<string, ClientReport>();

    appointments.forEach(appointment => {
      const key = appointment.clientName;
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          clientName: appointment.clientName,
          clientPhone: appointment.clientPhone,
          totalAppointments: 0,
          totalSpent: 0,
          lastAppointment: appointment.date,
          appointments: []
        });
      }

      const clientReport = clientMap.get(key)!;
      clientReport.totalAppointments++;
      clientReport.totalSpent += appointment.price || 0;
      clientReport.appointments.push(appointment);
      
      // Atualizar último agendamento
      if (new Date(appointment.date) > new Date(clientReport.lastAppointment)) {
        clientReport.lastAppointment = appointment.date;
      }
    });

    return Array.from(clientMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  };

  const generateProfessionalReports = (): ProfessionalReport[] => {
    const professionalMap = new Map<string, ProfessionalReport>();

    appointments.forEach(appointment => {
      const key = appointment.professionalName;
      if (!professionalMap.has(key)) {
        professionalMap.set(key, {
          professionalName: appointment.professionalName,
          totalAppointments: 0,
          totalRevenue: 0,
          services: [],
          appointments: []
        });
      }

      const professionalReport = professionalMap.get(key)!;
      professionalReport.totalAppointments++;
      professionalReport.totalRevenue += appointment.price || 0;
      professionalReport.appointments.push(appointment);

      // Processar serviços
      const existingService = professionalReport.services.find(s => s.serviceName === appointment.serviceName);
      if (existingService) {
        existingService.count++;
        existingService.revenue += appointment.price || 0;
      } else {
        professionalReport.services.push({
          serviceName: appointment.serviceName,
          count: 1,
          revenue: appointment.price || 0
        });
      }
    });

    return Array.from(professionalMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const generateServiceReports = (): ServiceReport[] => {
    const serviceMap = new Map<string, ServiceReport>();

    appointments.forEach(appointment => {
      const key = appointment.serviceName;
      if (!serviceMap.has(key)) {
        serviceMap.set(key, {
          serviceName: appointment.serviceName,
          totalAppointments: 0,
          totalRevenue: 0,
          averagePrice: 0,
          appointments: []
        });
      }

      const serviceReport = serviceMap.get(key)!;
      serviceReport.totalAppointments++;
      serviceReport.totalRevenue += appointment.price || 0;
      serviceReport.appointments.push(appointment);
    });

    // Calcular preço médio
    serviceMap.forEach(serviceReport => {
      serviceReport.averagePrice = serviceReport.totalRevenue / serviceReport.totalAppointments;
    });

    return Array.from(serviceMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const generateTotalReport = (): TotalReport => {
    const clientReports = generateClientReports();
    const professionalReports = generateProfessionalReports();
    const serviceReports = generateServiceReports();

    const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
    const totalAppointments = appointments.length;

    return {
      totalAppointments,
      totalRevenue,
      totalClients: clientReports.length,
      totalProfessionals: professionalReports.length,
      averageAppointmentValue: totalAppointments > 0 ? totalRevenue / totalAppointments : 0,
      topService: serviceReports[0]?.serviceName || "N/A",
      topProfessional: professionalReports[0]?.professionalName || "N/A",
      topClient: clientReports[0]?.clientName || "N/A"
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'confirmado': 'bg-green-100 text-green-800',
      'agendado': 'bg-blue-100 text-blue-800',
      'cancelado': 'bg-red-100 text-red-800',
      'concluido': 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  if (appointmentsLoading || clientsLoading || professionalsLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando relatórios...</div>
      </div>
    );
  }

  const clientReports = generateClientReports();
  const professionalReports = generateProfessionalReports();
  const serviceReports = generateServiceReports();
  const totalReport = generateTotalReport();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CalendarIcon className="w-4 h-4" />
          Atualizado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="professionals" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profissionais
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            Serviços
          </TabsTrigger>
          <TabsTrigger value="total" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Total
          </TabsTrigger>
        </TabsList>

        {/* Aba Clientes */}
        <TabsContent value="clients">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{clientReports.length}</p>
                      <p className="text-sm text-gray-600">Total de Clientes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(totalReport.totalRevenue)}</p>
                      <p className="text-sm text-gray-600">Faturamento Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(totalReport.averageAppointmentValue)}</p>
                      <p className="text-sm text-gray-600">Ticket Médio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Relatório Detalhado por Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Total de Agendamentos</TableHead>
                      <TableHead>Total Gasto</TableHead>
                      <TableHead>Último Agendamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientReports.map((client, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{client.clientName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.clientPhone}
                          </div>
                        </TableCell>
                        <TableCell>{client.totalAppointments}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(client.totalSpent)}
                        </TableCell>
                        <TableCell>{formatDate(client.lastAppointment)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba Profissionais */}
        <TabsContent value="professionals">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{professionalReports.length}</p>
                      <p className="text-sm text-gray-600">Total de Profissionais</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{totalReport.totalAppointments}</p>
                      <p className="text-sm text-gray-600">Total de Serviços</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">{totalReport.topProfessional}</p>
                      <p className="text-sm text-gray-600">Top Profissional</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Relatório por Profissional</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Total de Serviços</TableHead>
                      <TableHead>Faturamento</TableHead>
                      <TableHead>Ticket Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professionalReports.map((professional, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{professional.professionalName}</TableCell>
                        <TableCell>{professional.totalAppointments}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(professional.totalRevenue)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(professional.totalRevenue / professional.totalAppointments)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba Serviços */}
        <TabsContent value="services">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{serviceReports.length}</p>
                      <p className="text-sm text-gray-600">Tipos de Serviços</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{totalReport.totalAppointments}</p>
                      <p className="text-sm text-gray-600">Total Executados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">{totalReport.topService}</p>
                      <p className="text-sm text-gray-600">Serviço Mais Popular</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Relatório Detalhado por Serviço</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Total Executado</TableHead>
                      <TableHead>Faturamento Total</TableHead>
                      <TableHead>Preço Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceReports.map((service, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{service.serviceName}</TableCell>
                        <TableCell>{service.totalAppointments}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(service.totalRevenue)}
                        </TableCell>
                        <TableCell>{formatCurrency(service.averagePrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba Total */}
        <TabsContent value="total">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{totalReport.totalAppointments}</p>
                      <p className="text-sm text-gray-600">Total de Agendamentos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(totalReport.totalRevenue)}</p>
                      <p className="text-sm text-gray-600">Faturamento Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">{totalReport.totalClients}</p>
                      <p className="text-sm text-gray-600">Total de Clientes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(totalReport.averageAppointmentValue)}</p>
                      <p className="text-sm text-gray-600">Ticket Médio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{totalReport.topClient}</p>
                    <p className="text-sm text-gray-600">Maior faturamento</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Profissional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">{totalReport.topProfessional}</p>
                    <p className="text-sm text-gray-600">Maior faturamento</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Serviço</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-xl font-bold text-purple-600">{totalReport.topService}</p>
                    <p className="text-sm text-gray-600">Mais executado</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resumo Geral do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Métricas de Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total de Agendamentos:</span>
                        <span className="font-medium">{totalReport.totalAppointments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Faturamento Total:</span>
                        <span className="font-medium text-green-600">{formatCurrency(totalReport.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ticket Médio:</span>
                        <span className="font-medium">{formatCurrency(totalReport.averageAppointmentValue)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Recursos Ativos</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total de Clientes:</span>
                        <span className="font-medium">{totalReport.totalClients}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total de Profissionais:</span>
                        <span className="font-medium">{totalReport.totalProfessionals}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tipos de Serviços:</span>
                        <span className="font-medium">{serviceReports.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}