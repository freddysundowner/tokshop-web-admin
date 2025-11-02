import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";

export function usePermissions() {
  const { user } = useAuth();
  
  // Fetch demo mode status from settings
  const { data: demoModeData } = useQuery<{success: boolean; demoMode: boolean}>({
    queryKey: ['/api/admin/demo-mode'],
    enabled: !!user?.admin, // Only fetch if user is an admin
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true, // Refresh when window gets focus to ensure fresh state
  });
  
  const isDemoMode = demoModeData?.demoMode || false;
  const isAdmin = user?.admin || false;
  const isSuperAdmin = user?.role === 'superAdmin';
  const isReadOnlyAdmin = user?.admin && !isSuperAdmin;
  
  // In demo mode, NO ONE can perform CRUD operations
  // When demo mode is off, any admin can perform CRUD operations
  const canCreate = !isDemoMode && isAdmin;
  const canEdit = !isDemoMode && isAdmin;
  const canDelete = !isDemoMode && isAdmin;
  const canManageSettings = !isDemoMode && isAdmin;
  
  return {
    canCreate,
    canEdit,
    canDelete,
    canManageSettings,
    isSuperAdmin,
    isReadOnlyAdmin,
    isDemoMode,
  };
}
