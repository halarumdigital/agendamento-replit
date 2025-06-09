import { useQuery } from "@tanstack/react-query";
import type { Company } from "@shared/schema";

export function useCompanyAuth() {
  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["/api/company/auth/profile"],
    retry: false,
  });

  return {
    company,
    isLoading,
    isAuthenticated: !!company,
  };
}