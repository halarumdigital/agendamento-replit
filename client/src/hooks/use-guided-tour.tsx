import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyAuth } from "./useCompanyAuth";

interface TourProgress {
  id: number;
  companyId: number;
  currentStep: number;
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export function useGuidedTour() {
  const { company, isAuthenticated } = useCompanyAuth();
  const [showTour, setShowTour] = useState(false);

  // Check if company has completed the tour
  const { data: tourProgress, isLoading: tourProgressLoading } = useQuery({
    queryKey: ['/api/company/tour/status'],
    queryFn: () => fetch('/api/company/tour/status').then(res => res.json()),
    enabled: !!company
  });

  // Check if tour steps exist
  const { data: tourSteps = [], isLoading: tourStepsLoading } = useQuery({
    queryKey: ['/api/company/tour/steps'],
    queryFn: () => fetch('/api/company/tour/steps').then(res => res.json()),
    enabled: !!company
  });

  useEffect(() => {
    console.log('🎯 Tour Debug:', {
      company: !!company,
      isAuthenticated,
      tourProgressLoading,
      tourStepsLoading,
      tourProgress,
      tourSteps,
      tourStepsLength: tourSteps?.length
    });

    if (!tourProgressLoading && !tourStepsLoading && company) {
      // Show tour if there are steps and shouldShowTour is true
      const hasSteps = Array.isArray(tourSteps) && tourSteps.length > 0;
      const shouldShowTour = tourProgress?.shouldShowTour === true;
      
      console.log('🎯 Tour Decision:', { hasSteps, shouldShowTour });
      
      if (hasSteps && shouldShowTour) {
        // Small delay to let the page load first
        const timer = setTimeout(() => {
          console.log('🎯 Starting tour!');
          setShowTour(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [tourProgressLoading, tourStepsLoading, tourProgress, company, tourSteps]);

  const closeTour = () => {
    setShowTour(false);
  };

  const startTour = () => {
    setShowTour(true);
  };

  const resetTour = async () => {
    try {
      const response = await fetch('/api/company/tour/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Refetch tour status after reset
        window.location.reload(); // Simple reload to refresh all tour state
      }
    } catch (error) {
      console.error('Error resetting tour:', error);
    }
  };

  return {
    showTour,
    closeTour,
    startTour,
    resetTour,
    tourProgress,
    tourSteps,
    isLoading: tourProgressLoading || tourStepsLoading,
    hasActiveTour: tourSteps.length > 0
  };
}