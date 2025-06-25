import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, Plus, Edit, Trash2, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const alertSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  type: z.enum(["info", "warning", "success", "error"]),
  showToAllCompanies: z.boolean(),
  targetCompanyIds: z.array(z.number()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type AlertFormData = z.infer<typeof alertSchema>;

const alertTypeConfig = {
  info: { icon: Info, color: "bg-blue-500", label: "Informação" },
  warning: { icon: AlertTriangle, color: "bg-yellow-500", label: "Aviso" },
  success: { icon: CheckCircle, color: "bg-green-500", label: "Sucesso" },
  error: { icon: XCircle, color: "bg-red-500", label: "Erro" },
};

export default function AdminAlerts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      title: "",
      message: "",
      type: "info",
      showToAllCompanies: true,
      targetCompanyIds: [],
      startDate: "",
      endDate: "",
    },
  });

  // Buscar alertas
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["/api/admin/alerts"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/admin/alerts");
    },
  });

  // Buscar empresas para seleção
  const { data: companies } = useQuery({
    queryKey: ["/api/admin/companies"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/admin/companies");
    },
  });

  // Criar alerta
  const createMutation = useMutation({
    mutationFn: async (data: AlertFormData) => {
      return await apiRequest("POST", "/api/admin/alerts", data);
    },
    onSuccess: () => {
      toast({ title: "Alerta criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar alerta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar alerta
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AlertFormData }) => {
      return await apiRequest(`/api/admin/alerts/${id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({ title: "Alerta atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] });
      setIsDialogOpen(false);
      setEditingAlert(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar alerta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deletar alerta
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/alerts/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Alerta removido com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover alerta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AlertFormData) => {
    if (editingAlert) {
      updateMutation.mutate({ id: editingAlert.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (alert: any) => {
    setEditingAlert(alert);
    form.reset({
      title: alert.title,
      message: alert.message,
      type: alert.type,
      showToAllCompanies: alert.show_to_all_companies,
      targetCompanyIds: alert.target_company_ids || [],
      startDate: alert.start_date ? new Date(alert.start_date).toISOString().split('T')[0] : "",
      endDate: alert.end_date ? new Date(alert.end_date).toISOString().split('T')[0] : "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este alerta?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewAlert = () => {
    setEditingAlert(null);
    form.reset({
      title: "",
      message: "",
      type: "info",
      showToAllCompanies: true,
      targetCompanyIds: [],
      startDate: "",
      endDate: "",
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="w-8 h-8" />
            Alertas e Avisos
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie alertas e avisos que serão exibidos para as empresas após o login.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewAlert} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Alerta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAlert ? "Editar Alerta" : "Novo Alerta"}
              </DialogTitle>
              <DialogDescription>
                {editingAlert 
                  ? "Edite as informações do alerta."
                  : "Crie um novo alerta para ser exibido às empresas."
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o título do alerta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Digite a mensagem do alerta"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo do Alerta</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(alertTypeConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <config.icon className="w-4 h-4" />
                                {config.label}
                              </div>
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
                  name="showToAllCompanies"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Exibir para todas as empresas
                        </FormLabel>
                        <div className="text-sm text-gray-500">
                          Se desabilitado, você pode selecionar empresas específicas
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início (opcional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Término (opcional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingAlert ? "Atualizar" : "Criar"} Alerta
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {alerts && alerts.length > 0 ? (
          alerts.map((alert: any) => {
            const config = alertTypeConfig[alert.type as keyof typeof alertTypeConfig];
            const Icon = config.icon;
            
            return (
              <Card key={alert.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${config.color} text-white`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={alert.is_active ? "default" : "secondary"}>
                            {alert.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline">
                            {config.label}
                          </Badge>
                          {alert.show_to_all_companies ? (
                            <Badge variant="outline">Todas as empresas</Badge>
                          ) : (
                            <Badge variant="outline">Empresas específicas</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(alert)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(alert.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{alert.message}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      Criado em: {format(new Date(alert.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    {alert.start_date && (
                      <span>
                        Início: {format(new Date(alert.start_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    )}
                    {alert.end_date && (
                      <span>
                        Término: {format(new Date(alert.end_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum alerta criado
              </h3>
              <p className="text-gray-500 mb-4">
                Crie seu primeiro alerta para começar a comunicar-se com as empresas.
              </p>
              <Button onClick={handleNewAlert}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Alerta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}