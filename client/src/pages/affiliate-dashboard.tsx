import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  LogOut, 
  User,
  Calendar,
  Link as LinkIcon,
  BarChart3
} from "lucide-react";

interface Affiliate {
  id: number;
  name: string;
  email: string;
  phone: string;
  affiliateCode: string;
  commissionRate: string;
  totalEarnings: string;
  isActive: number;
  createdAt: string;
}

interface Referral {
  id: number;
  companyId: number;
  planId: number;
  status: string;
  commissionPaid: string;
  monthlyCommission: string;
  referralDate: string;
  activationDate: string | null;
  lastPaymentDate: string | null;
  companyName: string;
  planName: string;
  planPrice: string;
}

interface Commission {
  id: number;
  affiliateId: number;
  referralId: number;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  paymentStatus: string;
  description: string;
  createdAt: string;
}

export default function AffiliateDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch affiliate profile
  const { data: affiliate, isLoading: profileLoading } = useQuery<Affiliate>({
    queryKey: ['/api/affiliate/profile'],
  });

  // Fetch referrals
  const { data: referrals = [], isLoading: referralsLoading } = useQuery<Referral[]>({
    queryKey: ['/api/affiliate/referrals'],
  });

  // Fetch commissions
  const { data: commissions = [], isLoading: commissionsLoading } = useQuery<Commission[]>({
    queryKey: ['/api/affiliate/commissions'],
  });

  // Check authentication
  useEffect(() => {
    if (!profileLoading && !affiliate) {
      setLocation('/affiliate/login');
    }
  }, [affiliate, profileLoading, setLocation]);

  const handleLogout = async () => {
    try {
      await fetch('/api/affiliate/logout', { method: 'POST' });
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      setLocation('/affiliate/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const copyAffiliateLink = (planId?: number) => {
    const baseUrl = window.location.origin;
    const affiliateLink = planId 
      ? `${baseUrl}/cadastro?ref=${affiliate?.affiliateCode}&plan=${planId}`
      : `${baseUrl}/cadastro?ref=${affiliate?.affiliateCode}`;
    
    navigator.clipboard.writeText(affiliateLink);
    toast({
      title: "Link copiado!",
      description: "Link de afiliado copiado para a área de transferência.",
    });
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!affiliate) {
    return null;
  }

  // Calculate stats
  const activeReferrals = referrals.filter(r => r.status === 'active').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const totalMonthlyCommission = referrals
    .filter(r => r.status === 'active')
    .reduce((sum, r) => sum + parseFloat(r.monthlyCommission), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b" style={{ backgroundColor: '#5e6d8d' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Dashboard Afiliado</h1>
                <p className="text-white/80 text-sm">Bem-vindo, {affiliate.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-white/20 text-white">
                Código: {affiliate.affiliateCode}
              </Badge>
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="text-white hover:bg-white/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Referências Ativas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeReferrals}</div>
              <p className="text-xs text-muted-foreground">
                {pendingReferrals} pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganhos Totais</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {parseFloat(affiliate.totalEarnings).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Total acumulado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissão Mensal</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totalMonthlyCommission.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Por mês ativo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Comissão</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{affiliate.commissionRate}%</div>
              <p className="text-xs text-muted-foreground">
                Sobre vendas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="referrals" className="space-y-6">
          <TabsList>
            <TabsTrigger value="referrals">Referências</TabsTrigger>
            <TabsTrigger value="commissions">Comissões</TabsTrigger>
            <TabsTrigger value="links">Links de Afiliado</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle>Suas Referências</CardTitle>
                <CardDescription>
                  Empresas que se cadastraram através dos seus links
                </CardDescription>
              </CardHeader>
              <CardContent>
                {referralsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando referências...</p>
                  </div>
                ) : referrals.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Nenhuma referência encontrada</p>
                    <p className="text-sm text-muted-foreground">
                      Compartilhe seus links de afiliado para começar a ganhar comissões
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {referrals.map((referral) => (
                      <div key={referral.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{referral.companyName}</h4>
                            <p className="text-sm text-muted-foreground">Plano: {referral.planName}</p>
                          </div>
                          <Badge className={getStatusColor(referral.status)}>
                            {getStatusText(referral.status)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Comissão Mensal</p>
                            <p className="font-medium">R$ {parseFloat(referral.monthlyCommission).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Comissão Paga</p>
                            <p className="font-medium">R$ {parseFloat(referral.commissionPaid).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Data de Referência</p>
                            <p className="font-medium">
                              {new Date(referral.referralDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Ativação</p>
                            <p className="font-medium">
                              {referral.activationDate 
                                ? new Date(referral.activationDate).toLocaleDateString('pt-BR')
                                : 'Pendente'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Comissões</CardTitle>
                <CardDescription>
                  Pagamentos de comissões recebidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {commissionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando comissões...</p>
                  </div>
                ) : commissions.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Nenhuma comissão encontrada</p>
                    <p className="text-sm text-muted-foreground">
                      As comissões aparecerão aqui quando suas referências forem ativadas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commissions.map((commission) => (
                      <div key={commission.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">R$ {parseFloat(commission.amount).toFixed(2)}</h4>
                            <p className="text-sm text-muted-foreground">{commission.description}</p>
                          </div>
                          <Badge variant="outline">
                            {commission.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Data de Pagamento</p>
                            <p className="font-medium">
                              {new Date(commission.paymentDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Método</p>
                            <p className="font-medium">{commission.paymentMethod}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <p className="font-medium">
                              {commission.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle>Links de Afiliado</CardTitle>
                <CardDescription>
                  Gere e compartilhe seus links personalizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Link Geral</h4>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyAffiliateLink()}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Link para página de cadastro geral
                    </p>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded block">
                      {window.location.origin}/registro?ref={affiliate.affiliateCode}
                    </code>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Instruções</h4>
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>• Compartilhe seus links em redes sociais, email ou sites</p>
                      <p>• Quando alguém se cadastrar através do seu link, você ganha comissão</p>
                      <p>• A comissão é calculada sobre o valor mensal do plano escolhido</p>
                      <p>• Você recebe {affiliate.commissionRate}% de comissão recorrente</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Perfil do Afiliado</CardTitle>
                <CardDescription>
                  Informações da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <p className="text-lg">{affiliate.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-lg">{affiliate.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                      <p className="text-lg">{affiliate.phone || 'Não informado'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Código de Afiliado</label>
                      <p className="text-lg font-mono">{affiliate.affiliateCode}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Taxa de Comissão</label>
                      <p className="text-lg">{affiliate.commissionRate}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Membro desde</label>
                      <p className="text-lg">
                        {new Date(affiliate.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}