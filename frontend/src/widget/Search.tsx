import { useRef, useState } from "react";

type SearchProps = {
  onSearch?: (filters: {
    q: string;
    city: string;
    minSalary?: number;
    maxSalary?: number;
  }) => void;
};

export default function Search({ onSearch }: SearchProps) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    onSearch?.({
      q: query,
      city,
      minSalary: minSalary ? Number(minSalary) : undefined,
      maxSalary: maxSalary ? Number(maxSalary) : undefined,
    });
  };

  return (
    <div className="w-full space-y-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="w-full"
      >
        <div className="relative w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm8.65 15.24-3.52-3.52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск вакансий..."
            className="w-full h-full rounded-[8px] border border-gray-300 pl-10 pr-9 py-[10px] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {query && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Город"
            className="rounded-[8px] border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value)}
            placeholder="Мин. зарплата"
            className="rounded-[8px] border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={maxSalary}
            onChange={(e) => setMaxSalary(e.target.value)}
            placeholder="Макс. зарплата"
            className="rounded-[8px] border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded-[8px] hover:bg-blue-500 font-medium"
        >
          Искать
        </button>
      </form>
    </div>
  );
}
