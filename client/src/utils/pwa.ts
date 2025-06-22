// Service Worker registration
export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New update available
                    if (confirm('Nova versão disponível! Recarregar para atualizar?')) {
                      window.location.reload();
                    }
                  }
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Check if device is mobile
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if app is running in standalone mode
export const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

// Get device type for optimized experience
export const getDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/ipad/.test(userAgent)) return 'tablet';
  if (/iphone|ipod/.test(userAgent)) return 'mobile';
  if (/android/.test(userAgent)) {
    return /mobile/.test(userAgent) ? 'mobile' : 'tablet';
  }
  
  return 'desktop';
};

// Add viewport meta for better mobile experience
export const optimizeViewport = () => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport && isMobileDevice()) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }
};

// Prevent default iOS behaviors that interfere with PWA
export const preventIOSBehaviors = () => {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    // Prevent zoom on input focus
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });
    
    // Prevent bounce scroll
    document.body.addEventListener('touchmove', (e) => {
      if (isStandalone()) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // Hide address bar on scroll
    let lastScrollTop = 0;
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling down
        if (window.screen.height - window.innerHeight < 100) {
          window.scrollTo(0, scrollTop + 1);
        }
      }
      lastScrollTop = scrollTop;
    }, { passive: true });
  }
};