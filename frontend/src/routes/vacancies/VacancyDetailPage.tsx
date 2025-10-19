import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import ChatWidget from "../../entities/chat/ChatWidget";
import VacancyTag from "../../entities/vacancy/VacancyTag";
import { vacancyService, type Vacancy } from "../../shared/api/vacancyService";
import { applicationService, type ApplicationListItem } from "../../shared/api/applicationService";
import { userService } from "../../shared/api/userService";

const VacancyDetailPage: React.FC = () => {
  const { vacancy_id } = useParams<{ vacancy_id: string }>();
  const navigate = useNavigate();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [userApplication, setUserApplication] = useState<ApplicationListItem | null>(null);
  const [, setCurrentUserId] = useState<number>(0);
  const [chatToken, setChatToken] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      if (!vacancy_id) return;
      
      try {
        setLoading(true);
        const vacancyData = await vacancyService.getById(vacancy_id);
        setVacancy(vacancyData);

        try {
          const user = await userService.getMe();
          setCurrentUserId(user.id);

          const applications = await applicationService.getMyApplications();
          const existingApp = applications.find(app => app.vacancy_id === Number(vacancy_id));
          if (existingApp) {
            setUserApplication(existingApp);
          }
        } catch (userErr) {
          console.log("Could not fetch user applications");
        }
      } catch (err: any) {
        setError(err.response?.data || "Failed to load vacancy");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vacancy_id]);

  const handleApply = async () => {
    if (!vacancy_id) return;
    
    try {
      setApplying(true);
      setApplicationMessage("");
      
      const newApplication = await applicationService.apply(Number(vacancy_id));
      
      setChatToken(newApplication.chat_token);
      
      const applications = await applicationService.getMyApplications();
      const createdApp = applications.find(app => app.id === newApplication.application_id);
      if (createdApp) {
        setUserApplication(createdApp);
      }
      
      setApplicationMessage("Application submitted successfully!");
    } catch (err: any) {
      if (err.response?.status === 409) {
        setApplicationMessage("You have already applied to this vacancy");
      } else if (err.response?.status === 400) {
        setApplicationMessage(err.response?.data?.detail || "Please upload your CV in your profile before applying");
      } else {
        setApplicationMessage(err.response?.data?.detail || "Failed to apply");
      }
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full max-w-5xl mx-auto p-6 bg-white rounded-[8px]">
        <div className="text-center py-8">Loading vacancy details...</div>
      </main>
    );
  }

  if (error || !vacancy) {
    return (
      <main className="w-full max-w-5xl mx-auto p-6 bg-white rounded-[8px]">
        <div className="text-center py-8 text-red-600">{error || "Vacancy not found"}</div>
        <button
          onClick={() => navigate("/vacancies")}
          className="mx-auto block mt-4 text-blue-600 hover:underline"
        >
          Back to vacancies
        </button>
      </main>
    );
  }

  return (
    <main className="w-full max-w-5xl mx-auto p-6 bg-white rounded-[8px] ">
      {userApplication && (
        <ChatWidget applicationId={userApplication.id.toString()} chatToken={chatToken} />
      )}
      <section className="flex">
        <div className="flex-1">
          <h1 className="mt-3 text-2xl font-bold">{vacancy.title || "Position"}</h1>
          <div className="text-sm text-gray-600 mb-3">
            {vacancy.city} • {vacancy.employment_type || "Full-time"}
          </div>
          <div className="flex flex-wrap gap-2">
            {vacancy.skills?.map((t: string) => (
              <VacancyTag key={t} t={t}></VacancyTag>
            ))}
          </div>

          <div className="mt-6">
            <p><strong>Experience:</strong> {vacancy.min_experience_years ? `${vacancy.min_experience_years} years` : "Not specified"}</p>
            <p className="mt-2">
              <strong>Salary:</strong> {
                vacancy.salary_min && vacancy.salary_max 
                  ? `${vacancy.currency || '$'}${vacancy.salary_min} - ${vacancy.currency || '$'}${vacancy.salary_max}`
                  : vacancy.salary_min 
                    ? `${vacancy.currency || '$'}${vacancy.salary_min}+`
                    : "Not specified"
              }
            </p>
            {vacancy.education_level && (
              <p className="mt-2">
                <strong>Education:</strong> {vacancy.education_level}
              </p>
            )}
            {vacancy.languages && vacancy.languages.length > 0 && (
              <p className="mt-2">
                <strong>Languages:</strong> {vacancy.languages.join(", ")}
              </p>
            )}
            {vacancy.description && (
              <p className="mt-4">
                <strong>Description:</strong>
                <br />
                {vacancy.description}
              </p>
            )}
            {vacancy.skills && vacancy.skills.length > 0 && (
              <>
                <p className="mt-4">
                  <strong>Required Skills:</strong>
                </p>
                <ul className="list-disc list-inside mt-2">
                  {vacancy.skills.map((req: string, idx: number) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="mt-6">
            <button 
              onClick={handleApply}
              disabled={applying || !!userApplication}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 text-sm cursor-pointer disabled:opacity-50"
            >
              {userApplication ? "Already Applied" : applying ? "Applying..." : "Apply for this job"}
            </button>
            {applicationMessage && (
              <div className={`mt-2 text-sm ${applicationMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {applicationMessage}
              </div>
            )}
          </div>
        </div>

        <aside className="ml-6 w-[280px]">
          <div className="p-4 border border-gray-200 rounded-[8px] shadow-sm">
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Job summary</div>
            <div className="text-sm text-gray-700 space-y-2">
              <div>
                <strong>Type:</strong> {vacancy.employment_type || "Full-time"}
              </div>
              <div>
                <strong>Location:</strong> {vacancy.city}
              </div>
              <div>
                <strong>Salary:</strong> {
                  vacancy.salary_min && vacancy.salary_max 
                    ? `${vacancy.currency || '$'}${vacancy.salary_min} - ${vacancy.currency || '$'}${vacancy.salary_max}`
                    : vacancy.salary_min 
                      ? `${vacancy.currency || '$'}${vacancy.salary_min}+`
                      : "Not specified"
                }
              </div>
              {vacancy.skills && vacancy.skills.length > 0 && (
                <>
                  <div className="mt-4">
                    <strong>Skills:</strong>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {vacancy.skills.map((t: string) => (
                      <VacancyTag key={t} t={t}></VacancyTag>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
};

export default VacancyDetailPage;
