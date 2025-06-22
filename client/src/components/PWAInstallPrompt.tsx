import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode || isIOSStandalone);
      setIsInstalled(isStandaloneMode || isIOSStandalone);
    };

    // Check if device is iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /ipad|iphone|ipod/.test(userAgent);
      setIsIOS(isIOSDevice);
    };

    checkInstalled();
    checkIOS();

    // Handle beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay, but only if not already installed
      if (!isInstalled) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS, show prompt after delay if not in standalone mode
    if (isIOS && !isStandalone) {
      const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-seen');
      if (!hasSeenPrompt) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, isStandalone, isIOS]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      // For iOS, we can't programmatically install, so we show instructions
      localStorage.setItem('pwa-install-prompt-seen', 'true');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-dismissed', Date.now().toString());
  };

  // Don't show if already installed or user dismissed recently
  if (isInstalled || !showPrompt) {
    return null;
  }

  const dismissedTime = localStorage.getItem('pwa-install-prompt-dismissed');
  if (dismissedTime) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < 7) {
      return null;
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-sm">
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg border-0">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">
                Instale o Agenday
              </h3>
              <p className="text-xs text-white/90 mb-3">
                {isIOS 
                  ? 'Adicione à tela inicial para acesso rápido e melhor experiência'
                  : 'Instale em seu dispositivo para acesso rápido e funcionalidades offline'
                }
              </p>
              
              {isIOS ? (
                <div className="space-y-2 text-xs text-white/90 mb-3">
                  <p>Para instalar:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Toque no ícone de compartilhar (↗)</li>
                    <li>Selecione "Adicionar à Tela Inicial"</li>
                    <li>Toque em "Adicionar"</li>
                  </ol>
                </div>
              ) : null}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleInstallClick}
                  className="text-purple-700 hover:text-purple-800 bg-white hover:bg-white/90"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {isIOS ? 'Entendi' : 'Instalar'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-white hover:bg-white/20"
                >
                  Agora não
                </Button>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-white hover:bg-white/20 p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}