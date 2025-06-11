import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  Edit,
  Trash2,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileText,
  Users,
  PieChart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Schemas de validação
const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  type: z.enum(["income", "expense"]),
  color: z.string().min(1, "Cor é obrigatória"),
});

const paymentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  type: z.enum(["cash", "card", "pix", "transfer", "other"]),
  isActive: z.boolean(),
});

const transactionSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().min(0.01, "Valor deve ser maior que zero"),
  type: z.enum(["income", "expense"]),
  categoryId: z.number().min(1, "Categoria é obrigatória"),
  paymentMethodId: z.number().min(1, "Método de pagamento é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  notes: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type PaymentFormData = z.infer<typeof paymentSchema>;
type TransactionFormData = z.infer<typeof transactionSchema>;

interface Category {
  id: number;
  name: string;
  description?: string;
  type: "income" | "expense";
  color: string;
  createdAt: string;
}

interface PaymentMethod {
  id: number;
  name: string;
  description?: string;
  type: "cash" | "card" | "pix" | "transfer" | "other";
  isActive: boolean;
  createdAt: string;
}

interface Transaction {
  id: number;
  description: string;
  amount: number | string;
  type: "income" | "expense";
  categoryId: number;
  paymentMethodId: number;
  date: string;
  notes?: string;
  createdAt: string;
  category: Category;
  paymentMethod: PaymentMethod;
}

export default function CompanyFinancial() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [dashboardDateFilter, setDashboardDateFilter] = useState(
    new Date().toISOString().slice(0, 7) // formato YYYY-MM para o mês atual
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/company/financial/categories"],
  });

  const { data: paymentMethods = [], isLoading: isLoadingPayments } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/company/financial/payment-methods"],
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/company/financial/transactions"],
  });

  const { data: dashboardData = {
    monthlyIncome: 0,
    incomeGrowth: 0,
    monthlyExpenses: 0,
    expenseGrowth: 0,
    totalTransactions: 0
  }, isLoading: isLoadingDashboard } = useQuery<{
    monthlyIncome: number;
    incomeGrowth: number;
    monthlyExpenses: number;
    expenseGrowth: number;
    totalTransactions: number;
  }>({
    queryKey: ["/api/company/financial/dashboard", dashboardDateFilter],
    queryFn: () => {
      const url = `/api/company/financial/dashboard?month=${dashboardDateFilter}`;
      return apiRequest(url);
    },
  });

  // Forms
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      type: "expense",
      color: "#3B82F6",
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "cash",
      isActive: true,
    },
  });

  const transactionForm = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      amount: 0,
      type: "expense",
      categoryId: 0,
      paymentMethodId: 0,
      date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData) =>
      apiRequest("/api/company/financial/categories", "POST", data),
    onSuccess: () => {
      // Invalidar e refetch imediatamente
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/categories"] });
      queryClient.refetchQueries({ queryKey: ["/api/company/financial/categories"] });
      setIsCategoryModalOpen(false);
      categoryForm.reset();
      toast({ title: "Categoria criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryFormData }) =>
      apiRequest(`/api/company/financial/categories/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/categories"] });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({ title: "Categoria atualizada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/company/financial/categories/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/categories"] });
      toast({ title: "Categoria removida com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) =>
      apiRequest("/api/company/financial/payment-methods", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/payment-methods"] });
      setIsPaymentModalOpen(false);
      paymentForm.reset();
      toast({ title: "Método de pagamento criado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar método de pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PaymentFormData }) =>
      apiRequest(`/api/company/financial/payment-methods/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/payment-methods"] });
      setIsPaymentModalOpen(false);
      setEditingPayment(null);
      paymentForm.reset();
      toast({ title: "Método de pagamento atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar método de pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/company/financial/payment-methods/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/payment-methods"] });
      toast({ title: "Método de pagamento removido com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover método de pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data: TransactionFormData) =>
      apiRequest("/api/company/financial/transactions", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/dashboard"] });
      setIsTransactionModalOpen(false);
      transactionForm.reset();
      toast({ title: "Transação criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TransactionFormData }) =>
      apiRequest(`/api/company/financial/transactions/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/dashboard"] });
      setIsTransactionModalOpen(false);
      setEditingTransaction(null);
      transactionForm.reset();
      toast({ title: "Transação atualizada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/company/financial/transactions/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company/financial/dashboard"] });
      toast({ title: "Transação removida com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreateCategory = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
      type: category.type,
      color: category.color,
    });
    setIsCategoryModalOpen(true);
  };

  const handleCreatePayment = (data: PaymentFormData) => {
    if (editingPayment) {
      updatePaymentMutation.mutate({ id: editingPayment.id, data });
    } else {
      createPaymentMutation.mutate(data);
    }
  };

  const handleEditPayment = (payment: PaymentMethod) => {
    setEditingPayment(payment);
    paymentForm.reset({
      name: payment.name,
      description: payment.description || "",
      type: payment.type,
      isActive: payment.isActive,
    });
    setIsPaymentModalOpen(true);
  };

  const handleCreateTransaction = (data: TransactionFormData) => {
    if (editingTransaction) {
      updateTransactionMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createTransactionMutation.mutate(data);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    transactionForm.reset({
      description: transaction.description,
      amount: typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId,
      paymentMethodId: transaction.paymentMethodId,
      date: transaction.date.split("T")[0],
      notes: transaction.notes || "",
    });
    setIsTransactionModalOpen(true);
  };

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  };

  const getPaymentTypeLabel = (type: string) => {
    const types = {
      cash: "Dinheiro",
      card: "Cartão",
      pix: "PIX",
      transfer: "Transferência",
      other: "Outro",
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Gerencie suas finanças, categorias, pagamentos e transações
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Filtro de Data */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Filtros</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="date-filter">Mês:</Label>
                </div>
                <Input
                  id="date-filter"
                  type="month"
                  value={dashboardDateFilter}
                  onChange={(e) => setDashboardDateFilter(e.target.value)}
                  className="w-48"
                />
              </div>
            </CardContent>
          </Card>

          {isLoadingDashboard ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
            </div>
          ) : (
            <>
              {/* Resumo Financeiro */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receitas do Mês</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(dashboardData?.monthlyIncome || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +{dashboardData?.incomeGrowth || 0}% em relação ao mês anterior
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(dashboardData?.monthlyExpenses || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +{dashboardData?.expenseGrowth || 0}% em relação ao mês anterior
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency((dashboardData?.monthlyIncome || 0) - (dashboardData?.monthlyExpenses || 0))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Receitas - Despesas do mês
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Transações</CardTitle>
                    <Receipt className="h-4 w-4 text-gray-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.totalTransactions || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total de transações no mês
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Transações Recentes */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold">Transações Recentes</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {transactions.slice(0, 5).length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions.slice(0, 5).map((transaction: Transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-full ${
                              transaction.type === "income" ? "bg-green-100" : "bg-red-100"
                            }`}>
                              {transaction.type === "income" ? (
                                <ArrowUpRight className="w-4 h-4 text-green-600" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.category?.name} • {getPaymentTypeLabel(transaction.paymentMethod?.type)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              transaction.type === "income" ? "text-green-600" : "text-red-600"
                            }`}>
                              {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.date ? format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR }) : "Data não informada"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Categorias</h2>
              <p className="text-muted-foreground">Gerencie as categorias de receitas e despesas</p>
            </div>
            <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingCategory(null);
                  categoryForm.reset();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...categoryForm}>
                  <form onSubmit={categoryForm.handleSubmit(handleCreateCategory)} className="space-y-4">
                    <FormField
                      control={categoryForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Vendas, Aluguel, Marketing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={categoryForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descrição opcional da categoria"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={categoryForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="income">Receita</SelectItem>
                              <SelectItem value="expense">Despesa</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={categoryForm.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor *</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                      >
                        {editingCategory ? "Atualizar" : "Criar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCategoryModalOpen(false);
                          setEditingCategory(null);
                          categoryForm.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {isLoadingCategories ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Carregando categorias...</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-12">
                  <PieChart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma categoria criada</h3>
                  <p className="text-muted-foreground mb-4">
                    Comece criando suas primeiras categorias
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category: Category) => (
                    <div
                      key={category.id}
                      className="border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <h3 className="font-semibold">{category.name}</h3>
                            <Badge variant={category.type === "income" ? "default" : "secondary"}>
                              {category.type === "income" ? "Receita" : "Despesa"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCategoryMutation.mutate(category.id)}
                            disabled={deleteCategoryMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payments" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Métodos de Pagamento</h2>
              <p className="text-muted-foreground">Gerencie os métodos de pagamento aceitos</p>
            </div>
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingPayment(null);
                  paymentForm.reset();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Método
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPayment ? "Editar Método de Pagamento" : "Novo Método de Pagamento"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...paymentForm}>
                  <form onSubmit={paymentForm.handleSubmit(handleCreatePayment)} className="space-y-4">
                    <FormField
                      control={paymentForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Dinheiro, Cartão de Crédito" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={paymentForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descrição opcional do método"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={paymentForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Dinheiro</SelectItem>
                              <SelectItem value="card">Cartão</SelectItem>
                              <SelectItem value="pix">PIX</SelectItem>
                              <SelectItem value="transfer">Transferência</SelectItem>
                              <SelectItem value="other">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={paymentForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Ativo</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Método disponível para uso
                            </p>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}
                      >
                        {editingPayment ? "Atualizar" : "Criar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsPaymentModalOpen(false);
                          setEditingPayment(null);
                          paymentForm.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {isLoadingPayments ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Carregando métodos...</p>
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum método criado</h3>
                  <p className="text-muted-foreground mb-4">
                    Comece criando seus métodos de pagamento
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paymentMethods.map((payment: PaymentMethod) => (
                    <div
                      key={payment.id}
                      className="border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{payment.name}</h3>
                            <Badge variant={payment.isActive ? "default" : "secondary"}>
                              {payment.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getPaymentTypeLabel(payment.type)}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPayment(payment)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deletePaymentMutation.mutate(payment.id)}
                            disabled={deletePaymentMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {payment.description && (
                        <p className="text-sm text-muted-foreground">{payment.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Transações</h2>
              <p className="text-muted-foreground">Gerencie todas as transações financeiras</p>
            </div>
            <Dialog open={isTransactionModalOpen} onOpenChange={(open) => {
              setIsTransactionModalOpen(open);
              if (!open) {
                setEditingTransaction(null);
                transactionForm.reset({
                  description: "",
                  amount: 0,
                  type: "expense",
                  categoryId: 0,
                  paymentMethodId: 0,
                  date: new Date().toISOString().split("T")[0],
                  notes: "",
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingTransaction(null);
                  transactionForm.reset({
                    description: "",
                    amount: 0,
                    type: "expense",
                    categoryId: 0,
                    paymentMethodId: 0,
                    date: new Date().toISOString().split("T")[0],
                    notes: "",
                  });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTransaction ? "Editar Transação" : "Nova Transação"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...transactionForm}>
                  <form onSubmit={transactionForm.handleSubmit(handleCreateTransaction)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={transactionForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Pagamento de cliente" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={transactionForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={transactionForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="income">Receita</SelectItem>
                                <SelectItem value="expense">Despesa</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={transactionForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={transactionForm.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria *</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a categoria" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category: Category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={transactionForm.control}
                        name="paymentMethodId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Método de Pagamento *</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o método" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {paymentMethods.filter((p: PaymentMethod) => p.isActive).map((payment: PaymentMethod) => (
                                  <SelectItem key={payment.id} value={payment.id.toString()}>
                                    {payment.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={transactionForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Observações opcionais sobre a transação"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
                      >
                        {editingTransaction ? "Atualizar" : "Criar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsTransactionModalOpen(false);
                          setEditingTransaction(null);
                          transactionForm.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {isLoadingTransactions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Carregando transações...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma transação criada</h3>
                  <p className="text-muted-foreground mb-4">
                    Comece registrando suas primeiras transações
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction: Transaction) => (
                    <div
                      key={transaction.id}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className={`p-2 rounded-full ${
                            transaction.type === "income" ? "bg-green-100" : "bg-red-100"
                          }`}>
                            {transaction.type === "income" ? (
                              <ArrowUpRight className="w-4 h-4 text-green-600" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold">{transaction.description}</h3>
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
                              <span key="category">{transaction.category?.name}</span>
                              <span key="sep1">•</span>
                              <span key="payment">{getPaymentTypeLabel(transaction.paymentMethod?.type)}</span>
                              <span key="sep2">•</span>
                              <span key="date">{transaction.date ? format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR }) : "Data não informada"}</span>
                            </div>
                            {transaction.notes && (
                              <p className="text-sm text-muted-foreground mt-2">{transaction.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className={`font-semibold text-lg ${
                              transaction.type === "income" ? "text-green-600" : "text-red-600"
                            }`}>
                              {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTransactionMutation.mutate(transaction.id)}
                              disabled={deleteTransactionMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}