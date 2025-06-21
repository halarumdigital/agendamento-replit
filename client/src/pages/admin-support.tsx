import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Ticket, FileText, Plus, Edit2, Trash2, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupportTicket {
  id: number;
  companyId: number;
  typeId?: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  company: {
    id: number;
    fantasyName: string;
    email: string;
  };
}

interface SupportTicketType {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SupportTicketStatus {
  id: number;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSupport() {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketTypeForm, setTicketTypeForm] = useState<Partial<SupportTicketType>>({});
  const [editingType, setEditingType] = useState<SupportTicketType | null>(null);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  
  // Status-related states
  const [ticketStatusForm, setTicketStatusForm] = useState<Partial<SupportTicketStatus>>({});
  const [editingStatus, setEditingStatus] = useState<SupportTicketStatus | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  // Fetch support tickets
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['/api/admin/support-tickets'],
  });

  // Fetch support ticket types
  const { data: ticketTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['/api/admin/support-ticket-types'],
  });

  // Fetch support ticket statuses
  const { data: ticketStatuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ['/api/admin/support-ticket-statuses'],
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`/api/admin/support-tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-tickets'] });
      toast({
        title: "Sucesso",
        description: "Ticket atualizado com sucesso!",
      });
      setSelectedTicket(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar ticket",
        variant: "destructive",
      });
    },
  });

  // Create ticket type mutation
  const createTypeMutation = useMutation({
    mutationFn: (data: any) =>
      fetch('/api/admin/support-ticket-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-ticket-types'] });
      toast({
        title: "Sucesso",
        description: "Tipo de ticket criado com sucesso!",
      });
      setTicketTypeForm({});
      setIsTypeDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar tipo de ticket",
        variant: "destructive",
      });
    },
  });

  // Update ticket type mutation
  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`/api/admin/support-ticket-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-ticket-types'] });
      toast({
        title: "Sucesso",
        description: "Tipo de ticket atualizado com sucesso!",
      });
      setEditingType(null);
      setTicketTypeForm({});
      setIsTypeDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar tipo de ticket",
        variant: "destructive",
      });
    },
  });

  // Delete ticket type mutation
  const deleteTypeMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/admin/support-ticket-types/${id}`, {
        method: 'DELETE',
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-ticket-types'] });
      toast({
        title: "Sucesso",
        description: "Tipo de ticket excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir tipo de ticket",
        variant: "destructive",
      });
    },
  });

  // Create ticket status mutation
  const createStatusMutation = useMutation({
    mutationFn: (data: any) =>
      fetch('/api/admin/support-ticket-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-ticket-statuses'] });
      toast({
        title: "Sucesso",
        description: "Status de ticket criado com sucesso!",
      });
      setTicketStatusForm({});
      setIsStatusDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar status de ticket",
        variant: "destructive",
      });
    },
  });

  // Update ticket status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`/api/admin/support-ticket-statuses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-ticket-statuses'] });
      toast({
        title: "Sucesso",
        description: "Status de ticket atualizado com sucesso!",
      });
      setTicketStatusForm({});
      setEditingStatus(null);
      setIsStatusDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status de ticket",
        variant: "destructive",
      });
    },
  });

  // Delete ticket status mutation
  const deleteStatusMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/admin/support-ticket-statuses/${id}`, {
        method: 'DELETE',
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-ticket-statuses'] });
      toast({
        title: "Sucesso",
        description: "Status de ticket excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir status de ticket",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusColors = {
      open: "bg-blue-500",
      in_progress: "bg-yellow-500",
      resolved: "bg-green-500",
      closed: "bg-gray-500",
    };
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-500"}>
        {status === 'open' ? 'Aberto' : 
         status === 'in_progress' ? 'Em Progresso' :
         status === 'resolved' ? 'Resolvido' : 'Fechado'}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      low: "bg-green-500",
      medium: "bg-yellow-500",
      high: "bg-orange-500",
      urgent: "bg-red-500",
    };
    return (
      <Badge className={priorityColors[priority as keyof typeof priorityColors] || "bg-gray-500"}>
        {priority === 'low' ? 'Baixa' :
         priority === 'medium' ? 'Média' :
         priority === 'high' ? 'Alta' : 'Urgente'}
      </Badge>
    );
  };

  const handleUpdateTicket = (status: string, adminResponse?: string) => {
    if (!selectedTicket) return;
    
    updateTicketMutation.mutate({
      id: selectedTicket.id,
      data: { status, adminResponse }
    });
  };

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingType) {
      updateTypeMutation.mutate({
        id: editingType.id,
        data: ticketTypeForm
      });
    } else {
      createTypeMutation.mutate(ticketTypeForm);
    }
  };

  const openTypeDialog = (type?: SupportTicketType) => {
    if (type) {
      setEditingType(type);
      setTicketTypeForm(type);
    } else {
      setEditingType(null);
      setTicketTypeForm({ isActive: true });
    }
    setIsTypeDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Suporte</h1>
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Tickets de Atendimento
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tipos de Tickets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div>Carregando tickets...</div>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket: SupportTicket) => (
                    <div key={ticket.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{ticket.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            Empresa: {ticket.company.fantasyName} - {ticket.company.email}
                          </p>
                          <p className="text-gray-700 mb-2">{ticket.description}</p>
                          <div className="flex gap-2 mb-2">
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                            <Badge variant="outline">{ticket.category}</Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            Criado em: {format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        <Button
                          onClick={() => setSelectedTicket(ticket)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Gerenciar
                        </Button>
                      </div>
                    </div>
                  ))}
                  {tickets.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      Nenhum ticket encontrado
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tipos de Tickets</CardTitle>
              <Button onClick={() => openTypeDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo
              </Button>
            </CardHeader>
            <CardContent>
              {typesLoading ? (
                <div>Carregando tipos...</div>
              ) : (
                <div className="space-y-4">
                  {ticketTypes.map((type: SupportTicketType) => (
                    <div key={type.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{type.name}</h3>
                            <Badge variant={type.isActive ? "default" : "secondary"}>
                              {type.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          {type.description && (
                            <p className="text-gray-600 mb-2">{type.description}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Criado em: {format(new Date(type.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => openTypeDialog(type)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este tipo de ticket? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTypeMutation.mutate(type.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                  {ticketTypes.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      Nenhum tipo de ticket cadastrado
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ticket Management Dialog */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gerenciar Ticket - {selectedTicket.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Empresa</Label>
                <p className="text-sm">{selectedTicket.company.fantasyName} - {selectedTicket.company.email}</p>
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-sm border rounded p-2 bg-gray-50">{selectedTicket.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status Atual</Label>
                  <div className="mt-1">{getStatusBadge(selectedTicket.status)}</div>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <div className="mt-1">{getPriorityBadge(selectedTicket.priority)}</div>
                </div>
              </div>
              {selectedTicket.adminResponse && (
                <div>
                  <Label>Resposta do Admin</Label>
                  <p className="text-sm border rounded p-2 bg-blue-50">{selectedTicket.adminResponse}</p>
                </div>
              )}
              <div>
                <Label htmlFor="adminResponse">Nova Resposta</Label>
                <Textarea
                  id="adminResponse"
                  placeholder="Digite sua resposta..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Alterar Status</Label>
                <Select onValueChange={(value) => {
                  const textarea = document.getElementById('adminResponse') as HTMLTextAreaElement;
                  handleUpdateTicket(value, textarea?.value);
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o novo status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Ticket Type Form Dialog */}
      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Editar Tipo de Ticket' : 'Novo Tipo de Ticket'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTypeSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={ticketTypeForm.name || ''}
                onChange={(e) => setTicketTypeForm(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder="Nome do tipo de ticket"
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={ticketTypeForm.description || ''}
                onChange={(e) => setTicketTypeForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do tipo de ticket"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={ticketTypeForm.isActive || false}
                onCheckedChange={(checked) => setTicketTypeForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Ativo</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsTypeDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createTypeMutation.isPending || updateTypeMutation.isPending}
              >
                {editingType ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}