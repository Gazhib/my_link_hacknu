import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PreviewCard from "../../entities/vacancy/PreviewCard";
import VacancyCard from "../../entities/vacancy/VacancyCard";
import Search from "../../widget/Search";
import { vacancyService, type Vacancy } from "../../shared/api/vacancyService";

export default function VacancyListPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [previewCard, setPreviewCard] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchFilters, setSearchFilters] = useState({
    q: "",
    city: "",
    minSalary: undefined as number | undefined,
    maxSalary: undefined as number | undefined,
  });

  const fetchVacancies = async () => {
    try {
      setLoading(true);
      const response = await vacancyService.list({
        ...searchFilters,
        limit: 20,
        sort: "-createdAt",
      });
      const vacancyList = Array.isArray(response) ? response : response.items || [];
      setVacancies(vacancyList);
      if (vacancyList.length > 0 && !previewCard) {
        setPreviewCard(vacancyList[0]);
      }
    } catch (err: any) {
      setError(err.response?.data || "Failed to load vacancies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacancies();
  }, [searchFilters]);

  useEffect(() => {
    vacancyService.list().then((response) => {
      const vacancyList = Array.isArray(response) ? response : response.items || [];
      setVacancies(vacancyList);
      if (vacancyList.length > 0 && !previewCard) {
        setPreviewCard(vacancyList[0]);
      }
    });
  }, []);

  const handleSearch = (filters: {
    q: string;
    city: string;
    minSalary?: number;
    maxSalary?: number;
  }) => {
    setSearchFilters({
      q: filters.q,
      city: filters.city,
      minSalary: filters.minSalary,
      maxSalary: filters.maxSalary,
    });
  };

  return (
    <main className="w-full h-full items-center flex flex-col gap-4 p-4">
      <section className="w-[60%]">
        <Search onSearch={handleSearch} />
      </section>
      {loading ? (
        <div className="text-center py-8">Loading vacancies...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">{error}</div>
      ) : vacancies.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No vacancies found</div>
      ) : (
        <section className="w-full flex flex-row gap-8">
          <section className="w-full flex flex-col gap-4">
            {vacancies.map((v) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <li
                  key={v.id}
                  className={`p-4 border-b hover:bg-gray-50 transition-colors cursor-pointer ${
                    previewCard?.id === v.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setPreviewCard(v)}
                >
                  <VacancyCard
                    id={v.id.toString()}
                    job={v.title || v.experience || "No experience specified"}
                    company={v.city}
                    location={v.city}
                    salary={v.salary ? `$${v.salary}` : "Not specified"}
                    postedAt={new Date(v.createdAt || '').toLocaleDateString()}
                    tags={v.skills || []}
                    date={new Date(v.createdAt || '').toLocaleDateString()}
                  />
                </li>
              </motion.div>
            ))}
          </section>
          <section className="w-full flex overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {previewCard ? (
                <motion.div
                  key={previewCard.id}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  transition={{ duration: 0.28 }}
                  className="w-full"
                >
                  <div
                    key={previewCard.id}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm p-6"
                  >
                    <PreviewCard
                      location={previewCard.city}
                      experience={previewCard.experience || "Not specified"}
                      description={previewCard.description || ""}
                      tags={previewCard.skills || []}
                      id={previewCard.id.toString()}
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        </section>
      )}
    </main>
  );
}
