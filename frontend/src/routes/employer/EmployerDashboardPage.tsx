import { useEffect, useState } from "react";
import { vacancyService, type Vacancy } from "../../shared/api/vacancyService";
import {
  applicationService,
  type Application,
} from "../../shared/api/applicationService";
import { messageService } from "../../shared/api/messageService";
import StatsCard from "./dashboard/StatsCard";
import QuickActions from "./dashboard/QuickActions";
import VacancyList from "./dashboard/VacancyList";
import RecentActivityList from "./dashboard/RecentActivityList";

interface VacancyWithApplications extends Vacancy {
  _id: string;
  createdAt: string | undefined;
  applicationCount: number;
  recentApplications: ApplicationWithSummary[];
}

interface ApplicationWithSummary extends Application {
  _id: string;
  userId: string;
  createdAt: string;
  relevanceScore: number;
  mismatchReasons: string[];
  summaryText: string;
  summary?: string;
  candidateName?: string;
}

interface DashboardStats {
  totalVacancies: number;
  totalApplications: number;
  activeChats: number;
  completedChats: number;
}

export default function EmployerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVacancies: 0,
    totalApplications: 0,
    activeChats: 0,
    completedChats: 0,
  });
  const [vacancies, setVacancies] = useState<VacancyWithApplications[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentApplications, setRecentApplications] = useState<
    ApplicationWithSummary[]
  >([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Support both array and { items, total } shapes and filter out invalid vacancies
      const vacancyResponse = await vacancyService.list({ limit: 10 });
      const vacancyArray = Array.isArray(vacancyResponse)
        ? vacancyResponse
        : vacancyResponse?.items ?? [];
      const vacancyList: Vacancy[] = (vacancyArray as Vacancy[]).filter(
        (v) => v && typeof v.id !== "undefined" && v.id !== null
      );

      const vacanciesWithApps: VacancyWithApplications[] = await Promise.all(
        vacancyList.map(async (vacancy: Vacancy) => {
          const vacancyIdNum = Number(vacancy.id);
          if (!Number.isFinite(vacancyIdNum)) {
            // Skip entries without a valid numeric id
            return {
              ...vacancy,
              _id: String(vacancy.id ?? ""),
              createdAt: vacancy.createdAt || "",
              applicationCount: 0,
              recentApplications: [],
            } as VacancyWithApplications;
          }

          try {
            const appResponse = await applicationService.getApplicationsForVacancy(
              vacancyIdNum
            );

            const applications = Array.isArray(appResponse) ? appResponse : [];

            const appsWithSummaries = await Promise.all(
              applications.slice(0, 3).map(async (app: Application) => {
                try {
                  const messages = await messageService.getMessages(app.id);
                  const summaryMessage = messages.find(
                    (msg) => !msg.userId && msg.body.includes("Итог")
                  );

                  return {
                    ...app,
                    _id: String(app.id),
                    userId: String(app.vacancy_id),
                    createdAt: app.created_at || "",
                    relevanceScore: app.relevance_score || 0,
                    mismatchReasons: app.mismatch_reasons
                      ? [app.mismatch_reasons]
                      : [],
                    summaryText: app.summary_text || "",
                    summary: summaryMessage?.body || undefined,
                  };
                } catch (error) {
                  return {
                    ...app,
                    _id: String(app.id),
                    userId: String(app.vacancy_id),
                    createdAt: app.created_at || "",
                    relevanceScore: app.relevance_score || 0,
                    mismatchReasons: app.mismatch_reasons
                      ? [app.mismatch_reasons]
                      : [],
                    summaryText: app.summary_text || "",
                  };
                }
              })
            );

            return {
              ...vacancy,
              _id: String(vacancy.id),
              createdAt: vacancy.createdAt || "",
              applicationCount: applications.length,
              recentApplications: appsWithSummaries,
            };
          } catch (error) {
            return {
              ...vacancy,
              _id: String(vacancy.id),
              createdAt: vacancy.createdAt || "",
              applicationCount: 0,
              recentApplications: [],
            };
          }
        })
      );

      setVacancies(vacanciesWithApps);

      const totalApps = vacanciesWithApps.reduce(
        (sum, v) => sum + v.applicationCount,
        0
      );

      const allRecentApps = vacanciesWithApps.flatMap(
        (v) => v.recentApplications
      );
      let activeChats = 0;
      let completedChats = 0;

      await Promise.all(
        allRecentApps.map(async (app) => {
          try {
            const session = await messageService.getChatSession(app._id);
            if (session.state === "closed") {
              completedChats++;
            } else if (session.exists) {
              activeChats++;
            }
          } catch (error) {}
        })
      );

      setStats({
        totalVacancies: vacancyList.length,
        totalApplications: totalApps,
        activeChats,
        completedChats,
      });

      setRecentApplications(allRecentApps.slice(0, 5));
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Загрузка дашборда...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Панель работодателя
          </h1>
          <p className="text-gray-600 mt-2">
            Управление вакансиями и просмотр откликов кандидатов
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Всего вакансий"
            value={stats.totalVacancies}
            icon="briefcase"
            color="blue"
          />
          <StatsCard
            title="Всего откликов"
            value={stats.totalApplications}
            icon="users"
            color="green"
          />
          <StatsCard
            title="Активные чаты"
            value={stats.activeChats}
            icon="chat"
            color="yellow"
          />
          <StatsCard
            title="Завершенные чаты"
            value={stats.completedChats}
            icon="check"
            color="purple"
          />
        </div>

        <QuickActions />

        <VacancyList vacancies={vacancies} />

        <RecentActivityList applications={recentApplications} />
      </div>
    </div>
  );
}
