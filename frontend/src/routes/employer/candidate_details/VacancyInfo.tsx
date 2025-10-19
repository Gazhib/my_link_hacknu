import { Link } from "react-router-dom";
import type { Vacancy } from "../../../shared/api";

interface VacancyInfoProps {
  vacancy: Vacancy;
  applicationId: string;
  relevanceScore?: number;
  mismatchReasons?: string[];
  summaryText?: string;
}

export default function VacancyInfo({ 
  vacancy, 
  applicationId, 
  relevanceScore, 
  mismatchReasons, 
  summaryText 
}: VacancyInfoProps) {
  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score?: number) => {
    if (!score) return 'bg-gray-100';
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Вакансия</h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {/* AI Score Section */}
          {relevanceScore !== undefined && (
            <div className={`p-4 rounded-lg ${getScoreBgColor(relevanceScore)} border border-gray-200`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Оценка AI</p>
                <span className={`text-3xl font-bold ${getScoreColor(relevanceScore)}`}>
                  {relevanceScore}/100
                </span>
              </div>
              {summaryText && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Резюме:</p>
                  <p className="text-sm text-gray-600">{summaryText}</p>
                </div>
              )}
              {mismatchReasons && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Несоответствия:</p>
                  <p className="text-sm text-gray-600">{mismatchReasons}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-sm text-gray-500">Город</p>
            <p className="text-gray-900 text-lg font-semibold mt-1">{vacancy.city}</p>
          </div>
          <div className="flex gap-6">
            {vacancy.salary && (
              <div>
                <p className="text-sm text-gray-500">Зарплата</p>
                <p className="text-gray-900 font-semibold mt-1">
                  {vacancy.salary.toLocaleString("ru-RU")} ₽
                </p>
              </div>
            )}
            {vacancy.experience && (
              <div>
                <p className="text-sm text-gray-500">Опыт работы</p>
                <p className="text-gray-900 mt-1">{vacancy.experience}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Требования</p>
            <div className="flex flex-wrap gap-2">
              {vacancy.requirements?.map((req: string, idx: number) => (
                <span
                  key={idx}
                  className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                >
                  {req}
                </span>
              ))}
            </div>
          </div>
          <Link
            to={`/vacancies/${applicationId}`}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm cursor-pointer"
          >
            Подробнее о вакансии →
          </Link>
        </div>
      </div>
    </div>
  );
}