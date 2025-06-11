import { Building2, Users, Calendar, CreditCard, Settings, FileText, User, MessageSquare, DollarSign, Clock, UserCheck, TrendingUp, TrendingDown, Plus, MoreHorizontal, Download } from "lucide-react";
import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function CompanyDashboardNew() {
  const { company, isLoading } = useCompanyAuth();

  // Buscar agendamentos do dia
  const { data: appointments = [] } = useQuery({
    queryKey: ['/api/company/appointments'],
    enabled: !!company
  });

  // Buscar serviços para obter os preços
  const { data: services = [] } = useQuery({
    queryKey: ['/api/company/services'],
    enabled: !!company
  });

  // Calcular faturamento do dia dos agendamentos concluídos
  const calculateDailyRevenue = () => {
    if (!Array.isArray(appointments) || !Array.isArray(services)) {
      return 0;
    }

    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
    
    const todayCompletedAppointments = appointments.filter((appointment: any) => {
      if (!appointment.appointmentDate) return false;
      
      try {
        const appointmentDate = new Date(appointment.appointmentDate);
        if (isNaN(appointmentDate.getTime())) return false;
        
        const appointmentStr = appointmentDate.getFullYear() + '-' + 
                              String(appointmentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(appointmentDate.getDate()).padStart(2, '0');
        
        return appointmentStr === todayStr && appointment.status === 'Concluído';
      } catch {
        return false;
      }
    });

    const totalRevenue = todayCompletedAppointments.reduce((total: number, appointment: any) => {
      const service = services.find((s: any) => s.id === appointment.serviceId);
      return total + (parseFloat(service?.price) || 0);
    }, 0);

    return totalRevenue;
  };

  const calculateTodayAppointments = () => {
    if (!Array.isArray(appointments)) {
      return 0;
    }

    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
    
    return appointments.filter((appointment: any) => {
      if (!appointment.appointmentDate) return false;
      
      try {
        const appointmentDate = new Date(appointment.appointmentDate);
        if (isNaN(appointmentDate.getTime())) return false;
        
        const appointmentStr = appointmentDate.getFullYear() + '-' + 
                              String(appointmentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(appointmentDate.getDate()).padStart(2, '0');
        
        return appointmentStr === todayStr;
      } catch {
        return false;
      }
    }).length;
  };

  // Calcular clientes atendidos hoje (serviços concluídos)
  const calculateTodayClientsServed = () => {
    if (!Array.isArray(appointments)) {
      return 0;
    }

    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
    
    return appointments.filter((appointment: any) => {
      if (!appointment.appointmentDate) return false;
      
      try {
        const appointmentDate = new Date(appointment.appointmentDate);
        if (isNaN(appointmentDate.getTime())) return false;
        
        const appointmentStr = appointmentDate.getFullYear() + '-' + 
                              String(appointmentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(appointmentDate.getDate()).padStart(2, '0');
        
        return appointmentStr === todayStr && appointment.status === 'Concluído';
      } catch {
        return false;
      }
    }).length;
  };

  // Calcular dados dos serviços realizados para o gráfico
  const calculateServicesData = () => {
    if (!Array.isArray(appointments) || !Array.isArray(services)) {
      return [];
    }

    // Contar agendamentos concluídos por serviço
    const completedAppointments = appointments.filter((appointment: any) => 
      appointment.status === 'Concluído'
    );

    const serviceCount: { [key: string]: number } = {};
    
    completedAppointments.forEach((appointment: any) => {
      const service = services.find((s: any) => s.id === appointment.serviceId);
      if (service) {
        serviceCount[service.name] = (serviceCount[service.name] || 0) + 1;
      }
    });

    // Calcular total para porcentagens
    const total = Object.values(serviceCount).reduce((sum, count) => sum + count, 0);

    // Converter para formato do gráfico com porcentagens
    const chartData = Object.entries(serviceCount).map(([name, value]) => {
      const service = services.find((s: any) => s.name === name);
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
      return {
        name,
        value,
        percentage,
        displayName: `${name} (${percentage}%)`,
        color: service?.color || '#8884d8'
      };
    });

    return chartData.sort((a, b) => b.value - a.value);
  };

  // Calcular dados mensais de receita para o gráfico
  const calculateMonthlyRevenue = () => {
    if (!Array.isArray(appointments)) {
      return [];
    }

    // Filtrar agendamentos concluídos
    const completedAppointments = appointments.filter((appointment: any) => 
      appointment.status === 'Concluído'
    );

    // Agrupar por mês
    const monthlyData: { [key: string]: number } = {};
    
    completedAppointments.forEach((appointment: any) => {
      const appointmentDate = new Date(appointment.appointmentDate);
      const monthKey = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}`;
      const price = parseFloat(appointment.totalPrice || '0');
      
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + price;
    });

    // Converter para formato do gráfico com nomes dos meses em português
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const chartData = Object.entries(monthlyData)
      .map(([monthKey, revenue]) => {
        const [year, month] = monthKey.split('-');
        const monthName = monthNames[parseInt(month) - 1];
        return {
          month: `${monthName}/${year.slice(-2)}`,
          receita: revenue,
          monthKey
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .slice(-12); // Últimos 12 meses

    return chartData;
  };

  const dailyRevenue = calculateDailyRevenue();
  const todayAppointmentsCount = calculateTodayAppointments();
  const todayClientsServed = calculateTodayClientsServed();
  const servicesData = calculateServicesData();
  const monthlyRevenueData = calculateMonthlyRevenue();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-96">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Carregando...</h3>
          <p className="text-sm text-gray-500">
            Obtendo informações da empresa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Date and Filter Controls */}
      <div className="flex justify-between items-center mb-6 px-6 pt-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('pt-BR', { 
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50">Dia</button>
            <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Semana</button>
            <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Mês</button>
          </div>
          <button className="flex items-center space-x-1 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap">
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 px-6">
        <div className="bg-white rounded shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Faturamento do Dia</p>
              <h3 className="text-2xl font-bold text-gray-800">
                R$ {dailyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 text-green-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center text-green-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>Serviços concluídos</span>
            </div>
            <span className="text-xs text-gray-500 ml-2">hoje</span>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Agendamentos do Dia</p>
              <h3 className="text-2xl font-bold text-gray-800">{todayAppointmentsCount}</h3>
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center text-blue-600 text-sm font-medium">
              <Calendar className="w-4 h-4 mr-1" />
              <span>Agendamentos</span>
            </div>
            <span className="text-xs text-gray-500 ml-2">de hoje</span>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Taxa de Ocupação</p>
              <h3 className="text-2xl font-bold text-gray-800">85%</h3>
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center text-green-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>5,2%</span>
            </div>
            <span className="text-xs text-gray-500 ml-2">vs. semana passada</span>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Clientes Atendidos</p>
              <h3 className="text-2xl font-bold text-gray-800">{todayClientsServed}</h3>
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center text-orange-600 text-sm font-medium">
              <UserCheck className="w-4 h-4 mr-1" />
              <span>Serviços concluídos</span>
            </div>
            <span className="text-xs text-gray-500 ml-2">hoje</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 px-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded shadow-sm p-5 border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Faturamento Mensal</h3>
            <button className="text-sm text-gray-500 hover:text-purple-600">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="h-80">
            {monthlyRevenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#666' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#666' }}
                    tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-gray-500">Nenhum dado de faturamento disponível</span>
              </div>
            )}
          </div>
        </div>

        {/* Services Chart */}
        <div className="bg-white rounded shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Serviços Realizados</h3>
            <button className="text-sm text-gray-500 hover:text-purple-600">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="h-80">
            {servicesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={servicesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {servicesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => {
                      const data = servicesData.find(item => item.name === value);
                      return (
                        <span style={{ color: entry.color }}>
                          {data?.displayName || value}
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-gray-500">Nenhum serviço concluído</span>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6">
        {/* Today's Appointments */}
        <div className="bg-white rounded shadow-sm p-5 border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Agendamentos de Hoje</h3>
            <button className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 rounded text-sm font-medium text-white hover:bg-purple-700">
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Horário</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Serviço</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Profissional</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-800">09:00</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Isabela Oliveira</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Corte e Escova</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Fernanda Souza</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Concluído</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-gray-500 hover:text-purple-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-800">10:30</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Carolina Mendes</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Manicure e Pedicure</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Juliana Costa</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Em andamento</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-gray-500 hover:text-purple-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-800">11:15</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Gabriela Santos</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Coloração</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Fernanda Souza</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Aguardando</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-gray-500 hover:text-purple-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-800">13:00</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Rafaela Lima</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Hidratação e Escova</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Amanda Rocha</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Confirmado</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-gray-500 hover:text-purple-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-800">14:30</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Beatriz Ferreira</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Design de Sobrancelhas</td>
                  <td className="py-3 px-4 text-sm text-gray-800">Juliana Costa</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Confirmado</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-gray-500 hover:text-purple-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <button className="text-sm text-purple-600 font-medium hover:underline">Ver todos os agendamentos</button>
          </div>
        </div>

        {/* Alerts and Notifications */}
        <div className="bg-white rounded shadow-sm p-5 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Alertas e Notificações</h3>
          
          <div className="mb-5">
            <h4 className="text-sm font-medium text-gray-600 mb-3">Estoque Baixo</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded border border-red-100">
                <div className="flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 mr-3">
                    ⚠️
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Shampoo Hidratante</p>
                    <p className="text-xs text-gray-500">Restam 2 unidades</p>
                  </div>
                </div>
                <button className="text-xs text-purple-600 font-medium hover:underline">Repor</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded border border-red-100">
                <div className="flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 mr-3">
                    ⚠️
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Máscara Capilar</p>
                    <p className="text-xs text-gray-500">Restam 3 unidades</p>
                  </div>
                </div>
                <button className="text-xs text-purple-600 font-medium hover:underline">Repor</button>
              </div>
            </div>
          </div>
          
          <div className="mb-5">
            <h4 className="text-sm font-medium text-gray-600 mb-3">Aniversariantes do Mês</h4>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-blue-50 rounded border border-blue-100">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-3">
                  🎂
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Mariana Almeida</p>
                  <p className="text-xs text-gray-500">12 de Junho</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-blue-50 rounded border border-blue-100">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-3">
                  🎂
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Paulo Rodrigues</p>
                  <p className="text-xs text-gray-500">18 de Junho</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-3">Lembretes</h4>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-yellow-50 rounded border border-yellow-100">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600 mr-3">
                  🔧
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Manutenção de Equipamentos</p>
                  <p className="text-xs text-gray-500">Agendado para 10/06</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-green-50 rounded border border-green-100">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-600 mr-3">
                  💰
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Pagamento de Fornecedor</p>
                  <p className="text-xs text-gray-500">Vence em 15/06</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}