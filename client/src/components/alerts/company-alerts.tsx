import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { useState, useEffect } from "react";

interface Alert {
  id: number;
  title: string;
  message: string;
  active: boolean;
  createdAt: string;
}

export function CompanyAlerts() {
  const [openAlerts, setOpenAlerts] = useState<Alert[]>([]);
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);

  const { data: alerts } = useQuery({
    queryKey: ["/api/company/alerts"],
    queryFn: async () => {
      return await apiRequest("/api/company/alerts", "GET");
    },
  });

  useEffect(() => {
    if (alerts && alerts.length > 0) {
      setOpenAlerts(alerts);
      setCurrentAlertIndex(0);
    }
  }, [alerts]);

  const handleCloseAlert = () => {
    if (currentAlertIndex < openAlerts.length - 1) {
      setCurrentAlertIndex(currentAlertIndex + 1);
    } else {
      setOpenAlerts([]);
    }
  };

  const handleCloseAllAlerts = () => {
    setOpenAlerts([]);
  };

  if (!openAlerts.length) return null;

  const currentAlert = openAlerts[currentAlertIndex];

  return (
    <Dialog open={true} onOpenChange={handleCloseAllAlerts}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            {currentAlert.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-gray-700 whitespace-pre-wrap">
            {currentAlert.message}
          </p>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {currentAlertIndex + 1} de {openAlerts.length}
          </span>
          
          <div className="flex gap-2">
            {openAlerts.length > 1 && currentAlertIndex < openAlerts.length - 1 && (
              <Button variant="outline" onClick={handleCloseAlert}>
                Próximo
              </Button>
            )}
            <Button onClick={handleCloseAllAlerts}>
              {currentAlertIndex === openAlerts.length - 1 ? "Fechar" : "Fechar Todos"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}