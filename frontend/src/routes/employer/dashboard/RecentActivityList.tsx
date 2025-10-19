import { useNavigate } from "react-router-dom";

interface RecentActivity {
  _id: string;
  userId: string;
  createdAt: string;
}

interface RecentActivityListProps {
  applications: RecentActivity[];
}

export default function RecentActivityList({ applications }: RecentActivityListProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (applications.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Последняя активность</h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app._id} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Новый отклик от кандидата</p>
                  <p className="text-sm text-gray-500 mt-1">{formatDate(app.createdAt)}</p>
                </div>
                <button
                  onClick={() => navigate(`/employer/candidates/${app._id}`)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-semibold cursor-pointer"
                >
                  Просмотреть
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}