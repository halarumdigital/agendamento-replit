import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

interface TourProgress {
  id: number;
  companyId: number;
  currentStep: number;
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export function useGuidedTour() {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);

  // Check if company has completed the tour
  const { data: tourProgress, isLoading: tourProgressLoading } = useQuery({
    queryKey: ['/api/company/tour/status'],
    queryFn: () => fetch('/api/company/tour/status').then(res => res.json()),
    enabled: !!user
  });

  // Check if tour steps exist
  const { data: tourSteps = [], isLoading: tourStepsLoading } = useQuery({
    queryKey: ['/api/company/tour/steps'],
    queryFn: () => fetch('/api/company/tour/steps').then(res => res.json()),
    enabled: !!user
  });

  useEffect(() => {
    console.log('🎯 Tour Debug:', {
      user: !!user,
      tourProgressLoading,
      tourStepsLoading,
      tourProgress,
      tourSteps,
      tourStepsLength: tourSteps?.length
    });

    if (!tourProgressLoading && !tourStepsLoading && user) {
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
  }, [tourProgressLoading, tourStepsLoading, tourProgress, user, tourSteps]);

  const closeTour = () => {
    setShowTour(false);
  };

  const startTour = () => {
    setShowTour(true);
  };

  return {
    showTour,
    closeTour,
    startTour,
    tourProgress,
    hasActiveTour: tourSteps.length > 0
  };
}