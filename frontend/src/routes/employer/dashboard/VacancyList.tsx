import { useNavigate } from "react-router-dom";

interface VacancyWithApplications {
  _id: string;
  city: string;
  salary?: number;
  experience?: string;
  createdAt: string | undefined;
  applicationCount: number;
  recentApplications: ApplicationWithSummary[];
}

interface ApplicationWithSummary {
  _id: string;
  userId: string;
  createdAt: string;
  summary?: string;
}

interface VacancyListProps {
  vacancies: VacancyWithApplications[];
}

export default function VacancyList({ vacancies }: VacancyListProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const extractShortSummary = (summary: string | undefined) => {
    if (!summary) return "Нет резюме";

    const lines = summary.split("\n").filter((line) => line.trim());
    const firstMeaningfulLine = lines.find(
      (line) => line.length > 20 && !line.includes("Итог")
    );

    if (firstMeaningfulLine && firstMeaningfulLine.length > 150) {
      return firstMeaningfulLine.substring(0, 150) + "...";
    }

    return firstMeaningfulLine || summary.substring(0, 150) + "...";
  };

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Ваши вакансии</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {vacancies.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            У вас пока нет вакансий. Создайте первую!
          </div>
        ) : (
          vacancies.map((vacancy) => (
            <div
              key={vacancy._id}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Вакансия в {vacancy.city}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {vacancy.salary && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {vacancy.salary.toLocaleString("ru-RU")} ₽
                      </span>
                    )}
                    {vacancy.experience && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {vacancy.experience}
                      </span>
                    )}
                    <span className="text-gray-400">
                      Опубликовано: {vacancy.createdAt ? formatDate(vacancy.createdAt) : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {vacancy.applicationCount}
                    </div>
                    <div className="text-xs text-gray-500">откликов</div>
                  </div>
                  <button
                    onClick={() => navigate(`/vacancies/${vacancy._id}`)}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-sm cursor-pointer"
                  >
                    Подробнее →
                  </button>
                </div>
              </div>

              {vacancy.recentApplications.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Последние отклики:
                  </h4>
                  <div className="space-y-2">
                    {vacancy.recentApplications.map((app) => (
                      <div
                        key={app._id}
                        className="bg-gray-50 rounded-lg p-3 text-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              Кандидат {app.userId.substring(0, 8)}...
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(app.createdAt)}
                            </div>
                            {app.summary && (
                              <div className="mt-2 text-xs text-gray-600 bg-white rounded p-2 border border-gray-200">
                                <span className="font-semibold text-green-600">
                                  AI Резюме:{" "}
                                </span>
                                {extractShortSummary(app.summary)}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              navigate(`/employer/candidates/${app._id}`)
                            }
                            className="ml-3 text-blue-600 hover:text-blue-700 text-xs font-semibold whitespace-nowrap cursor-pointer"
                          >
                            Детали →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}