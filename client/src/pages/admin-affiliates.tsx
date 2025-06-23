import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCheck, UserX, Phone, Mail, Calendar, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Affiliate {
  id: number;
  name: string;
  email: string;
  phone: string;
  affiliateCode: string;
  commissionRate: string;
  isActive: boolean;
  totalEarnings: string;
  createdAt: string;
  referralCount?: number;
}

export default function AdminAffiliates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: affiliates = [], isLoading } = useQuery({
    queryKey: ['/api/admin/affiliates'],
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ affiliateId, newStatus }: { affiliateId: number; newStatus: boolean }) => {
      return apiRequest(`/api/admin/affiliates/${affiliateId}/toggle-status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/affiliates'] });
      toast({
        title: "Status atualizado",
        description: "Status do afiliado foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do afiliado.",
        variant: "destructive",
      });
    },
  });

  const filteredAffiliates = affiliates.filter((affiliate: Affiliate) =>
    affiliate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    affiliate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    affiliate.affiliateCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = (affiliateId: number, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ affiliateId, newStatus: !currentStatus });
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value || '0'));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Afiliados</h1>
          <p className="text-gray-600 mt-2">Visualizar e aprovar afiliados cadastrados</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          Total: {filteredAffiliates.length}
        </Badge>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome, email ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Afiliados</p>
                <p className="text-2xl font-bold text-gray-900">{affiliates.length}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ativos</p>
                <p className="text-2xl font-bold text-green-600">
                  {affiliates.filter((a: Affiliate) => a.isActive).length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inativos</p>
                <p className="text-2xl font-bold text-red-600">
                  {affiliates.filter((a: Affiliate) => !a.isActive).length}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <UserX className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ganhos</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(
                    affiliates.reduce((total: number, a: Affiliate) => 
                      total + parseFloat(a.totalEarnings || '0'), 0
                    ).toString()
                  )}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Afiliados */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Afiliados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Ganhos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliates.map((affiliate: Affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell className="font-medium">{affiliate.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          {affiliate.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          {affiliate.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {affiliate.affiliateCode}
                        </Badge>
                      </TableCell>
                      <TableCell>{affiliate.commissionRate}%</TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(affiliate.totalEarnings)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={affiliate.isActive ? "default" : "destructive"}
                          className={affiliate.isActive ? "bg-green-100 text-green-800" : ""}
                        >
                          {affiliate.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          {formatDate(affiliate.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={affiliate.isActive ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleToggleStatus(affiliate.id, affiliate.isActive)}
                          disabled={toggleStatusMutation.isPending}
                          className={affiliate.isActive ? "" : "bg-green-600 hover:bg-green-700"}
                        >
                          {affiliate.isActive ? (
                            <>
                              <UserX className="w-4 h-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAffiliates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum afiliado encontrado.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}