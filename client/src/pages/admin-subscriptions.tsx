import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  Calendar,
  User,
  Building,
  Eye,
  Ban,
  Play
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubscriptionData {
  companyId: number;
  companyName: string;
  companyEmail: string;
  companyStatus: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeStatus?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  priceId?: string;
  amount?: number;
  currency?: string;
  interval?: string;
  latestInvoice?: {
    id: string;
    status: string;
    total: number;
    paid: boolean;
    paymentIntent?: {
      status: string;
    };
  };
  stripeError?: string;
  error?: string;
  createdAt: Date;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'past_due':
      return 'destructive';
    case 'canceled':
    case 'cancelled':
      return 'secondary';
    case 'incomplete':
    case 'incomplete_expired':
      return 'destructive';
    case 'trialing':
      return 'outline';
    case 'unpaid':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return 'Ativa';
    case 'past_due':
      return 'Em Atraso';
    case 'canceled':
    case 'cancelled':
      return 'Cancelada';
    case 'incomplete':
      return 'Incompleta';
    case 'incomplete_expired':
      return 'Expirada';
    case 'trialing':
      return 'Teste';
    case 'unpaid':
      return 'Não Paga';
    default:
      return status;
  }
};

const formatCurrency = (amount: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

export default function AdminSubscriptions() {
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptions, isLoading, error, refetch } = useQuery<SubscriptionData[]>({
    queryKey: ["/api/admin/stripe/subscriptions"],
    refetchInterval: 30000, // Auto-refresh a cada 30 segundos
  });

  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await apiRequest("POST", `/api/admin/stripe/subscriptions/${subscriptionId}/cancel`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assinatura Cancelada",
        description: "A assinatura será cancelada no final do período de cobrança.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stripe/subscriptions"] });
      setIsCancelDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao cancelar assinatura",
        variant: "destructive",
      });
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await apiRequest("POST", `/api/admin/stripe/subscriptions/${subscriptionId}/reactivate`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assinatura Reativada",
        description: "A assinatura foi reativada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stripe/subscriptions"] });
      setIsReactivateDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao reativar assinatura",
        variant: "destructive",
      });
    }
  });

  // Auto-refresh automático
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handleViewDetails = (subscription: SubscriptionData) => {
    setSelectedSubscription(subscription);
    setIsDetailsOpen(true);
  };

  const handleCancelSubscription = (subscription: SubscriptionData) => {
    setSelectedSubscription(subscription);
    setIsCancelDialogOpen(true);
  };

  const handleReactivateSubscription = (subscription: SubscriptionData) => {
    setSelectedSubscription(subscription);
    setIsReactivateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Carregando assinaturas...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar assinaturas. Verifique se as chaves do Stripe estão configuradas corretamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeSubscriptions = subscriptions?.filter(sub => sub.stripeStatus === 'active') || [];
  const pastDueSubscriptions = subscriptions?.filter(sub => sub.stripeStatus === 'past_due') || [];
  const canceledSubscriptions = subscriptions?.filter(sub => sub.stripeStatus === 'canceled') || [];
  const totalRevenue = subscriptions?.reduce((total, sub) => {
    if (sub.stripeStatus === 'active' && sub.amount) {
      return total + sub.amount;
    }
    return total;
  }, 0) || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gerenciar Assinaturas Stripe
          </h1>
          <p className="text-gray-600 mt-2">
            Status em tempo real de todas as assinaturas do sistema
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Assinaturas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeSubscriptions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{pastDueSubscriptions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue, 'brl')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Assinaturas */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Assinaturas</CardTitle>
          <CardDescription>
            Lista completa de empresas com assinaturas no Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Próximo Pagamento</TableHead>
                  <TableHead>Status da Empresa</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions?.map((subscription) => (
                  <TableRow key={subscription.companyId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        {subscription.companyName}
                      </div>
                    </TableCell>
                    <TableCell>{subscription.companyEmail}</TableCell>
                    <TableCell>
                      {subscription.stripeStatus ? (
                        <Badge variant={getStatusColor(subscription.stripeStatus)}>
                          {getStatusText(subscription.stripeStatus)}
                        </Badge>
                      ) : subscription.stripeError ? (
                        <Badge variant="destructive">Erro</Badge>
                      ) : (
                        <Badge variant="outline">Sem Assinatura</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {subscription.amount ? 
                        formatCurrency(subscription.amount, subscription.currency) : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>
                      {subscription.currentPeriodEnd ? 
                        format(new Date(subscription.currentPeriodEnd), 'dd/MM/yyyy', { locale: ptBR }) : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={subscription.companyStatus === 'active' ? 'default' : 'destructive'}>
                        {subscription.companyStatus === 'active' ? 'Ativa' : 'Suspensa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(subscription)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        {subscription.stripeSubscriptionId && subscription.stripeStatus === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelSubscription(subscription)}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                        )}
                        {subscription.stripeSubscriptionId && subscription.cancelAtPeriodEnd && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivateSubscription(subscription)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Reativar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Assinatura</DialogTitle>
            <DialogDescription>
              Informações completas da assinatura no Stripe
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informações da Empresa</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nome:</strong> {selectedSubscription.companyName}</p>
                    <p><strong>Email:</strong> {selectedSubscription.companyEmail}</p>
                    <p><strong>Status:</strong> {selectedSubscription.companyStatus}</p>
                    <p><strong>Criada em:</strong> {format(new Date(selectedSubscription.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Informações do Stripe</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Customer ID:</strong> {selectedSubscription.stripeCustomerId || 'N/A'}</p>
                    <p><strong>Subscription ID:</strong> {selectedSubscription.stripeSubscriptionId || 'N/A'}</p>
                    <p><strong>Status:</strong> {selectedSubscription.stripeStatus ? getStatusText(selectedSubscription.stripeStatus) : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {selectedSubscription.stripeStatus && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Cobrança</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Valor:</strong> {selectedSubscription.amount ? formatCurrency(selectedSubscription.amount, selectedSubscription.currency) : 'N/A'}</p>
                        <p><strong>Intervalo:</strong> {selectedSubscription.interval === 'month' ? 'Mensal' : selectedSubscription.interval === 'year' ? 'Anual' : selectedSubscription.interval || 'N/A'}</p>
                        <p><strong>Price ID:</strong> {selectedSubscription.priceId || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Período</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Início:</strong> {selectedSubscription.currentPeriodStart ? format(new Date(selectedSubscription.currentPeriodStart), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</p>
                        <p><strong>Fim:</strong> {selectedSubscription.currentPeriodEnd ? format(new Date(selectedSubscription.currentPeriodEnd), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</p>
                        <p><strong>Cancelar no fim:</strong> {selectedSubscription.cancelAtPeriodEnd ? 'Sim' : 'Não'}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedSubscription.latestInvoice && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Última Fatura</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>ID:</strong> {selectedSubscription.latestInvoice.id}</p>
                      <p><strong>Status:</strong> {selectedSubscription.latestInvoice.status}</p>
                      <p><strong>Total:</strong> {formatCurrency(selectedSubscription.latestInvoice.total, selectedSubscription.currency)}</p>
                      <p><strong>Pago:</strong> {selectedSubscription.latestInvoice.paid ? 'Sim' : 'Não'}</p>
                      {selectedSubscription.latestInvoice.paymentIntent && (
                        <p><strong>Status do Pagamento:</strong> {selectedSubscription.latestInvoice.paymentIntent.status}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {selectedSubscription.stripeError && (
                <>
                  <Separator />
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {selectedSubscription.stripeError}
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Assinatura</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar a assinatura de {selectedSubscription?.companyName}?
              A assinatura será cancelada no final do período de cobrança atual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedSubscription?.stripeSubscriptionId && cancelMutation.mutate(selectedSubscription.stripeSubscriptionId)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Reativação */}
      <Dialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reativar Assinatura</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja reativar a assinatura de {selectedSubscription?.companyName}?
              O cancelamento agendado será removido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReactivateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => selectedSubscription?.stripeSubscriptionId && reactivateMutation.mutate(selectedSubscription.stripeSubscriptionId)}
              disabled={reactivateMutation.isPending}
            >
              {reactivateMutation.isPending ? 'Reativando...' : 'Confirmar Reativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}