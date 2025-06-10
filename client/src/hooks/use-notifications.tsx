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

  // Criar audio element para o som de notificação
  useEffect(() => {
    audioRef.current = new Audio();
    // Som de notificação estilo WhatsApp (usando data URL para um tom simples)
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmESBkOa2+7MeDsFIYfO7+CFNAYQY7jm7qNRDAlEouC0smMcBzmU2/HJdCMFl'+'...'+'(truncated for brevity)';
    audioRef.current.volume = 0.6;
    audioRef.current.preload = 'auto';
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
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