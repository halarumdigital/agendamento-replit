import { useQuery } from "@tanstack/react-query";

export function useCompanyAuth() {
  const { data: company, isLoading } = useQuery({
    queryKey: ["/api/company/auth/profile"],
    retry: false,
  });

  return {
    company,
    isLoading,
    isAuthenticated: !!company,
  };
}