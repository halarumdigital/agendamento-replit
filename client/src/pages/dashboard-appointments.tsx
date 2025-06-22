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
import { ChevronLeft, ChevronRight, Calendar, Plus, List, Grid3X3, Kanban, Eye, Edit2 as Edit, Star } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { useRealTimeUpdates } from "@/hooks/use-real-time-updates";

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { showNewAppointmentNotification, NotificationContainer } = useNotifications();
  
  // Enable real-time updates for new appointments
  useRealTimeUpdates({
    onNewAppointment: (appointmentData) => {
      // Show notification with sound when new appointment is created via WhatsApp
      showNewAppointmentNotification({
        clientName: appointmentData.clientName,
        serviceName: appointmentData.serviceName,
        appointmentDate: appointmentData.appointmentDate,
        appointmentTime: appointmentData.appointmentTime,
        professionalName: appointmentData.professionalName || 'Profissional'
      });
    }
  });

  // Fetch appointments (show all, not filtered by month)
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/company/appointments'],
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

  const editForm = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientId: undefined,
      serviceId: 0,
      professionalId: 0,
      statusId: 0,
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      appointmentDate: "",
      appointmentTime: "",
      notes: "",
      confirmed: false,
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

  const sendReviewInvitationMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await fetch(`/api/appointments/${appointmentId}/send-review-invitation`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao enviar convite de avaliação");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Convite de avaliação enviado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/company/appointments"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao enviar convite", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const selectedService = services.find(s => s.id === data.serviceId);
      const selectedStatus = statuses.find(s => s.id === data.statusId);
      const response = await fetch('/api/company/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          duration: selectedService?.duration || 60,
          totalPrice: selectedService?.price || 0,
          status: selectedStatus?.name || 'Pendente',
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar agendamento');
      }
      
      return response.json();
    },
    onSuccess: (newAppointment, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
      setIsNewAppointmentOpen(false);
      form.reset();
      setSelectedClientId('');
      
      // Disparar notificação sonora e visual
      const selectedService = services.find(s => s.id === variables.serviceId);
      const selectedProfessional = professionals.find(p => p.id === variables.professionalId);
      
      showNewAppointmentNotification({
        clientName: variables.clientName,
        serviceName: selectedService?.name || 'Serviço',
        appointmentDate: variables.appointmentDate,
        appointmentTime: variables.appointmentTime,
        professionalName: selectedProfessional?.name || 'Profissional',
      });
      
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

  // Update appointment status mutation
  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: number; status: string }) => {
      const response = await fetch(`/api/company/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar status');
      }
      
      return response.json();
    },
    onMutate: async ({ appointmentId, status }) => {
      console.log('🎯 Kanban onMutate: Starting optimistic update for appointment', appointmentId, 'to status', status);
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/company/appointments'] });
      
      // Snapshot the previous value
      const previousAppointments = queryClient.getQueryData(['/api/company/appointments']);
      console.log('🎯 Kanban onMutate: Previous appointments count:', previousAppointments ? (previousAppointments as any[]).length : 0);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['/api/company/appointments'], (old: any[]) => {
        if (!old) {
          console.log('🎯 Kanban onMutate: No old data found');
          return old;
        }
        
        const updated = old.map((appointment: any) => 
          appointment.id === appointmentId 
            ? { ...appointment, status }
            : appointment
        );
        
        console.log('🎯 Kanban onMutate: Updated appointment found:', updated.find(apt => apt.id === appointmentId)?.status);
        return updated;
      });
      
      // Return a context object with the snapshotted value
      return { previousAppointments };
    },
    onError: (error: Error, variables, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousAppointments) {
        queryClient.setQueryData(['/api/company/appointments'], context.previousAppointments);
      }
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have latest data
      console.log('🎯 Kanban onSettled: Invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
    },
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, data }: { appointmentId: number; data: Partial<AppointmentFormData> }) => {
      const response = await fetch(`/api/company/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar agendamento');
      }
      
      return response.json();
    },
    onSuccess: (updatedAppointment) => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
      
      // Update the editing appointment with new data
      setEditingAppointment(updatedAppointment);
      
      toast({
        title: "Agendamento atualizado",
        description: "O agendamento foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar agendamento",
        description: error.message,
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
      const dayAppointments = appointments.filter((apt: Appointment) => {
        // Fix timezone issue: extract date directly from ISO string
        const appointmentDateString = apt.appointmentDate.split('T')[0];
        const appointmentDate = new Date(appointmentDateString + 'T12:00:00');
        return isSameDay(appointmentDate, day) &&
          (filterProfessional === 'all' || apt.professionalId.toString() === filterProfessional);
      });

      days.push(
        <div
          key={day.toString()}
          className={`min-h-[140px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 ${
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
                className="group text-xs p-1.5 rounded text-white cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: appointment.service?.color || '#3b82f6' }}
                title={`${appointment.appointmentTime} - ${appointment.clientName} - ${appointment.service?.name || 'Serviço'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAppointment(appointment);
                  setIsAppointmentDetailsOpen(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{appointment.appointmentTime}</div>
                    <div className="text-white opacity-90 truncate text-xs">{appointment.clientName}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-white hover:bg-opacity-20 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAppointment(appointment);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
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

  // Filter appointments based on search term
  const filteredAppointments = appointments.filter((appointment: Appointment) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      appointment.clientName.toLowerCase().includes(searchLower) ||
      appointment.clientPhone.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const totalItems = filteredAppointments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    // If dropped in the same position, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Find the appointment being moved
    const appointmentId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    console.log('🎯 Kanban: Moving appointment', appointmentId, 'from', source.droppableId, 'to', newStatus);

    // Update the appointment status with optimistic update
    updateAppointmentStatusMutation.mutate({
      appointmentId,
      status: newStatus
    });
  };

  // Helper functions
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId) {
      const selectedClient = clients.find(c => c.id.toString() === clientId);
      if (selectedClient) {
        form.setValue('clientId', selectedClient.id);
        form.setValue('clientName', selectedClient.name);
        form.setValue('clientPhone', selectedClient.phone);
        form.setValue('clientEmail', selectedClient.email || '');
      }
    } else {
      form.setValue('clientId', undefined);
      form.setValue('clientName', '');
      form.setValue('clientPhone', '');
      form.setValue('clientEmail', '');
    }
  };

  const onSubmit = (data: AppointmentFormData) => {
    console.log("Form data being submitted:", data);
    console.log("Form errors:", form.formState.errors);
    createAppointmentMutation.mutate(data);
  };

  const onClientSubmit = (data: ClientFormData) => {
    createClientMutation.mutate(data);
  };

  const onEditSubmit = (data: AppointmentFormData) => {
    console.log("🔄 Edit form data being submitted:", data);
    console.log("🔄 Editing appointment:", editingAppointment);
    console.log("🔄 Edit form errors:", editForm.formState.errors);
    
    if (!editingAppointment) {
      console.error("❌ No editing appointment found");
      return;
    }
    
    updateAppointmentMutation.mutate({ 
      appointmentId: editingAppointment.id, 
      data 
    });
  };

  const handleEditAppointment = async (appointment: Appointment) => {
    console.log('✏️ Edit: handleEditAppointment called for appointment:', appointment.id);
    
    try {
      // Fetch fresh appointment data from server
      console.log('✏️ Edit: Fetching appointment data from server...');
      const response = await fetch(`/api/company/appointments/${appointment.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('✏️ Edit: Response not OK:', response.status, response.statusText);
        throw new Error('Erro ao buscar dados do agendamento');
      }
      
      const freshAppointment = await response.json();
      console.log('✏️ Edit: Fresh appointment data received:', freshAppointment);
      setEditingAppointment(freshAppointment);
      
      // Find status ID by status name
      const statusObj = statuses.find(s => s.name.toLowerCase() === freshAppointment.status.toLowerCase());
      console.log('✏️ Edit: Status object found:', statusObj);
      
      // Populate form with fresh appointment data
      // Extract date directly from ISO string to avoid timezone issues
      const appointmentDateString = freshAppointment.appointmentDate.split('T')[0];
      console.log('✏️ Edit: Appointment date string:', appointmentDateString);
      
      const formData = {
        clientId: undefined,
        serviceId: freshAppointment.serviceId,
        professionalId: freshAppointment.professionalId,
        statusId: statusObj?.id || 0,
        clientName: freshAppointment.clientName,
        clientEmail: freshAppointment.clientEmail || "",
        clientPhone: freshAppointment.clientPhone,
        appointmentDate: appointmentDateString,
        appointmentTime: freshAppointment.appointmentTime,
        notes: freshAppointment.notes || "",
        confirmed: false,
      };
      
      console.log('✏️ Edit: Form data to populate:', formData);
      editForm.reset(formData);
      
      console.log('✏️ Edit: Opening edit dialog...');
      setIsEditAppointmentOpen(true);
    } catch (error) {
      console.error('✏️ Edit: Error in handleEditAppointment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do agendamento",
        variant: "destructive"
      });
    }
  };

  // Update form date when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      form.setValue('appointmentDate', format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [selectedDate, form]);

  return (
      <div className="p-3 sm:p-6">
        {/* Header - Mobile Responsive */}
        <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agendamentos</h1>
            <p className="text-gray-600 text-sm sm:text-base">Gerencie seus agendamentos e horários</p>
          </div>
          
          {/* Mobile Layout - Stacked */}
          <div className="flex flex-col gap-3 lg:hidden">
            {/* Professional Filter - Mobile */}
            <Select value={filterProfessional} onValueChange={setFilterProfessional}>
              <SelectTrigger className="w-full">
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
            
            {/* Date Filter for Kanban - Mobile */}
            {viewMode === 'kanban' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    const newDate = e.target.value ? new Date(e.target.value) : null;
                    setSelectedDate(newDate);
                  }}
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
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
            
            {/* View Mode Toggle - Mobile */}
            <div className="flex items-center justify-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="flex-1"
              >
                <Calendar className="h-4 w-4 mr-1" />
                <span className="text-xs">Calendário</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex-1"
              >
                <List className="h-4 w-4 mr-1" />
                <span className="text-xs">Lista</span>
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="flex-1"
              >
                <Kanban className="h-4 w-4 mr-1" />
                <span className="text-xs">Kanban</span>
              </Button>
            </div>
            
            {/* New Appointment Button - Mobile */}
            <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Agendamento
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
          
          {/* Desktop Layout - Horizontal */}
          <div className="hidden lg:flex lg:items-center lg:gap-4">
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
            
            <div className="flex items-center gap-2">
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
            </div>

            <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
              <DialogTrigger asChild>
                <Button>
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
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Cliente</FormLabel>
                        <div className="flex gap-2">
                          <FormControl className="flex-1">
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(value) => {
                                field.onChange(parseInt(value));
                                const selectedClient = clients.find(c => c.id === parseInt(value));
                                if (selectedClient) {
                                  form.setValue('clientName', selectedClient.name);
                                  form.setValue('clientPhone', selectedClient.phone || '');
                                  form.setValue('clientEmail', selectedClient.email || '');
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um cliente" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map((client) => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setIsNewClientOpen(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
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

                  <FormField
                    control={form.control}
                    name="statusId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um status" />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((status) => (
                                <SelectItem key={status.id} value={status.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: status.color }}
                                    />
                                    {status.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            <Select
                              value={field.value}
                              onValueChange={(value) => field.onChange(value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="--:--" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 28 }, (_, i) => {
                                  const hour = Math.floor(i / 2) + 8;
                                  const minute = (i % 2) * 30;
                                  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                                  return (
                                    <SelectItem key={timeString} value={timeString}>
                                      {timeString}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
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

          {/* Modal de Cadastro Rápido de Cliente */}
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
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do cliente" {...field} />
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
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="cliente@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsNewClientOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createClientMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {createClientMutation.isPending ? "Adicionando..." : "Adicionar Cliente"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Modal de Detalhes do Agendamento */}
          <Dialog open={isAppointmentDetailsOpen} onOpenChange={setIsAppointmentDetailsOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Detalhes do Agendamento</DialogTitle>
              </DialogHeader>
              {selectedAppointment && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: selectedAppointment.service.color }}
                    />
                    <div>
                      <h3 className="font-semibold text-lg">{selectedAppointment.clientName}</h3>
                      <p className="text-sm text-gray-600">{selectedAppointment.clientPhone}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Data</label>
                      <p className="text-sm">{format(new Date(selectedAppointment.appointmentDate), 'dd/MM/yyyy')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Horário</label>
                      <p className="text-sm">{selectedAppointment.appointmentTime}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Serviço</label>
                    <p className="text-sm">{selectedAppointment.service?.name || 'Serviço não encontrado'}</p>
                    <p className="text-xs text-gray-500">
                      {services.find(s => s.id === selectedAppointment.serviceId)?.duration || 'N/A'} minutos - R$ {services.find(s => s.id === selectedAppointment.serviceId)?.price || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Profissional</label>
                    <p className="text-sm">{selectedAppointment.professional?.name || 'Profissional não encontrado'}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ 
                          backgroundColor: statuses.find(s => s.name === selectedAppointment.status)?.color || '#6b7280' 
                        }}
                      />
                      <p className="text-sm">{selectedAppointment.status}</p>
                    </div>
                  </div>

                  {selectedAppointment.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Observações</label>
                      <p className="text-sm">{selectedAppointment.notes}</p>
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
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg sm:text-xl text-center sm:text-left">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Anterior</span>
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <span className="mr-1 hidden sm:inline">Próximo</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {/* Mobile Calendar View */}
            <div className="block sm:hidden">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                  <div key={index} className="p-1 text-center text-xs font-medium text-gray-500 bg-gray-50 rounded">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 42 }, (_, index) => {
                  const date = addDays(startDate, index);
                  const dayAppointments = appointments.filter((apt: Appointment) => {
                    const appointmentDateString = apt.appointmentDate.split('T')[0];
                    const appointmentDate = new Date(appointmentDateString + 'T12:00:00');
                    return isSameDay(appointmentDate, date) &&
                      (filterProfessional === 'all' || apt.professionalId.toString() === filterProfessional);
                  });

                  return (
                    <div
                      key={date.toString()}
                      className={`aspect-square p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 text-xs ${
                        !isSameMonth(date, monthStart) ? 'text-gray-400 bg-gray-50' : ''
                      } ${isSameDay(date, new Date()) ? 'bg-blue-50 border-blue-200' : ''} ${
                        selectedDate && isSameDay(date, selectedDate) ? 'bg-purple-100 border-purple-300' : ''
                      }`}
                      onClick={() => {
                        setSelectedDate(date);
                        form.setValue('appointmentDate', format(date, 'yyyy-MM-dd'));
                      }}
                    >
                      <div className="font-medium text-center mb-1">
                        {format(date, 'd')}
                      </div>
                      {dayAppointments.length > 0 && (
                        <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto"></div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Selected Day Appointments - Mobile Only */}
              {selectedDate && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2 text-gray-700">
                    Agendamentos para {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </h3>
                  <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg bg-gray-50 p-2">
                    {(() => {
                      const selectedDayAppointments = appointments.filter((apt: Appointment) => {
                        const appointmentDateString = apt.appointmentDate.split('T')[0];
                        const appointmentDate = new Date(appointmentDateString + 'T12:00:00');
                        return isSameDay(appointmentDate, selectedDate) &&
                          (filterProfessional === 'all' || apt.professionalId.toString() === filterProfessional);
                      });

                      if (selectedDayAppointments.length === 0) {
                        return (
                          <p className="text-gray-500 text-sm text-center py-4">
                            Nenhum agendamento para este dia
                          </p>
                        );
                      }

                      return selectedDayAppointments.map((appointment: Appointment) => (
                        <div
                          key={appointment.id}
                          className="bg-white border rounded-lg p-2 cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setIsAppointmentDetailsOpen(true);
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: appointment.service?.color || '#3b82f6' }}
                              />
                              <span className="font-medium text-sm truncate">{appointment.clientName}</span>
                            </div>
                            <span className="text-xs text-gray-500 ml-2">{appointment.appointmentTime}</span>
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {appointment.service?.name || 'Serviço não encontrado'}
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500 truncate">
                              {appointment.professional?.name || 'Profissional não encontrado'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {appointment.status === 'scheduled' && 'Agendado'}
                              {appointment.status === 'confirmed' && 'Confirmado'}
                              {appointment.status === 'cancelled' && 'Cancelado'}
                              {appointment.status === 'completed' && 'Concluído'}
                            </Badge>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Calendar View */}
            <div className="hidden sm:block">
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
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg sm:text-xl">Lista de Agendamentos</CardTitle>
              <div className="w-full sm:w-80">
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {filteredAppointments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchTerm ? 'Nenhum agendamento encontrado para a busca' : 'Nenhum agendamento encontrado'}
                </p>
              ) : (
                paginatedAppointments.map((appointment: Appointment) => (
                  <div
                    key={appointment.id}
                    className="border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="block sm:hidden p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: appointment.service.color || '#3b82f6' }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{appointment.clientName}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {appointment.service.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setIsAppointmentDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              console.log('✏️ Edit button clicked in Calendar for appointment:', appointment.id);
                              handleEditAppointment(appointment);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <div className="text-gray-600">
                          {format(new Date(appointment.appointmentDate), 'dd/MM')} às {appointment.appointmentTime}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {appointment.status === 'scheduled' && 'Agendado'}
                          {appointment.status === 'confirmed' && 'Confirmado'}
                          {appointment.status === 'cancelled' && 'Cancelado'}
                          {appointment.status === 'completed' && 'Concluído'}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {appointment.professional.name} • {appointment.clientPhone}
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex sm:items-center sm:justify-between sm:p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: appointment.service.color || '#3b82f6' }}
                        />
                        <div>
                          <div className="font-medium">{appointment.clientName}</div>
                          <div className="text-sm text-gray-500">
                            {appointment.service.name} • {appointment.professional.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">
                            {format(new Date(appointment.appointmentDate), 'dd/MM/yyyy')} às {appointment.appointmentTime}
                          </div>
                          <div className="text-sm text-gray-500">{appointment.clientPhone}</div>
                          <Badge variant="outline" className="mt-1">
                            {appointment.status === 'scheduled' && 'Agendado'}
                            {appointment.status === 'confirmed' && 'Confirmado'}
                            {appointment.status === 'cancelled' && 'Cancelado'}
                            {appointment.status === 'completed' && 'Concluído'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setIsAppointmentDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('✏️ Edit button clicked in List for appointment:', appointment.id);
                              handleEditAppointment(appointment);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Pagination Controls */}
            {filteredAppointments.length > itemsPerPage && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-700">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} agendamentos
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNumber)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Kanban View
        <div>
          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Mobile Kanban - Single Column Stack */}
            <div className="block sm:hidden space-y-4">
              {statuses.map((status) => {
                const statusAppointments = appointments.filter((apt: Appointment) => {
                  const appointmentDate = new Date(apt.appointmentDate);
                  const isDateMatch = selectedDate ? isSameDay(appointmentDate, selectedDate) : true;
                  
                  return apt.status === status.name &&
                    (filterProfessional === 'all' || apt.professionalId.toString() === filterProfessional) &&
                    isDateMatch;
                });
                
                return (
                  <Card key={status.id} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <CardTitle className="text-base">{status.name}</CardTitle>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {statusAppointments.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Droppable droppableId={status.name}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`space-y-2 min-h-[100px] max-h-[300px] overflow-y-auto ${
                              snapshot.isDraggingOver ? 'bg-blue-50 rounded' : ''
                            }`}
                          >
                            {statusAppointments.length === 0 ? (
                              <p className="text-gray-500 text-sm text-center py-4">
                                Nenhum agendamento
                              </p>
                            ) : (
                              statusAppointments.map((appointment: Appointment, index: number) => (
                                <Draggable 
                                  key={appointment.id} 
                                  draggableId={appointment.id.toString()} 
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`group p-2 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                                        snapshot.isDragging ? 'shadow-lg transform rotate-1' : ''
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-1">
                                        <h4 className="font-medium text-sm truncate flex-1">{appointment.clientName}</h4>
                                        <div className="flex items-center gap-1 ml-2">
                                          <span className="text-xs text-gray-500">
                                            {appointment.appointmentTime}
                                          </span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedAppointment(appointment);
                                              setIsAppointmentDetailsOpen(true);
                                            }}
                                          >
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: appointment.service?.color || '#3b82f6' }}
                                        />
                                        <span className="text-xs text-gray-600 truncate">{appointment.service?.name || 'Serviço não encontrado'}</span>
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {appointment.professional?.name || 'Profissional não encontrado'}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {format(new Date(appointment.appointmentDate), 'dd/MM')}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop Kanban - Multi-Column Grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statuses.map((status) => {
                const statusAppointments = appointments.filter((apt: Appointment) => {
                  const appointmentDate = new Date(apt.appointmentDate);
                  const isDateMatch = selectedDate ? isSameDay(appointmentDate, selectedDate) : true;
                  
                  return apt.status === status.name &&
                    (filterProfessional === 'all' || apt.professionalId.toString() === filterProfessional) &&
                    isDateMatch;
                });
                
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
                    <CardContent className="flex-1 pt-0 overflow-hidden">
                      <Droppable droppableId={status.name}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`kanban-column space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto pr-2 ${
                              snapshot.isDraggingOver ? 'bg-blue-50' : ''
                            }`}
                          >
                            {statusAppointments.length === 0 ? (
                              <p className="text-gray-500 text-sm text-center py-4">
                                Nenhum agendamento
                              </p>
                            ) : (
                              statusAppointments.map((appointment: Appointment, index: number) => (
                                <Draggable 
                                  key={appointment.id} 
                                  draggableId={appointment.id.toString()} 
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`group p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                                        snapshot.isDragging ? 'shadow-lg transform rotate-2' : ''
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-medium text-sm">{appointment.clientName}</h4>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-gray-500">
                                            {appointment.appointmentTime}
                                          </span>
                                          {appointment.status.toLowerCase() === 'concluído' && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                sendReviewInvitationMutation.mutate(appointment.id);
                                              }}
                                              disabled={sendReviewInvitationMutation.isPending}
                                              title="Enviar convite de avaliação"
                                            >
                                              <Star className="h-3 w-3 text-yellow-500" />
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-100 transition-opacity z-50 relative bg-red-500"
                                            onClick={(e) => {
                                              console.log('✏️ Edit button clicked in Kanban for appointment:', appointment.id);
                                              e.stopPropagation();
                                              handleEditAppointment(appointment);
                                            }}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div 
                                        className="cursor-pointer"
                                        onClick={() => {
                                          setSelectedAppointment(appointment);
                                          setIsAppointmentDetailsOpen(true);
                                        }}
                                      >
                                        <div className="flex items-center gap-2 mb-2">
                                          <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: appointment.service?.color || '#3b82f6' }}
                                          />
                                          <span className="text-xs text-gray-600">{appointment.service?.name || 'Serviço não encontrado'}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mb-1">
                                          {services.find(s => s.id === appointment.serviceId)?.duration} minutos - R$ {services.find(s => s.id === appointment.serviceId)?.price}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {appointment.professional?.name || 'Profissional não encontrado'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {format(new Date(appointment.appointmentDate), 'dd/MM/yyyy')}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))
                            )}
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
        </div>
      )}

      {/* Edit Appointment Modal */}
      <Dialog open={isEditAppointmentOpen} onOpenChange={setIsEditAppointmentOpen}>
        <DialogContent className="max-w-md">
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
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: service.color }}
                                />
                                {service.name}
                              </div>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
                  name="appointmentTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Horário" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 28 }, (_, i) => {
                              const hour = Math.floor(i / 2) + 8;
                              const minute = i % 2 === 0 ? '00' : '30';
                              const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                              return (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
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

              <FormField
                control={editForm.control}
                name="statusId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status.id} value={status.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: status.color }}
                                />
                                {status.name}
                              </div>
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Observações adicionais..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditAppointmentOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateAppointmentMutation.isPending}
                  className="flex-1"
                >
                  {updateAppointmentMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Container de Notificações */}
      <NotificationContainer />
    </div>
  );
}