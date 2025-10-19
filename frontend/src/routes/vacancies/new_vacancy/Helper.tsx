export default function Helper() {
  return (
    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex gap-3">
        <svg
          className="w-6 h-6 text-blue-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Советы по созданию вакансии:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Укажите конкретный город для привлечения местных кандидатов</li>
            <li>
              Добавьте подробные требования для лучшего подбора кандидатов
            </li>
            <li>Укажите зарплату, чтобы привлечь больше откликов</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
