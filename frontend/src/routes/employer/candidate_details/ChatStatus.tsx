interface ChatStatusProps {
  chatState: "open" | "closed";
}

export default function ChatStatus({ chatState }: ChatStatusProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Статус чата</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Состояние:</span>
          <span
            className={`font-semibold ${
              chatState === "closed" ? "text-green-600" : "text-yellow-600"
            }`}
          >
            {chatState === "closed" ? "Завершен" : "В процессе"}
          </span>
        </div>
        <div className="text-sm text-gray-500 mt-4">
          {chatState === "closed"
            ? "ИИ-ассистент завершил интервью с кандидатом. Просмотрите резюме беседы."
            : "ИИ-ассистент в данный момент общается с кандидатом. Вы можете наблюдать за чатом в реальном времени."}
        </div>
      </div>
    </div>
  );
}