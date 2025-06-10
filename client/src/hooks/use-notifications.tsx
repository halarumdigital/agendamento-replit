import { useState, useCallback, useRef, useEffect } from 'react';
import { NotificationPopup } from '@/components/notification-popup';

interface NotificationData {
  id: string;
  type: 'new_appointment' | 'appointment_update';
  title: string;
  message: string;
  appointment?: {
    clientName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    professionalName: string;
  };
  timestamp: Date;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Criar som de notificação usando Web Audio API
  useEffect(() => {
    const createNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Criar um som estilo WhatsApp (duas notas)
        const createTone = (frequency: number, startTime: number, duration: number) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, startTime);
          oscillator.type = 'sine';
          
          // Envelope para suavizar o som
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        };
        
        const currentTime = audioContext.currentTime;
        createTone(800, currentTime, 0.2); // Primeira nota
        createTone(600, currentTime + 0.25, 0.2); // Segunda nota
      } catch (error) {
        console.error('Erro ao criar som de notificação:', error);
      }
    };
    
    audioRef.current = { play: createNotificationSound } as any;
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && audioRef.current.play) {
      audioRef.current.play();
    }
  }, []);

  const addNotification = useCallback((notification: Omit<NotificationData, 'id' | 'timestamp'>) => {
    const newNotification: NotificationData = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    setNotifications(prev => [...prev, newNotification]);
    playNotificationSound();
  }, [playNotificationSound]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNewAppointmentNotification = useCallback((appointment: {
    clientName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    professionalName: string;
  }) => {
    addNotification({
      type: 'new_appointment',
      title: 'Novo Agendamento',
      message: `${appointment.clientName} agendou ${appointment.serviceName}`,
      appointment,
    });
  }, [addNotification]);

  const NotificationContainer = useCallback(() => (
    <div className="fixed top-0 right-0 z-[9999] pointer-events-none">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * 10}px)`,
            zIndex: 9999 - index,
          }}
        >
          <NotificationPopup
            notification={notification}
            onClose={() => removeNotification(notification.id)}
            onView={() => {
              // Aqui você pode adicionar lógica para navegar para o agendamento
              console.log('Visualizar agendamento:', notification.appointment);
            }}
          />
        </div>
      ))}
    </div>
  ), [notifications, removeNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    showNewAppointmentNotification,
    NotificationContainer,
  };
}