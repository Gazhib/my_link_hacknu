import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Header from "../widget/Header";
import { userService } from "../shared/api/userService";

export default function ProtectedRoutes() {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const user = await userService.getMe();
        console.log('Authenticated user:', { email: user.email, role: user.role });
        if (!mounted) return;
        setIsChecking(false);
      } catch (error: any) {
        if (!mounted) return;
        const status = error?.response?.status;
        console.error('Authentication check failed:', status);
        if (status === 401) {
          console.error('Token invalid or expired - redirecting to login');
          navigate("/auth?mode=login", { replace: true });
          return;
        }
        setIsChecking(false);
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (isChecking) {
    return (
      <main className="w-full h-full">
        <Header />
        <div className="p-4">Checking authentication...</div>
      </main>
    );
  }

  return (
    <main className="w-full h-full">
      <Header />
      <Outlet />
    </main>
  );
}
