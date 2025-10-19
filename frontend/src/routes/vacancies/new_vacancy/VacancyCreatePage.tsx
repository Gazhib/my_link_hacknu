import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  vacancyService,
  type CreateVacancyData,
} from "../../../shared/api/vacancyService";
import Helper from "./Helper";
import VacancyInput from "./VacancyInput";
import Requirements from "./Requirements";

export default function VacancyCreatePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateVacancyData>({
    title: "",
    description: "",
    city: "",
    salary: undefined,
    experience: "",
    requirements: [],
  });

  const [requirementInput, setRequirementInput] = useState("");

  const addRequirement = () => {
    if (requirementInput.trim()) {
      setFormData({
        ...formData,
        requirements: [...(formData.requirements || []), requirementInput.trim()],
      });
      setRequirementInput("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData({
      ...formData,
      requirements: (formData.requirements || []).filter((_: string, i: number) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.city.trim()) {
      setError("Title and city are required");
      return;
    }

    if ((formData.requirements || []).length === 0) {
      setError("At least one requirement is needed");
      return;
    }

    try {
      setError(null);
      // Map UI fields to backend schema
      const payload: CreateVacancyData = {
        title: formData.title,
        city: formData.city,
        description: formData.description || "",
        employment_type: "full-time", // default; consider exposing as a field
        min_experience_years: Number.parseInt(String(formData.experience || "0"), 10) || 0,
        skills: formData.requirements || [],
        ...(formData.salary != null && formData.salary !== undefined
          ? { salary_min: formData.salary, salary_max: formData.salary }
          : {}),
      };

      const newVacancy = await vacancyService.create(payload);
      navigate(`/vacancies/${newVacancy.id}`);
    } catch (err: any) {
      // Format FastAPI validation errors (422) to human-readable text
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        const msg = detail
          .map((d: any) => {
            const loc = Array.isArray(d?.loc) ? d.loc.join(".") : String(d?.loc ?? "");
            const m = d?.msg || "Invalid";
            return loc ? `${loc}: ${m}` : m;
          })
          .join("\n");
        setError(msg || "Failed to create vacancy");
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Failed to create vacancy");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2 cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Назад
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Создать вакансию</h1>
          <p className="text-gray-600 mt-2">
            Заполните информацию о новой вакансии
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg whitespace-pre-line">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            <VacancyInput
              label="Название вакансии"
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Например: Frontend разработчик"
            />

            <VacancyInput
              label="Город"
              id="city"
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              placeholder="Например: Москва"
            />

            <VacancyInput
              label="Зарплата (опционально)"
              id="salary"
              type="number"
              value={formData.salary || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salary: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />

            <VacancyInput
              label="Опыт работы (опционально)"
              id="experience"
              value={formData.experience || ""}
              onChange={(e) =>
                setFormData({ ...formData, experience: e.target.value })
              }
            />

            <div>
              <label
                htmlFor="requirements"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Требования к вакансии <span className="text-red-500">*</span>
              </label>

              {(formData.requirements || []).length > 0 && (
                <div className="mb-3 space-y-2">
                  {(formData.requirements || []).map((req: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg"
                    >
                      <span className="flex-1 text-sm text-gray-800">
                        {req}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Requirements
                requirementInput={requirementInput}
                setRequirementInput={setRequirementInput}
                handleAddRequirement={addRequirement}
              />
              <p className="text-sm text-gray-500 mt-2">
                Добавьте требования к кандидату (навыки, образование, опыт и
                т.д.)
              </p>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end rounded-b-lg">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Создать вакансию
            </button>
          </div>
        </form>

        <Helper />
      </div>
    </div>
  );
}
