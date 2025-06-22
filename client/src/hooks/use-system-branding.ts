import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface SystemSettings {
  systemName: string;
  logoUrl: string;
  customHtml: string;
  faviconUrl: string;
}

function extractSystemNameFromCustomHtml(customHtml: string): string {
  if (!customHtml) return 'Agenday';
  
  // Pega a primeira linha do texto personalizado
  const firstLine = customHtml.split('\n')[0].trim();
  
  // Remove tags HTML se houver
  const cleanText = firstLine.replace(/<[^>]*>/g, '').trim();
  
  return cleanText || 'Agenday';
}

export function useSystemBranding() {
  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ['/api/public-settings'],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  useEffect(() => {
    if (settings) {
      // Atualiza o título da aba
      const systemName = extractSystemNameFromCustomHtml(settings.customHtml);
      document.title = systemName;

      // Atualiza o favicon se configurado
      if (settings.faviconUrl) {
        const faviconLink = document.getElementById('favicon-link') as HTMLLinkElement;
        if (faviconLink) {
          faviconLink.href = settings.faviconUrl;
        } else {
          // Cria o link do favicon se não existir
          const link = document.createElement('link');
          link.id = 'favicon-link';
          link.rel = 'icon';
          link.type = 'image/x-icon';
          link.href = settings.faviconUrl;
          document.head.appendChild(link);
        }
      }
    }
  }, [settings]);

  return settings;
}