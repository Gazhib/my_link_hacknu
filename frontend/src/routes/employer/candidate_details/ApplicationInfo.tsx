interface ApplicationInfoProps {
  applicationId: string;
  userId: string;
  createdAt: string;
  chatState: "open" | "closed";
  relevanceScore?: number;
  mismatchReasons?: string[];
  summaryText?: string;
}

export default function ApplicationInfo({
  applicationId,
  userId,
  createdAt,
  chatState,
  relevanceScore,
  mismatchReasons,
  summaryText,
}: ApplicationInfoProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Информация о заявке</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">ID заявки</p>
            <p className="text-gray-900 font-mono text-sm mt-1">{applicationId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Дата подачи</p>
            <p className="text-gray-900 mt-1">{formatDate(createdAt)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ID кандидата</p>
            <p className="text-gray-900 font-mono text-sm mt-1">{userId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Статус чата</p>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  chatState === "closed"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {chatState === "closed" ? "Завершен" : "Активен"}
              </span>
            </div>
          </div>
        </div>

        {(relevanceScore !== undefined || summaryText || mismatchReasons) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Анализ ИИ</h3>
            
            {relevanceScore !== undefined && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Релевантность</p>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2.5 mr-3">
                    <div
                      className={`h-2.5 rounded-full ${
                        relevanceScore >= 70
                          ? "bg-green-600"
                          : relevanceScore >= 40
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${relevanceScore}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {relevanceScore}%
                  </span>
                </div>
              </div>
            )}

            {summaryText && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Краткое резюме</p>
                <p className="text-gray-900 text-sm leading-relaxed">{summaryText}</p>
              </div>
            )}

            {mismatchReasons && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Несоответствия</p>
                <ul className="text-gray-900 text-sm leading-relaxed list-disc list-inside">
                  {mismatchReasons.map((reason: string, idx: number) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}