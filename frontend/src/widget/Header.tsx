import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { userService, type User } from "../shared/api/userService";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await userService.getMe();
        setUser(userData);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);



  return (
    <header className="w-full sticky top-0 bg-white z-10">
      <nav className="w-full px-[80px] py-[10px] flex justify-between items-center border-b-[1px] border-gray-300">
        <Link to="/" className="text-2xl font-bold text-gray-900">
          <svg
            width="158"
            height="36"
            viewBox="0 0 158 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M56.8839 26.9732H51.74V0H56.8839V26.9732ZM62.9963 6.40163C61.2692 6.40163 59.8731 5.10691 59.8731 3.41659C59.8731 1.76223 61.2692 0.431574 62.9963 0.431574C64.6496 0.431574 66.0825 1.76223 66.0825 3.41659C66.0825 5.10691 64.6496 6.40163 62.9963 6.40163ZM65.5315 26.9732H60.3875V9.17084H65.5315V26.9732ZM74.179 26.9732H69.0349V9.17084H74.179V11.2209C75.5386 9.7462 77.4492 8.81127 79.9478 8.81127C84.0997 8.81127 87.4432 11.4725 87.4432 17.2627V26.9732H82.2993V18.0181C82.2993 15.0331 80.8662 13.1628 78.3678 13.1628C75.7223 13.1628 74.179 15.1409 74.179 18.0541V26.9732ZM102.1 9.17084H108.677L100.85 17.8741L108.677 26.9732H102.21L95.78 19.133V26.9732H90.6358V0H95.78V16.6514L102.1 9.17084Z"
              fill="#1CC0F3"
            />
            <path
              d="M5.14403 26.9734H0V9.1711H5.14403V11.293C6.35656 9.81846 8.34068 8.81152 10.5085 8.81152C12.8233 8.81152 14.734 9.71067 16.2404 11.6885C17.8204 9.89046 19.8045 8.81152 22.6338 8.81152C27.043 8.81152 30.2028 11.7965 30.2028 17.6228V26.9734H25.0589V18.0902C25.0589 14.7816 23.5157 13.1631 21.4579 13.1631C19.2534 13.1631 17.5999 14.9613 17.5999 18.0902V26.9734H12.6029V18.0902C12.6029 14.7456 11.0597 13.1631 9.00206 13.1631C6.87095 13.1631 5.14403 14.9253 5.14403 18.0902V26.9734ZM40.7958 22.0103L45.0581 9.1711H50.5694L40.5753 35.9644H35.2843L38.2606 28.1961L31.2059 9.1711H36.6438L40.7958 22.0103Z"
              fill="black"
            />
            <path
              d="M46.6559 4.66298V0.316406C43.0863 2.33367 38.6885 2.33367 35.1187 0.316406V4.66298C38.6885 6.68024 43.0863 6.68024 46.6559 4.66298Z"
              fill="black"
            />
          </svg>
        </Link>
        <main>
          {loading ? (
            <div className="text-gray-500 text-sm">Loading...</div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <Link to="/profile" className="text-gray-700 hover:text-gray-900">
                {user.username || user.email}
              </Link>
              {(user?.role.toLowerCase() === "employer" || user?.role.toLowerCase() === "admin") && (
                <Link
                  to="/employer/dashboard"
                  className="mr-6 px-[20px] py-[10px] rounded-[8px] bg-[#008EFF] text-white text-[14px] font-bold hover:bg-blue-600"
                >
                  Панель работодателя
                </Link>
              )}
            </div>
          ) : (
            <main className="flex gap-4">
              <Link
                to="/auth?mode=signup"
                className="px-[20px] py-[10px] rounded-[8px] bg-[#9AD3FF] text-[#008EFF] text-[14px] font-bold hover:bg-blue-400"
              >
                Регистрация
              </Link>
              <Link
                to="/auth?mode=login"
                className="px-[20px] py-[10px] rounded-[8px] bg-[#008EFF] text-white text-[14px] font-bold hover:bg-blue-600"
              >
                Войти
              </Link>
            </main>
          )}
        </main>
      </nav>
    </header>
  );
}
