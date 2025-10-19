export default function Requirements({
  requirementInput,
  setRequirementInput,
  handleAddRequirement,
}: {
  requirementInput: string;
  setRequirementInput: (value: string) => void;
  handleAddRequirement: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        id="requirements"
        value={requirementInput}
        onChange={(e) => setRequirementInput(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAddRequirement();
          }
        }}
        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        placeholder="Добавьте требование и нажмите Enter или кнопку"
      />
      <button
        type="button"
        onClick={handleAddRequirement}
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        Добавить
      </button>
    </div>
  );
}
