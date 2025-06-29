import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, User, Phone, Mail, CreditCard } from "lucide-react";

const bookingSchema = z.object({
  clientName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  clientPhone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  clientEmail: z.string().email("Email inválido").optional(),
  serviceId: z.string().min(1, "Selecione um serviço"),
  professionalId: z.string().min(1, "Selecione um profissional"),
  appointmentDate: z.string().min(1, "Selecione uma data"),
  appointmentTime: z.string().min(1, "Selecione um horário"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface Professional {
  id: number;
  name: string;
}

export default function AppointmentBooking() {
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      serviceId: "",
      professionalId: "",
      appointmentDate: "",
      appointmentTime: "",
      notes: "",
    },
  });

  // Load services and professionals
  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesRes, professionalsRes] = await Promise.all([
          apiRequest("/api/public/services", "GET"),
          apiRequest("/api/public/professionals", "GET")
        ]);
        
        const servicesData = await servicesRes.json();
        const professionalsData = await professionalsRes.json();
        
        setServices(servicesData);
        setProfessionals(professionalsData);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados. Tente novamente.",
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [toast]);

  const onSubmit = async (data: BookingFormData) => {
    setIsLoading(true);
    try {
      // Create appointment with payment pending status
      const appointmentRes = await apiRequest("/api/appointments/create", "POST", {
        ...data,
        serviceId: parseInt(data.serviceId),
        professionalId: parseInt(data.professionalId),
        status: "payment_pending"
      });

      if (!appointmentRes.ok) {
        throw new Error("Erro ao criar agendamento");
      }

      const appointment = await appointmentRes.json();

      // Create Mercado Pago payment preference
      const paymentRes = await apiRequest("/api/mercadopago/create-preference", "POST", {
        appointmentId: appointment.id,
        title: `${selectedService?.name} - ${data.clientName}`,
        price: selectedService?.price || 0,
        clientEmail: data.clientEmail,
        clientName: data.clientName,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
      });

      if (!paymentRes.ok) {
        throw new Error("Erro ao criar pagamento");
      }

      const paymentData = await paymentRes.json();

      // Redirect to Mercado Pago checkout
      if (paymentData.init_point) {
        window.location.href = paymentData.init_point;
      } else {
        throw new Error("Link de pagamento não disponível");
      }

    } catch (error) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Erro",
        description: "Erro ao processar agendamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === parseInt(serviceId));
    setSelectedService(service || null);
    form.setValue("serviceId", serviceId);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agendar Serviço
            </CardTitle>
            <CardDescription>
              Preencha os dados abaixo para agendar seu serviço
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Client Information */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Dados do Cliente
                </h3>
                
                <div>
                  <Label htmlFor="clientName">Nome Completo *</Label>
                  <Input
                    id="clientName"
                    {...form.register("clientName")}
                    placeholder="Seu nome completo"
                  />
                  {form.formState.errors.clientName && (
                    <p className="text-sm text-red-500">{form.formState.errors.clientName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="clientPhone">Telefone *</Label>
                  <Input
                    id="clientPhone"
                    {...form.register("clientPhone")}
                    placeholder="(11) 99999-9999"
                  />
                  {form.formState.errors.clientPhone && (
                    <p className="text-sm text-red-500">{form.formState.errors.clientPhone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    {...form.register("clientEmail")}
                    placeholder="seu@email.com"
                  />
                  {form.formState.errors.clientEmail && (
                    <p className="text-sm text-red-500">{form.formState.errors.clientEmail.message}</p>
                  )}
                </div>
              </div>

              {/* Service Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold">Serviço</h3>
                
                <div>
                  <Label>Escolha o Serviço *</Label>
                  <Select onValueChange={handleServiceChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name} - R$ {service.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.serviceId && (
                    <p className="text-sm text-red-500">{form.formState.errors.serviceId.message}</p>
                  )}
                </div>

                <div>
                  <Label>Profissional *</Label>
                  <Select onValueChange={(value) => form.setValue("professionalId", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map((professional) => (
                        <SelectItem key={professional.id} value={professional.id.toString()}>
                          {professional.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.professionalId && (
                    <p className="text-sm text-red-500">{form.formState.errors.professionalId.message}</p>
                  )}
                </div>
              </div>

              {/* Date and Time */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Data e Horário
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="appointmentDate">Data *</Label>
                    <Input
                      id="appointmentDate"
                      type="date"
                      {...form.register("appointmentDate")}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {form.formState.errors.appointmentDate && (
                      <p className="text-sm text-red-500">{form.formState.errors.appointmentDate.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="appointmentTime">Horário *</Label>
                    <Input
                      id="appointmentTime"
                      type="time"
                      {...form.register("appointmentTime")}
                    />
                    {form.formState.errors.appointmentTime && (
                      <p className="text-sm text-red-500">{form.formState.errors.appointmentTime.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Alguma observação especial?"
                  rows={3}
                />
              </div>

              {/* Price Summary */}
              {selectedService && (
                <Card className="bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total a pagar:</span>
                      <span className="text-lg font-bold text-blue-600">
                        R$ {selectedService.price.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Duração: {selectedService.duration} minutos
                    </p>
                  </CardContent>
                </Card>
              )}
            </form>
          </CardContent>
          <CardFooter>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isLoading || !selectedService}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                "Processando..."
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar e Confirmar Agendamento
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}