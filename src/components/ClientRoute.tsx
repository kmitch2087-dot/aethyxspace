import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ClientRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, adminChecked } = useAuth();
  const [searchParams] = useSearchParams();
  const viewAs = searchParams.get("viewAs");

  if (loading || (viewAs && user && !adminChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (viewAs && !isAdmin) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
};

export default ClientRoute;
