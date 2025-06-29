import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Clock, User, Phone, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PaymentDetails {
  paymentId: string;
  status: string;
  amount: number;
  appointmentId?: number;
  clientName?: string;
  serviceName?: string;
  professionalName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
}

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [paymentId, setPaymentId] = useState<string>("");

  useEffect(() => {
    // Extrair payment_id da URL
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('payment_id') || urlParams.get('collection_id') || '';
    setPaymentId(id);
  }, []);

  const { data: paymentDetails, isLoading } = useQuery({
    queryKey: ['/api/payment/details', paymentId],
    queryFn: async () => {
      if (!paymentId) return null;
      const response = await apiRequest(`/api/payment/details/${paymentId}`, 'GET');
      return response as PaymentDetails;
    },
    enabled: !!paymentId,
  });

  const handleBackToHome = () => {
    setLocation('/');
  };

  const handleViewAppointment = () => {
    if (paymentDetails?.appointmentId) {
      setLocation(`/agendamento/${paymentDetails.appointmentId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-600">Verificando pagamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Card Principal de Sucesso */}
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">
              Pagamento Confirmado!
            </CardTitle>
            <CardDescription className="text-lg text-green-600">
              Seu agendamento foi confirmado com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {paymentDetails && (
              <>
                {/* Informações do Pagamento */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">Detalhes do Pagamento</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID do Pagamento:</span>
                      <span className="font-mono text-green-700">{paymentDetails.paymentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor Pago:</span>
                      <span className="font-semibold text-green-700">
                        R$ {paymentDetails.amount?.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-semibold text-green-700 capitalize">
                        {paymentDetails.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informações do Agendamento */}
                {paymentDetails.appointmentId && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Detalhes do Agendamento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {paymentDetails.clientName && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-600">Cliente:</span>
                          <span className="font-semibold">{paymentDetails.clientName}</span>
                        </div>
                      )}
                      {paymentDetails.serviceName && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-600">Serviço:</span>
                          <span className="font-semibold">{paymentDetails.serviceName}</span>
                        </div>
                      )}
                      {paymentDetails.professionalName && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-600">Profissional:</span>
                          <span className="font-semibold">{paymentDetails.professionalName}</span>
                        </div>
                      )}
                      {paymentDetails.appointmentDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-600">Data:</span>
                          <span className="font-semibold">{paymentDetails.appointmentDate}</span>
                        </div>
                      )}
                      {paymentDetails.appointmentTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-600">Horário:</span>
                          <span className="font-semibold">{paymentDetails.appointmentTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Informações da Empresa */}
                {paymentDetails.companyName && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Informações do Estabelecimento
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">{paymentDetails.companyName}</span>
                      </div>
                      {paymentDetails.companyAddress && (
                        <div className="text-gray-600">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          {paymentDetails.companyAddress}
                        </div>
                      )}
                      {paymentDetails.companyPhone && (
                        <div className="text-gray-600">
                          <Phone className="w-4 h-4 inline mr-1" />
                          {paymentDetails.companyPhone}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Mensagem de Confirmação */}
            <div className="text-center p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border border-green-200">
              <p className="text-green-800 font-medium">
                🎉 Agendamento confirmado com sucesso!
              </p>
              <p className="text-green-700 text-sm mt-1">
                Você receberá uma confirmação via WhatsApp em breve
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {paymentDetails?.appointmentId && (
                <Button 
                  onClick={handleViewAppointment}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Ver Agendamento
                </Button>
              )}
              <Button 
                onClick={handleBackToHome}
                variant="outline"
                className="flex-1"
              >
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card de Próximos Passos */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800">Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">1</span>
              </div>
              <p className="text-sm text-gray-700">
                Você receberá uma mensagem de confirmação via WhatsApp
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">2</span>
              </div>
              <p className="text-sm text-gray-700">
                Enviaremos lembretes próximo ao horário do agendamento
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">3</span>
              </div>
              <p className="text-sm text-gray-700">
                Compareça no horário agendado no estabelecimento
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}