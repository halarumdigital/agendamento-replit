import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Assuming you have a way to get the current user's companyId
// For now, let's mock it. In a real app, this would come from a session/auth context.
const getCurrentCompanyId = () => 1;

const couponSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().min(0, "Valor do desconto deve ser positivo"),
  expiresAt: z.string().optional(),
  maxUses: z.coerce.number().int().min(1, "Número de usos deve ser positivo"),
  isActive: z.boolean().default(true),
});

type CouponFormData = z.infer<typeof couponSchema>;

interface Coupon {
  id: number;
  name: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  expiresAt?: string;
  maxUses: number;
  usesCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminCoupons() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
    queryFn: async () => {
      const response = await fetch("/api/coupons");
      if (!response.ok) throw new Error("Falha ao buscar cupons");
      return response.json();
    },
  });

  const form = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CouponFormData) => {
      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      if (!response.ok) {
        let errorMessage = "Falha ao criar cupom";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing success response:', e);
        throw new Error("Resposta inválida do servidor");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Sucesso", description: "Cupom criado com sucesso" });
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
    mutationFn: (data: CouponFormData) =>
      fetch(`/api/coupons/${editingCoupon!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => {
        if (!res.ok) throw new Error("Falha ao atualizar cupom");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setIsDialogOpen(false);
      setEditingCoupon(null);
      toast({ title: "Sucesso", description: "Cupom atualizado com sucesso" });
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
    mutationFn: (id: number) =>
      fetch(`/api/coupons/${id}`, { method: "DELETE" }).then((res) => {
        if (!res.ok) throw new Error("Falha ao excluir cupom");
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      toast({ title: "Sucesso", description: "Cupom excluído com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (coupon: Coupon | null) => {
    setEditingCoupon(coupon);
    if (coupon) {
      form.reset({
        ...coupon,
        expiresAt: coupon.expiresAt
          ? format(new Date(coupon.expiresAt), "yyyy-MM-dd")
          : "",
      });
    } else {
      form.reset({
        name: "",
        code: "",
        discountType: "percentage",
        discountValue: 0,
        expiresAt: "",
        maxUses: 1,
        isActive: true,
        companyId: getCurrentCompanyId(),
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: CouponFormData) => {
    if (editingCoupon) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
        <Button onClick={() => handleOpenDialog(null)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Cupom
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cupons Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>{coupon.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{coupon.code}</Badge>
                    </TableCell>
                    <TableCell>{coupon.discountType}</TableCell>
                    <TableCell>
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}%`
                        : `R$ ${coupon.discountValue.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      {coupon.usesCount} / {coupon.maxUses}
                    </TableCell>
                    <TableCell>
                      {coupon.expiresAt
                        ? format(new Date(coupon.expiresAt), "dd/MM/yyyy")
                        : "Não expira"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={coupon.isActive ? "default" : "destructive"}
                      >
                        {coupon.isActive ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(coupon)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(coupon.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? "Editar Cupom" : "Novo Cupom"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cupom</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <div className="flex gap-2">
                  <Input id="code" {...form.register("code")} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      form.setValue(
                        "code",
                        Math.random().toString(36).substring(2, 10).toUpperCase()
                      )
                    }
                  >
                    Gerar
                  </Button>
                </div>
                {form.formState.errors.code && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.code.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountType">Tipo de Desconto</Label>
                <Select
                  onValueChange={(value) =>
                    form.setValue("discountType", value as "percentage" | "fixed")
                  }
                  defaultValue={form.getValues("discountType")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">Valor do Desconto</Label>
                <Input
                  id="discountValue"
                  type="number"
                  step="0.01"
                  {...form.register("discountValue")}
                />
                {form.formState.errors.discountValue && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.discountValue.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Data de Expiração</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  {...form.register("expiresAt")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Limite de Usos</Label>
                <Input
                  id="maxUses"
                  type="number"
                  {...form.register("maxUses")}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={form.watch("isActive")}
                onCheckedChange={(checked) => form.setValue("isActive", checked)}
              />
              <Label htmlFor="isActive">Ativo</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingCoupon ? "Salvar Alterações" : "Criar Cupom"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 