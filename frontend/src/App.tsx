import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthPage from "./routes/AuthPage";
import VacancyListPage from "./routes/vacancies/VacancyListPage";
import ProtectedRoutes from "./layout/ProtectedRoutes";
import VacancyDetailPage from "./routes/vacancies/VacancyDetailPage";
import VacancyCreatePage from "./routes/vacancies/new_vacancy/VacancyCreatePage";
import ProfilePage from "./routes/ProfilePage";
import HomePage from "./routes/HomePage";
import EmployerDashboardPage from "./routes/employer/EmployerDashboardPage";
import CandidateDetailsPage from "./routes/employer/CandidateDetailsPage";
function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <ProtectedRoutes />,
      children: [
        {
          path: "/",
          element: <HomePage />,
        },
        {
          path: "/vacancies",
          element: <VacancyListPage />,
        },
        {
          path: "/vacancies/new",
          element: <VacancyCreatePage />,
        },
        {
          path: "/vacancies/:vacancy_id",
          element: <VacancyDetailPage />,
        },
        {
          path: "/profile",
          element: <ProfilePage />,
        },
        {
          path: "/employer/dashboard",
          element: <EmployerDashboardPage />,
        },
        {
          path: "/employer/candidates/:candidate_id",
          element: <CandidateDetailsPage />,
        }
      ],
    },
    { path: "/auth", element: <AuthPage /> },
  ]);

  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
