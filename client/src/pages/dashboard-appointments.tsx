import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar, Plus, List, Grid3X3, Kanban } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CompanyLayout from "@/components/layout/company-layout";

// Types
interface Appointment {
  id: number;
  serviceId: number;
  professionalId: number;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  notes?: string;
  status: string;
  totalPrice: number;
  service: {
    name: string;
    color: string;
  };
  professional: {
    name: string;
  };
}

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  color: string;
}

interface Professional {
  id: number;
  name: string;
}

interface Status {
  id: number;
  name: string;
  color: string;
}

const appointmentSchema = z.object({
  clientId: z.number().optional(),
  serviceId: z.number().min(1, "Selecione um serviço"),
  professionalId: z.number().min(1, "Selecione um profissional"),
  statusId: z.number().min(1, "Selecione um status"),
  clientName: z.string().min(1, "Nome do cliente é obrigatório"),
  clientEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  clientPhone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  appointmentDate: z.string().min(1, "Data é obrigatória"),
  appointmentTime: z.string().min(1, "Horário é obrigatório"),
  notes: z.string().optional(),
  confirmed: z.boolean().optional(),
});

const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;
type ClientFormData = z.infer<typeof clientSchema>;

export default function DashboardAppointments() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'kanban'>('calendar');
  const [filterProfessional, setFilterProfessional] = useState<string>('all');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch appointments for current month
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/company/appointments', format(currentDate, 'yyyy-MM')],
  });

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/company/services'],
  });

  // Fetch professionals
  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['/api/company/professionals'],
  });

  // Fetch status
  const { data: statuses = [] } = useQuery<Status[]>({
    queryKey: ['/api/company/status'],
  });

  // Fetch clients
  const { data: clients = [] } = useQuery<{id: number; name: string; phone: string; email: string}[]>({
    queryKey: ['/api/company/clients'],
  });

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientId: undefined,
      serviceId: 0,
      professionalId: 0,
      statusId: 0,
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      appointmentDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : "",
      appointmentTime: "",
      notes: "",
      confirmed: false,
    },
  });

  const clientForm = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const response = await fetch('/api/company/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar cliente');
      }
      
      return response.json();
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/clients'] });
      setIsNewClientOpen(false);
      clientForm.reset();
      
      // Selecionar o cliente recém-criado no formulário de agendamento
      setSelectedClientId(newClient.id.toString());
      form.setValue('clientId', newClient.id);
      form.setValue('clientName', newClient.name);
      form.setValue('clientPhone', newClient.phone);
      form.setValue('clientEmail', newClient.email || '');
      
      toast({
        title: "Sucesso",
        description: "Cliente criado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar cliente",
        variant: "destructive",
      });
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const selectedService = services.find(s => s.id === data.serviceId);
      const response = await fetch('/api/company/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          duration: selectedService?.duration || 60,
          totalPrice: selectedService?.price || 0,
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar agendamento');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
      setIsNewAppointmentOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Agendamento criado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar agendamento",
        variant: "destructive",
      });
    },
  });

  // Calendar navigation
  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      const dayAppointments = appointments.filter((apt: Appointment) => 
        isSameDay(new Date(apt.appointmentDate), day) &&
        (filterProfessional === 'all' || apt.professionalId.toString() === filterProfessional)
      );

      days.push(
        <div
          key={day.toString()}
          className={`min-h-[120px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 ${
            !isSameMonth(day, monthStart) ? 'text-gray-400 bg-gray-50' : ''
          } ${isSameDay(day, new Date()) ? 'bg-blue-50 border-blue-200' : ''}`}
          onClick={() => {
            setSelectedDate(cloneDay);
            form.setValue('appointmentDate', format(cloneDay, 'yyyy-MM-dd'));
          }}
        >
          <div className="font-medium mb-1">
            {format(day, dateFormat)}
          </div>
          <div className="space-y-1">
            {dayAppointments.slice(0, 3).map((appointment: Appointment) => (
              <div
                key={appointment.id}
                className="text-xs p-1 rounded text-white truncate"
                style={{ backgroundColor: appointment.service.color }}
                title={`${appointment.appointmentTime} - ${appointment.clientName}`}
              >
                {appointment.appointmentTime} {appointment.clientName}
              </div>
            ))}
            {dayAppointments.length > 3 && (
              <div className="text-xs text-gray-500">
                +{dayAppointments.length - 3} mais
              </div>
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={day.toString()} className="grid grid-cols-7">
        {days}
      </div>
    );
    days = [];
  }

  const onSubmit = (data: AppointmentFormData) => {
    createAppointmentMutation.mutate(data);
  };

  // Update form date when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      form.setValue('appointmentDate', format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [selectedDate, form]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-gray-600">Gerencie seus agendamentos e horários</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={filterProfessional} onValueChange={setFilterProfessional}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {professionals.map((prof) => (
                <SelectItem key={prof.id} value={prof.id.toString()}>
                  {prof.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              <Kanban className="h-4 w-4" />
            </Button>
          </div>

          <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serviço</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um serviço" />
                            </SelectTrigger>
                            <SelectContent>
                              {services.map((service) => (
                                <SelectItem key={service.id} value={service.id.toString()}>
                                  {service.name} - R$ {service.price.toFixed(2)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="professionalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profissional</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um profissional" />
                            </SelectTrigger>
                            <SelectContent>
                              {professionals.map((professional) => (
                                <SelectItem key={professional.id} value={professional.id.toString()}>
                                  {professional.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Cliente</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome completo" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(11) 99999-9999" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="cliente@email.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="appointmentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="appointmentTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações (opcional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Informações adicionais" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsNewAppointmentOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createAppointmentMutation.isPending}>
                      {createAppointmentMutation.isPending ? "Criando..." : "Criar Agendamento"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-0 mb-4">
              {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((day) => (
                <div key={day} className="p-2 text-center font-medium text-gray-500 bg-gray-50">
                  {day}
                </div>
              ))}
            </div>
            <div className="border border-gray-200">
              {rows}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum agendamento encontrado
                </p>
              ) : (
                appointments.map((appointment: Appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: appointment.service.color }}
                      />
                      <div>
                        <div className="font-medium">{appointment.clientName}</div>
                        <div className="text-sm text-gray-500">
                          {appointment.service.name} • {appointment.professional.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {format(new Date(appointment.appointmentDate), 'dd/MM/yyyy')} às {appointment.appointmentTime}
                      </div>
                      <Badge variant="outline">
                        {appointment.status === 'scheduled' && 'Agendado'}
                        {appointment.status === 'confirmed' && 'Confirmado'}
                        {appointment.status === 'cancelled' && 'Cancelado'}
                        {appointment.status === 'completed' && 'Concluído'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Kanban View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statuses.map((status) => {
            const statusAppointments = appointments.filter((apt: Appointment) => 
              apt.status === status.name &&
              (filterProfessional === 'all' || apt.professionalId.toString() === filterProfessional)
            );
            
            return (
              <Card key={status.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <CardTitle className="text-lg">{status.name}</CardTitle>
                    <Badge variant="secondary" className="ml-auto">
                      {statusAppointments.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  <div className="space-y-3">
                    {statusAppointments.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">
                        Nenhum agendamento
                      </p>
                    ) : (
                      statusAppointments.map((appointment: Appointment) => (
                        <div
                          key={appointment.id}
                          className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">{appointment.clientName}</h4>
                            <span className="text-xs text-gray-500">
                              {appointment.appointmentTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: appointment.service.color }}
                            />
                            <span className="text-xs text-gray-600">{appointment.service.name}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {appointment.professional.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {format(new Date(appointment.appointmentDate), 'dd/MM/yyyy')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}