import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Grid, List, User, Mail, Phone, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface AppointmentHistory {
  id: number;
  serviceName: string;
  professionalName: string;
  appointmentDate: string;
  appointmentTime: string;
  price: number;
  statusName: string;
  statusColor: string;
  notes?: string;
}

interface ClientServiceHistoryProps {
  clientId: number;
  clientName: string;
}

function ClientServiceHistory({ clientId, clientName }: ClientServiceHistoryProps) {
  const { data: appointments = [], isLoading } = useQuery<AppointmentHistory[]>({
    queryKey: ['/api/company/appointments/client', clientId],
  });

  // Debug log to see what data we're getting
  console.log('Client appointments data:', appointments);

  const completedAppointments = appointments.filter(apt => 
    apt.statusName === 'Concluído' || apt.statusName === 'Finalizado'
  );

  const totalSpent = completedAppointments
    .reduce((total, apt) => total + (apt.price || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Carregando histórico...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                R$ {totalSpent.toFixed(2).replace('.', ',')}
              </div>
              <div className="text-sm text-gray-500">Total Gasto</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {completedAppointments.length}
              </div>
              <div className="text-sm text-gray-500">Serviços Concluídos</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service History List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="mx-auto h-12 w-12 mb-3 text-gray-300" />
            <p>Nenhum serviço encontrado para {clientName}</p>
          </div>
        ) : (
          appointments.map((appointment) => (
            <Card key={appointment.id} className="border-l-4" style={{ borderLeftColor: appointment.statusColor }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{appointment.serviceName}</h4>
                      <Badge 
                        style={{ 
                          backgroundColor: appointment.statusColor + '20',
                          color: appointment.statusColor,
                          border: `1px solid ${appointment.statusColor}40`
                        }}
                      >
                        {appointment.statusName}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{appointment.professionalName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(appointment.appointmentDate), 'dd/MM/yyyy')} às {appointment.appointmentTime}
                        </span>
                      </div>
                      {appointment.notes && (
                        <div className="text-xs text-gray-500 mt-2 italic">
                          {appointment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      R$ {appointment.price.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default function CompanyClients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['/api/company/clients'],
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      birthDate: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const response = await fetch('/api/company/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Erro ao criar cliente');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/clients'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Cliente criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const response = await fetch(`/api/company/clients/${editingClient?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Erro ao atualizar cliente');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/clients'] });
      setIsDialogOpen(false);
      setEditingClient(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Cliente atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/company/clients/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Erro ao excluir cliente');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/clients'] });
      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    
    // Format birth date for HTML date input (YYYY-MM-DD)
    // Extract date components directly from ISO string to avoid timezone issues
    let formattedBirthDate = "";
    if (client.birthDate) {
      const dateString = client.birthDate.toString();
      
      if (dateString.includes('T')) {
        // Extract YYYY-MM-DD part from ISO string (before the 'T')
        formattedBirthDate = dateString.split('T')[0];
      } else if (dateString.includes('-') && dateString.length === 10) {
        // Already in YYYY-MM-DD format
        formattedBirthDate = dateString;
      } else {
        // Fallback to date conversion
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          formattedBirthDate = `${year}-${month}-${day}`;
        }
      }
    }
    
    form.reset({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      birthDate: formattedBirthDate,
      notes: client.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: ClientFormData) => {
    if (editingClient) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    
    // For birthday dates, extract the date components from the ISO string directly
    // to avoid timezone conversion issues
    if (typeof dateString === 'string' && dateString.includes('T')) {
      // Extract YYYY-MM-DD part from ISO string (before the 'T')
      const datePart = dateString.split('T')[0];
      const parts = datePart.split('-');
      
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        
        return `${day}/${month}/${year}`;
      }
    }
    
    // Fallback for other date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };

  if (isLoading) {
    return <div className="p-6">Carregando clientes...</div>;
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-purple-600 text-white' : ''}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-purple-600 text-white' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={() => {
              setEditingClient(null);
              form.reset();
              setIsDialogOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados do Cliente</TabsTrigger>
                <TabsTrigger value="servicos">Histórico de Serviços</TabsTrigger>
              </TabsList>
              
              <TabsContent value="dados" className="space-y-4">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Nome *
                      </Label>
                      <div className="col-span-3">
                        <Input
                          id="name"
                          placeholder="Nome completo do cliente"
                          {...form.register('name')}
                        />
                        {form.formState.errors.name && (
                          <p className="text-sm text-red-500 mt-1">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email
                      </Label>
                      <div className="col-span-3">
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@exemplo.com"
                          {...form.register('email')}
                        />
                        {form.formState.errors.email && (
                          <p className="text-sm text-red-500 mt-1">
                            {form.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone" className="text-right">
                        Telefone
                      </Label>
                      <div className="col-span-3 flex">
                        <div className="flex items-center px-3 py-2 bg-gray-50 border border-r-0 rounded-l-md text-sm text-gray-600">
                          55
                        </div>
                        <Input
                          id="phone"
                          className="rounded-l-none"
                          placeholder="(11) 99999-9999"
                          {...form.register('phone')}
                          onChange={(e) => {
                            // Format phone number automatically
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 11) {
                              if (value.length >= 7) {
                                value = value.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
                              } else if (value.length >= 3) {
                                value = value.replace(/(\d{2})(\d+)/, '($1) $2');
                              }
                            }
                            e.target.value = value;
                            form.setValue('phone', value);
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="birthDate" className="text-right">
                        Aniversário
                      </Label>
                      <Input
                        id="birthDate"
                        type="date"
                        className="col-span-3"
                        {...form.register('birthDate')}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {editingClient ? 'Atualizar' : 'Cadastrar'}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>
              
              <TabsContent value="servicos" className="space-y-4">
                {editingClient ? (
                  <ClientServiceHistory clientId={editingClient.id} clientName={editingClient.name} />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Salve o cliente primeiro para ver o histórico de serviços</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Card key={client.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(client)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(client.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  {client.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.birthDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Aniversário: {formatDate(client.birthDate)}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-3">
                    Cadastrado em {formatDate(client.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {client.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        <span>Cadastrado em {formatDate(client.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(client)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(client.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {clients.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum cliente</h3>
          <p className="mt-1 text-sm text-gray-500">Comece criando seu primeiro cliente.</p>
          <div className="mt-6">
            <Button 
              onClick={() => {
                setEditingClient(null);
                form.reset();
                setIsDialogOpen(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}