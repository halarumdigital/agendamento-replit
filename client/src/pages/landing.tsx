import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Shield, Building } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
              <Settings className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900">
            Sistema Administrativo
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Gerencie empresas e planos de assinatura com facilidade. 
            Acesso exclusivo para administradores autorizados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="text-center">
              <Building className="w-12 h-12 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Gestão de Empresas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Cadastre e gerencie empresas com validação de CNPJ/CPF brasileiro
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Planos de Assinatura</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Crie e configure planos com períodos gratuitos e preços flexíveis
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Settings className="w-12 h-12 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Configurações Globais</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Personalize cores, logotipo e configurações do sistema
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-6">
          <Button
            size="lg"
            onClick={() => window.location.href = "/login"}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            Fazer Login como Administrador
          </Button>
          
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              Credenciais de Demonstração
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Usuário:</span>
                <span className="font-mono bg-slate-100 px-2 py-1 rounded">admin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Senha:</span>
                <span className="font-mono bg-slate-100 px-2 py-1 rounded">admin123</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Utilize estas credenciais para acessar o sistema administrativo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
