import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseRealTimeUpdatesProps {
  onNewAppointment?: (appointmentData: any) => void;
}

export function useRealTimeUpdates({ onNewAppointment }: UseRealTimeUpdatesProps = {}) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Create SSE connection
    eventSourceRef.current = new EventSource('/api/events');

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_appointment') {
          // Invalidate appointments query to refetch data
          queryClient.invalidateQueries({ queryKey: ['/api/company/appointments'] });
          
          console.log('📅 New appointment detected, refreshing calendar...');
          
          // Trigger notification callback if provided
          if (onNewAppointment && data.appointment) {
            onNewAppointment(data.appointment);
          }
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('SSE connection error:', error);
    };

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [queryClient, onNewAppointment]);

  return null;
}