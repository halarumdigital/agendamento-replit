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
  const { data: tourProgress, isLoading } = useQuery({
    queryKey: ['/api/company/tour/progress'],
    queryFn: () => fetch('/api/company/tour/progress').then(res => res.json()),
    enabled: !!user
  });

  // Check if tour steps exist
  const { data: tourSteps = [] } = useQuery({
    queryKey: ['/api/company/tour/steps'],
    queryFn: () => fetch('/api/company/tour/steps').then(res => res.json()),
    enabled: !!user
  });

  useEffect(() => {
    if (!isLoading && user && tourSteps.length > 0) {
      // Show tour if:
      // 1. No tour progress exists (first time user)
      // 2. Tour exists but not completed
      const shouldShowTour = !tourProgress || !tourProgress.completed;
      
      if (shouldShowTour) {
        // Small delay to let the page load first
        const timer = setTimeout(() => {
          setShowTour(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, tourProgress, user, tourSteps]);

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