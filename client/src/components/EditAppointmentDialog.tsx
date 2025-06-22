import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const appointmentSchema = z.object({
  clientId: z.number().optional(),
  serviceId: z.number().min(1, "Selecione um serviço"),
  professionalId: z.number().min(1, "Selecione um profissional"),
  statusId: z.number().min(1, "Selecione um status"),
  clientName: z.string().min(1, "Nome é obrigatório"),
  clientEmail: z.string().email("Email inválido").or(z.literal("")),
  clientPhone: z.string().min(1, "Telefone é obrigatório"),
  appointmentDate: z.string().min(1, "Data é obrigatória"),
  appointmentTime: z.string().min(1, "Horário é obrigatório"),
  notes: z.string().optional(),
  confirmed: z.boolean().default(false),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface Appointment {
  id: number;
  serviceId: number;
  professionalId: number;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  appointmentDate: string;
  appointmentTime: string;
  notes: string | null;
  status: string;
}

interface EditAppointmentDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAppointmentDialog({ appointment, isOpen, onOpenChange }: EditAppointmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: services = [] } = useQuery({
    queryKey: ['/api/company/services'],
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ['/api/company/professionals'],
  });

  const { data: status = [] } = useQuery({
    queryKey: ['/api/company/status'],
  });

  // Create a new form instance for each appointment
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
      appointmentDate: "",
      appointmentTime: "",
      notes: "",
      confirmed: false,
    },
  });

  // Reset form when appointment changes
  useEffect(() => {
    if (appointment && isOpen) {
      console.log('🔄 EditAppointmentDialog: Setting form data for appointment:', appointment.id);
      
      const statusObj = status.find(s => s.name === appointment.status);
      const appointmentDateString = appointment.appointmentDate.toString().split('T')[0];
      
      const formData = {
        clientId: undefined,
        serviceId: appointment.serviceId,
        professionalId: appointment.professionalId,
        statusId: statusObj?.id || 0,
        clientName: appointment.clientName,
        clientEmail: appointment.clientEmail || "",
        clientPhone: appointment.clientPhone || "",
        appointmentDate: appointmentDateString,
        appointmentTime: appointment.appointmentTime,
        notes: appointment.notes || "",
        confirmed: false,
      };

      console.log('🔄 EditAppointmentDialog: Form data:', formData);
      form.reset(formData);
    }
  }, [appointment, isOpen, status, form]);

  const editMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      if (!appointment) throw new Error('No appointment selected');
      
      console.log('📝 EditAppointmentDialog: Submitting data:', data);
      
      return apiRequest(`/api/company/appointments/${appointment.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          serviceId: data.serviceId,
          professionalId: data.professionalId,
          clientName: data.clientName,
          clientEmail: data.clientEmail || null,
          clientPhone: data.clientPhone,
          appointmentDate: data.appointmentDate,
          appointmentTime: data.appointmentTime,
          notes: data.notes || null,
          statusId: data.statusId,
        }),
      });
    },
    onSuccess: () => {
      console.log('✅ EditAppointmentDialog: Appointment updated successfully');
      toast({
        title: "Sucesso",
        description: "Agendamento atualizado com sucesso!",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
      
      // Close dialog
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('❌ EditAppointmentDialog: Error updating appointment:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar agendamento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    console.log('🚀 EditAppointmentDialog: Form submitted with data:', data);
    editMutation.mutate(data);
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Agendamento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((service: any) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name}
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
              name="professionalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissional</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um profissional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {professionals.map((professional: any) => (
                        <SelectItem key={professional.id} value={professional.id.toString()}>
                          {professional.name}
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
              name="statusId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {status.map((s: any) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
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
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={editMutation.isPending}
              >
                {editMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}