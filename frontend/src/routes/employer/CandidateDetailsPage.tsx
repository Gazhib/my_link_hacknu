import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatWidget from "../../entities/chat/ChatWidget";
import {
  applicationService,
  type Application,
} from "../../shared/api/applicationService";
import { vacancyService, type Vacancy } from "../../shared/api/vacancyService";
import { messageService } from "../../shared/api/messageService";
import ActionButtons from "./candidate_details/ActionButtons";
import ApplicationInfo from "./candidate_details/ApplicationInfo";
import VacancyInfo from "./candidate_details/VacancyInfo";
import ChatSummary from "./candidate_details/ChatSummary";
import ChatStatus from "./candidate_details/ChatStatus";
import ChatTip from "./candidate_details/ChatTip";

interface ApplicationDetails extends Application {
  _id: string;
  userId: string;
  createdAt: string;
  relevanceScore: number;
  mismatchReasons: string[];
  summaryText: string;
  vacancy?: Vacancy;
  chatSummary?: string;
  chatState?: "open" | "closed";
}

export default function CandidateDetailsPage() {
  const { candidate_id } = useParams<{ candidate_id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidate_id) {
      setError("ID заявки не найден");
      setIsLoading(false);
      return;
    }

    loadApplicationDetails();
  }, [candidate_id]);

  const loadApplicationDetails = async () => {
    if (!candidate_id) return;

    try {
      setIsLoading(true);
      setError(null);

      const myVacancies = await vacancyService.list({ limit: 100 });
      const vacancyArray = Array.isArray(myVacancies)
        ? (myVacancies as Vacancy[])
        : (myVacancies?.items as Vacancy[]) ?? [];

      let foundApplication: Application | null = null;
      let foundVacancy: Vacancy | null = null;

      for (const vacancy of vacancyArray) {
        const idNum = Number(vacancy.id);
        if (!Number.isFinite(idNum)) continue;

        const applicationsResponse = await applicationService.getApplicationsForVacancy(
          idNum
        );

        const applications = Array.isArray(applicationsResponse)
          ? applicationsResponse
          : [];

        const app = applications.find(
          (a: Application) => String(a.id) === candidate_id
        );
        if (app) {
          foundApplication = app;
          foundVacancy = vacancy;
          break;
        }
      }

      if (!foundApplication || !foundVacancy) {
        setError("Заявка не найдена");
        setIsLoading(false);
        return;
      }

      let chatSummary = undefined;
      let chatState: "open" | "closed" = "open";

      try {
        const session = await messageService.getChatSession(candidate_id);
        chatState = session.state;

        const messages = await messageService.getMessages(candidate_id);
        const summaryMessage = messages.find(
          (msg) => !msg.userId && msg.body.includes("Итог")
        );

        if (summaryMessage) {
          chatSummary = summaryMessage.body;
        }
      } catch (err: any) {
        console.error("Failed to load chat data:", err);
        if (err.message?.includes("permission")) {
          console.error("Permission error: User may not have employer role");
        }
      }

      setApplication({
        ...foundApplication,
        _id: String(foundApplication.id),
        userId: String(foundApplication.vacancy_id),
        createdAt: foundApplication.created_at || "",
        relevanceScore: foundApplication.relevance_score || 0,
        mismatchReasons: foundApplication.mismatch_reasons
          ? [foundApplication.mismatch_reasons]
          : [],
        summaryText: foundApplication.summary_text || "",
        vacancy: foundVacancy,
        chatSummary,
        chatState,
      });
    } catch (err) {
      console.error("Failed to load application details:", err);
      setError("Не удалось загрузить данные заявки");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Загрузка данных кандидата...</div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">
            {error || "Заявка не найдена"}
          </div>
          <button
            onClick={() => navigate("/employer/dashboard")}
            className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
          >
            ← Вернуться к дашборду
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate("/employer/dashboard")}
            className="text-blue-600 hover:text-blue-700 font-semibold mb-4 flex items-center gap-2 cursor-pointer"
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
            Назад к дашборду
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Детали заявки</h1>
          <p className="text-gray-600 mt-2">
            Просмотр информации о кандидате и общение с ИИ-ассистентом
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ApplicationInfo
              applicationId={application._id}
              userId={application.userId}
              createdAt={application.createdAt}
              chatState={application.chatState || "open"}
              relevanceScore={application.relevanceScore}
              mismatchReasons={application.mismatchReasons}
              summaryText={application.summaryText}
            />

            {application.vacancy && (
              <VacancyInfo
                vacancy={application.vacancy}
                applicationId={application._id}
                relevanceScore={application.relevanceScore}
                mismatchReasons={application.mismatchReasons}
                summaryText={application.summaryText}
              />
            )}

            {application.chatSummary && (
              <ChatSummary summary={application.chatSummary} />
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <ActionButtons
              applicationId={application._id}
              onStatusChange={loadApplicationDetails}
            />

            <ChatStatus chatState={application.chatState || "open"} />

            <ChatTip />
          </div>
        </div>
      </div>

      {candidate_id && <ChatWidget applicationId={candidate_id} />}
    </div>
  );
}
