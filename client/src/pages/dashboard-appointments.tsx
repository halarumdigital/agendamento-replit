import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, List, Plus, ChevronLeft, ChevronRight, Clock, User, MapPin, Phone, Mail, Edit, Trash2 } from 'lucide-react';
import { Kanban } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

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
  serviceId: z.number().min(1, 'Selecione um serviço'),
  professionalId: z.number().min(1, 'Selecione um profissional'),
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

type AppointmentFormData = z.infer<typeof appointmentSchema>;
type ClientFormData = z.infer<typeof clientSchema>;

export default function DashboardAppointments() {
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'kanban'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [filterProfessional, setFilterProfessional] = useState('all');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate week boundaries
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });

  // Week navigation
  const previousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  // Generate week days
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      serviceId: 0,
      professionalId: 0,
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      appointmentDate: '',
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

  const editForm = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      serviceId: 0,
      professionalId: 0,
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      appointmentDate: '',
      appointmentTime: '',
      notes: '',
    },
  });

  // Queries
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/company/appointments'],
  });

  const { data: services = [] } = useQuery({
    queryKey: ['/api/company/services'],
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ['/api/company/professionals'],
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['/api/company/appointment-statuses'],
  });

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      return apiRequest('/api/company/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: 'Cliente criado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['/api/company/clients'] });
      setIsNewClientOpen(false);
      clientForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar cliente', description: error.message, variant: 'destructive' });
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      return apiRequest('/api/company/appointments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: 'Agendamento criado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
      setIsNewAppointmentOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar agendamento', description: error.message, variant: 'destructive' });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData & { id: number }) => {
      const { id, ...updateData } = data;
      return apiRequest(`/api/company/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: () => {
      toast({ title: 'Agendamento atualizado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
      setIsEditAppointmentOpen(false);
      setEditingAppointment(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar agendamento', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/company/appointments/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({ title: 'Agendamento excluído com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir agendamento', description: error.message, variant: 'destructive' });
    },
  });

  // Update appointment date when a day is selected
  useEffect(() => {
    if (selectedDate) {
      form.setValue('appointmentDate', format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [selectedDate, form]);

  // Filter appointments by professional
  const filteredAppointments = appointments.filter((appointment: Appointment) => {
    if (filterProfessional === 'all') return true;
    return appointment.professionalId.toString() === filterProfessional;
  });

  const onSubmit = (data: AppointmentFormData) => {
    createAppointmentMutation.mutate(data);
  };

  const onClientSubmit = (data: ClientFormData) => {
    createClientMutation.mutate(data);
  };

  const onEditSubmit = (data: AppointmentFormData) => {
    if (editingAppointment) {
      updateAppointmentMutation.mutate({ ...data, id: editingAppointment.id });
    }
  };

  const handleEditAppointment = async (appointment: Appointment) => {
    setEditingAppointment(appointment);
    editForm.reset({
      serviceId: appointment.serviceId,
      professionalId: appointment.professionalId,
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      clientEmail: appointment.clientEmail || '',
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      notes: appointment.notes || '',
    });
    setIsEditAppointmentOpen(true);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    // Handle drag and drop logic here if needed
  };

  // Get appointments for a specific day
  const getAppointmentsForDay = (day: Date) => {
    return filteredAppointments.filter((appointment: Appointment) => {
      const appointmentDate = parseISO(appointment.appointmentDate);
      return isSameDay(appointmentDate, day);
    });
  };

  // Render calendar view
  const renderCalendarView = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            {format(weekStart, 'dd MMM', { locale: ptBR })} - {format(weekEnd, 'dd MMM yyyy', { locale: ptBR })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={previousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-0 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="p-2 text-center font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0 border border-gray-200">
          {weekDays.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[150px] p-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                  isSelected ? 'bg-blue-50 border-blue-300' : ''
                } ${isToday ? 'bg-yellow-50' : ''}`}
                onClick={() => setSelectedDate(day)}
              >
                <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((appointment: Appointment) => (
                    <div
                      key={appointment.id}
                      className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: appointment.service.color + '20', color: appointment.service.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAppointment(appointment);
                      }}
                    >
                      <div className="font-medium">{appointment.appointmentTime}</div>
                      <div className="truncate">{appointment.clientName}</div>
                      <div className="truncate">{appointment.service.name}</div>
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayAppointments.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  // Render list view
  const renderListView = () => (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Agendamentos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredAppointments.map((appointment: Appointment) => (
            <div
              key={appointment.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: appointment.service.color }}
                />
                <div>
                  <div className="font-medium">{appointment.clientName}</div>
                  <div className="text-sm text-gray-500">
                    {appointment.service.name} - {appointment.professional.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(parseISO(appointment.appointmentDate), 'dd/MM/yyyy')} às {appointment.appointmentTime}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{appointment.status}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditAppointment(appointment)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAppointmentMutation.mutate(appointment.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Render kanban view
  const renderKanbanView = () => (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statuses.map((status: Status) => {
          const statusAppointments = filteredAppointments.filter((apt: Appointment) => {
            const matchesStatus = apt.status === status.name;
            if (!selectedDate) return matchesStatus;
            return matchesStatus && isSameDay(parseISO(apt.appointmentDate), selectedDate);
          });

          return (
            <Card key={status.id}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.name} ({statusAppointments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId={status.id.toString()}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
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
                              className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md cursor-pointer"
                              onClick={() => handleEditAppointment(appointment)}
                            >
                              <div className="font-medium text-sm">{appointment.clientName}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {appointment.service.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(parseISO(appointment.appointmentDate), 'dd/MM')} às {appointment.appointmentTime}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {appointment.professional.name}
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
  );

  if (appointmentsLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-sm sm:text-base text-gray-600">Gerencie seus agendamentos e horários</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Select value={filterProfessional} onValueChange={setFilterProfessional}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todos os profissionais" />
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

          <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
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
                                  {service.name} - R$ {typeof service.price === 'string' ? parseFloat(service.price).toFixed(2) : service.price.toFixed(2)}
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

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observações sobre o agendamento" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsNewAppointmentOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createAppointmentMutation.isPending}>
                      {createAppointmentMutation.isPending ? 'Criando...' : 'Criar Agendamento'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View Mode Controls Above Calendar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-4 gap-3 sm:gap-4">
        <div className="flex items-center bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setViewMode('calendar')}
          >
            <Calendar className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Agendar</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Lista</span>
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setViewMode('kanban')}
          >
            <Kanban className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Kanban</span>
          </Button>
        </div>
        
        {viewMode === 'kanban' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                const newDate = e.target.value ? new Date(e.target.value) : null;
                setSelectedDate(newDate);
              }}
              className="px-3 py-2 border rounded-md text-sm"
            />
            {selectedDate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(null)}
              >
                Limpar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Render different views */}
      {viewMode === 'calendar' && renderCalendarView()}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'kanban' && renderKanbanView()}

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditAppointmentOpen} onOpenChange={setIsEditAppointmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
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
                              {service.name}
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
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
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

              <FormField
                control={editForm.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
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
                control={editForm.control}
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

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações sobre o agendamento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditAppointmentOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateAppointmentMutation.isPending}>
                  {updateAppointmentMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}