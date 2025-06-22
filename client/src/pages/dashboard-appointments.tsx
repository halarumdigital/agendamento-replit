import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Calendar, 
  List, 
  Kanban, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Phone,
  Edit,
  Trash2,
  Filter,
  Search
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Schemas de validação
const appointmentSchema = z.object({
  serviceId: z.string().min(1, 'Selecione um serviço'),
  professionalId: z.string().min(1, 'Selecione um profissional'),
  clientName: z.string().min(1, 'Nome do cliente é obrigatório'),
  clientPhone: z.string().min(1, 'Telefone é obrigatório'),
  clientEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  appointmentDate: z.string().min(1, 'Data é obrigatória'),
  appointmentTime: z.string().min(1, 'Horário é obrigatório'),
  notes: z.string().optional(),
});

const clientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

// Tipos
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

type AppointmentFormData = z.infer<typeof appointmentSchema>;
type ClientFormData = z.infer<typeof clientSchema>;

// Componente de notificações (placeholder)
const NotificationContainer = () => <div />;

export default function DashboardAppointments() {
  // Estados
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'kanban'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false);
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Forms
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      serviceId: '',
      professionalId: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      appointmentDate: format(new Date(), 'yyyy-MM-dd'),
      appointmentTime: '',
      notes: '',
    },
  });

  const clientForm = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
    },
  });

  // Queries
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['/api/company/appointments'],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/company/services'],
  });

  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['/api/company/professionals'],
  });

  const { data: statuses = [] } = useQuery<Status[]>({
    queryKey: ['/api/company/appointment-statuses'],
  });

  // Mutations
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      return apiRequest('/api/company/appointments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
      setIsNewAppointmentOpen(false);
      form.reset();
      toast({
        title: 'Sucesso',
        description: 'Agendamento criado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      return apiRequest(`/api/company/appointments/${selectedAppointment?.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
      setIsEditAppointmentOpen(false);
      form.reset();
      toast({
        title: 'Sucesso',
        description: 'Agendamento atualizado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/company/appointments/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
      toast({
        title: 'Sucesso',
        description: 'Agendamento excluído com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      return apiRequest('/api/company/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/clients'] });
      setIsNewClientOpen(false);
      clientForm.reset();
      toast({
        title: 'Sucesso',
        description: 'Cliente criado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Funções auxiliares
  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const filteredAppointments = appointments.filter((appointment: Appointment) => {
    const matchesSearch = appointment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.professional.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || statusFilter === 'all' || appointment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  // Handlers
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    if (source.droppableId !== destination.droppableId) {
      // Atualizar status do agendamento
      const appointmentId = parseInt(draggableId);
      const newStatus = destination.droppableId;
      
      // Implementar lógica de atualização de status
      console.log('Update appointment status:', appointmentId, newStatus);
    }
  };

  const onSubmit = (data: AppointmentFormData) => {
    createAppointmentMutation.mutate(data);
  };

  const onClientSubmit = (data: ClientFormData) => {
    createClientMutation.mutate(data);
  };

  const onEditSubmit = (data: AppointmentFormData) => {
    updateAppointmentMutation.mutate(data);
  };

  const handleEditAppointment = async (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    form.setValue('serviceId', appointment.serviceId.toString());
    form.setValue('professionalId', appointment.professionalId.toString());
    form.setValue('clientName', appointment.clientName);
    form.setValue('clientPhone', appointment.clientPhone);
    form.setValue('clientEmail', appointment.clientEmail || '');
    form.setValue('appointmentDate', appointment.appointmentDate);
    form.setValue('appointmentTime', appointment.appointmentTime);
    form.setValue('notes', appointment.notes || '');
    setIsEditAppointmentOpen(true);
  };

  // Effect para atualizar data no form quando selecionada
  useEffect(() => {
    if (selectedDate) {
      form.setValue('appointmentDate', format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [selectedDate, form]);

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-sm sm:text-base text-gray-600">Gerencie seus agendamentos e horários</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button
            onClick={() => setIsNewClientOpen(true)}
            variant="outline"
            className="w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-2"
          >
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="ml-2">Novo Cliente</span>
          </Button>
          <Button
            onClick={() => setIsNewAppointmentOpen(true)}
            className="w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-2"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="ml-2">Novo Agendamento</span>
          </Button>
        </div>
      </div>

      {/* Filtros e busca */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, serviço ou profissional..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.name}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controles de visualização */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-4 sm:mb-6">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="calendar" className="flex items-center text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-2">Calendário</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center text-xs sm:text-sm">
              <List className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-2">Lista</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center text-xs sm:text-sm">
              <Kanban className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-2">Kanban</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conteúdo principal */}
      {viewMode === 'calendar' ? (
        <Card className="mt-4">
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
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {paginatedAppointments.map((appointment: Appointment) => (
                  <div
                    key={appointment.id}
                    className="border-b p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm sm:text-base">{appointment.clientName}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">{appointment.service.name}</p>
                          <p className="text-xs sm:text-sm text-gray-500">{appointment.professional.name}</p>
                        </div>
                        <div className="flex flex-col sm:items-end">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            {format(new Date(appointment.appointmentDate), 'dd/MM/yyyy')}
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                            {appointment.appointmentTime}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {appointment.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAppointment(appointment)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAppointmentMutation.mutate(appointment.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-gray-600">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAppointments.length)} de {filteredAppointments.length} agendamentos
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {statuses.map((status) => {
              const statusAppointments = appointments.filter((apt: Appointment) => {
                return apt.status === status.name;
              });

              return (
                <Card key={status.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span>{status.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {statusAppointments.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Droppable droppableId={status.name}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2 min-h-[200px]"
                        >
                          {statusAppointments.map((appointment: Appointment, index: number) => (
                            <Draggable
                              key={appointment.id}
                              draggableId={appointment.id.toString()}
                              index={index}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setIsAppointmentDetailsOpen(true);
                                  }}
                                >
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-sm">{appointment.clientName}</h4>
                                    <p className="text-xs text-gray-600">{appointment.service.name}</p>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(appointment.appointmentDate), 'dd/MM')}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <Clock className="h-3 w-3" />
                                      {appointment.appointmentTime}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Dialog Novo Agendamento */}
      <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
        <DialogContent className="max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.name} - R$ {service.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um profissional" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {professionals.map((professional) => (
                            <SelectItem key={professional.id} value={professional.id.toString()}>
                              {professional.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
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
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="appointmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                        <Input type="time" {...field} />
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
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações adicionais..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewAppointmentOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {createAppointmentMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo Cliente */}
      <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-4">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewClientOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createClientMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {createClientMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Agendamento */}
      <Dialog open={isEditAppointmentOpen} onOpenChange={setIsEditAppointmentOpen}>
        <DialogContent className="max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.name} - R$ {service.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um profissional" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {professionals.map((professional) => (
                            <SelectItem key={professional.id} value={professional.id.toString()}>
                              {professional.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
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
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="appointmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                        <Input type="time" {...field} />
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
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações adicionais..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditAppointmentOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateAppointmentMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {updateAppointmentMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes do Agendamento */}
      <Dialog open={isAppointmentDetailsOpen} onOpenChange={setIsAppointmentDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Cliente</h3>
                <p className="text-sm text-gray-600">{selectedAppointment.clientName}</p>
                <p className="text-sm text-gray-600">{selectedAppointment.clientPhone}</p>
                {selectedAppointment.clientEmail && (
                  <p className="text-sm text-gray-600">{selectedAppointment.clientEmail}</p>
                )}
              </div>
              
              <div>
                <h3 className="font-medium">Serviço</h3>
                <p className="text-sm text-gray-600">{selectedAppointment.service.name}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Profissional</h3>
                <p className="text-sm text-gray-600">{selectedAppointment.professional.name}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Data e Horário</h3>
                <p className="text-sm text-gray-600">
                  {format(new Date(selectedAppointment.appointmentDate), 'dd/MM/yyyy')} às {selectedAppointment.appointmentTime}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Status</h3>
                <Badge variant="secondary">{selectedAppointment.status}</Badge>
              </div>
              
              {selectedAppointment.notes && (
                <div>
                  <h3 className="font-medium">Observações</h3>
                  <p className="text-sm text-gray-600">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsAppointmentDetailsOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Container de Notificações */}
      <NotificationContainer />
    </div>
  );
}