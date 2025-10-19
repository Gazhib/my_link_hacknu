import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import VacancyCard from "../entities/vacancy/VacancyCard";
import { vacancyService, type Vacancy } from "../shared/api/vacancyService";

function HomePage() {
  const [recentVacancies, setRecentVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentVacancies = async () => {
      try {
        const response = await vacancyService.list({
          limit: 3,
          sort: "-createdAt",
        });
        // Backend returns array directly, not wrapped in { items: [] }
        setRecentVacancies(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error("Failed to fetch recent vacancies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentVacancies();
  }, []);

  return (
    <main
      role="main"
      className="min-h-screen flex items-start justify-center p-8 bg-gradient-to-b from-slate-50 to-white text-slate-900 font-sans"
    >
      <section
        aria-labelledby="home-title"
        className="w-full max-w-6xl bg-white border border-slate-200 rounded-xl shadow-xl p-8"
      >
        <header className="mb-6">
          <h1 id="home-title" className="text-3xl">
            Главная
          </h1>
          <p className="mt-2 text-slate-600">
            Поиск вакансий, управление профилем и быстрый доступ к ключевым
            разделам платформы.
          </p>
        </header>

        <nav
          aria-label="Quick actions"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              to="/vacancies"
              className="block border border-slate-200 rounded-lg p-4 hover:shadow-sm"
            >
              <h2 className="text-lg font-semibold">Вакансии</h2>
              <p className="mt-2 text-slate-600">
                Просмотреть все доступные вакансии.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-sky-500 bg-sky-500 text-white text-sm">
                Открыть
              </div>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              to="/profile"
              className="block border border-slate-200 rounded-lg p-4 hover:shadow-sm"
            >
              <h2 className="text-lg font-semibold">Профиль</h2>
              <p className="mt-2 text-slate-600">
                Загрузите резюме и управляйте данными аккаунта.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-900 bg-gray-900 text-white text-sm">
                Перейти
              </div>
            </Link>
          </motion.div>
        </nav>

        <section className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Последние вакансии</h3>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Загрузка...</div>
          ) : recentVacancies.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Нет доступных вакансий
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentVacancies.map((vacancy) => (
                <motion.div
                  key={vacancy.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <VacancyCard
                    id={String(vacancy.id)}
                    job={vacancy.title || vacancy.experience || "No experience specified"}
                    company={vacancy.city}
                    location={vacancy.city}
                    salary={
                      vacancy.salary ? `$${vacancy.salary}` : "Not specified"
                    }
                    postedAt={vacancy.createdAt ? new Date(vacancy.createdAt).toLocaleDateString() : 'N/A'}
                    tags={vacancy.skills || []}
                    date={vacancy.createdAt ? new Date(vacancy.createdAt).toLocaleDateString() : 'N/A'}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default HomePage;
