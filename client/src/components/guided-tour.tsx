import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface TourStep {
  id: number;
  title: string;
  content: string;
  targetElement: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  orderIndex: number;
}

interface GuidedTourProps {
  companyId: number;
  onClose: () => void;
}

export function GuidedTour({ companyId, onClose }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  // Fetch active tour steps
  const { data: tourSteps = [], isLoading } = useQuery({
    queryKey: ['/api/company/tour/steps'],
    queryFn: () => fetch('/api/company/tour/steps').then(res => res.json())
  });

  // Update tour progress
  const updateProgress = async (stepIndex: number) => {
    try {
      await fetch('/api/company/tour/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStep: stepIndex,
          completed: stepIndex >= tourSteps.length - 1
        })
      });
    } catch (error) {
      console.error('Erro ao atualizar progresso do tour:', error);
    }
  };

  // Highlight target element
  useEffect(() => {
    if (tourSteps.length > 0 && currentStep < tourSteps.length) {
      const step = tourSteps[currentStep];
      const element = document.querySelector(step.targetElement) as HTMLElement;
      
      if (element) {
        // Remove previous highlight
        if (highlightedElement) {
          highlightedElement.style.boxShadow = '';
          highlightedElement.style.position = '';
          highlightedElement.style.zIndex = '';
        }

        // Add highlight to current element
        element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
        element.style.position = 'relative';
        element.style.zIndex = '1000';
        
        setHighlightedElement(element);

        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.style.boxShadow = '';
        highlightedElement.style.position = '';
        highlightedElement.style.zIndex = '';
      }
    };
  }, [currentStep, tourSteps, highlightedElement]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateProgress(nextStep);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      updateProgress(prevStep);
    }
  };

  const handleFinish = async () => {
    await updateProgress(tourSteps.length);
    if (highlightedElement) {
      highlightedElement.style.boxShadow = '';
      highlightedElement.style.position = '';
      highlightedElement.style.zIndex = '';
    }
    onClose();
  };

  if (isLoading) {
    return null;
  }

  if (tourSteps.length === 0) {
    return null;
  }

  const currentTourStep = tourSteps[currentStep];
  if (!currentTourStep) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">
            Tour Guiado ({currentStep + 1}/{tourSteps.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFinish}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium text-lg mb-2">
              {currentTourStep.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {currentTourStep.content}
            </p>
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="flex space-x-1">
              {tourSteps.map((_: any, index: number) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep
                      ? 'bg-blue-600'
                      : index < currentStep
                      ? 'bg-green-600'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="flex items-center gap-2"
            >
              {currentStep === tourSteps.length - 1 ? (
                'Finalizar'
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}