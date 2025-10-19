interface ChatSummaryProps {
  summary: string;
}

export default function ChatSummary({ summary }: ChatSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900">Резюме ИИ-интервью</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="whitespace-pre-wrap text-gray-800">{summary}</div>
        </div>
      </div>
    </div>
  );
}