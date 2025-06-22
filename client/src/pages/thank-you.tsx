import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { CheckCircle, ArrowRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ThankYou() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to home after 60 seconds if user doesn't take action
    const timer = setTimeout(() => {
      setLocation('/');
    }, 60000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-300">
            Pagamento Confirmado!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Sua assinatura foi ativada com sucesso!
            </p>
            <p className="text-muted-foreground">
              Agora você já pode fazer login em seu painel e configurar os dados do seu negócio.
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/company/login">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                <Building2 className="w-4 h-4 mr-2" />
                Clique aqui para entrar no seu portal
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="outline" className="w-full">
                Voltar ao Início
              </Button>
            </Link>
          </div>

          <div className="text-xs text-muted-foreground mt-8">
            <p>
              Você será redirecionado automaticamente em 60 segundos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}