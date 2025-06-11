import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building, Edit, Trash2, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { companySchema } from "@/lib/validations";
import { formatDocument } from "@/lib/validations";
import type { Company } from "@shared/schema";
import { z } from "zod";

type CompanyFormData = z.infer<typeof companySchema>;

export default function Companies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      fantasyName: "",
      document: "",
      address: "",
      email: "",
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      await apiRequest("POST", "/api/companies", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Empresa cadastrada com sucesso!",
      });
      form.reset();
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao cadastrar empresa",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CompanyFormData> }) => {
      await apiRequest("PUT", `/api/companies/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Empresa atualizada com sucesso!",
      });
      form.reset();
      setEditingCompany(null);
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar empresa",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/companies/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Empresa excluída com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir empresa",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompanyFormData) => {
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    form.reset({
      fantasyName: company.fantasyName,
      document: company.document,
      address: company.address,
      email: company.email,
      password: "", // Don't pre-fill password for security
    });
    setIsModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingCompany(null);
    form.reset();
    setIsModalOpen(false);
  };

  const handleNewCompany = () => {
    setEditingCompany(null);
    form.reset();
    setIsModalOpen(true);
  };

  const filteredCompanies = companies.filter(company =>
    company.fantasyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.document.includes(searchTerm)
  );

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    const formatted = formatDocument(value);
    form.setValue('document', formatted);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-slate-600 mt-1">Gerencie as empresas cadastradas</p>
        </div>
        <Button className="mt-4 sm:mt-0" onClick={handleNewCompany}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {/* Company Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? "Editar Empresa" : "Cadastro de Empresa"}
            </DialogTitle>
            <DialogDescription>
              {editingCompany 
                ? "Atualize as informações da empresa selecionada"
                : "Preencha os dados para cadastrar uma nova empresa"
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fantasyName">Nome Fantasia</Label>
                <Input
                  id="fantasyName"
                  {...form.register("fantasyName")}
                  placeholder="Digite o nome fantasia"
                />
                {form.formState.errors.fantasyName && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.fantasyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">CNPJ / CPF</Label>
                <Input
                  id="document"
                  {...form.register("document")}
                  onChange={handleDocumentChange}
                  placeholder="00.000.000/0000-00"
                />
                {form.formState.errors.document && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.document.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                {...form.register("address")}
                placeholder="Digite o endereço completo"
              />
              {form.formState.errors.address && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="contato@empresa.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingCompany ? "Nova Senha (opcional)" : "Senha"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password")}
                  placeholder="Digite a senha"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCompany ? "Atualizar Empresa" : "Cadastrar Empresa"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Empresas Cadastradas</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar empresas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-slate-600">Carregando empresas...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-8">
              <Building className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">
                {searchTerm ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {searchTerm ? "Tente alterar os termos de busca" : "Comece cadastrando sua primeira empresa"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-900">
                            {company.fantasyName}
                          </div>
                          <div className="text-sm text-slate-500">
                            {company.address}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {company.document}
                      </TableCell>
                      <TableCell>{company.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Ativo
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(company)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(company.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
