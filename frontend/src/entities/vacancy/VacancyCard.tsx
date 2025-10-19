import { Link } from "react-router-dom";
import VacancyTag from "./VacancyTag";

type VacancyCardProps = {
  id?: string | number;
  job?: string;
  company?: string;
  location?: string;
  salary?: string;
  postedAt?: string;
  tags?: string[];
  date?: string;
  onClick?: () => void;
};

export default function VacancyCard({
  id = "1",
  job = "Проверка",
  company = "Проверка",
  location = "Проверка",
  salary = "Проверка",
  postedAt = "Проверка",
  tags = ["Проверка", "Проверка", "Проверка"],
  date = "04.08.2025",
  onClick = () => {},
}: VacancyCardProps) {
  return (
    <article className="w-[80%] mx-auto bg-white border border-gray-200 rounded-[8px] p-4 shadow-sm">
      <header className="flex justify-between items-start gap-4">
        <div>
          <Link
            to={`/vacancies/${id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600"
          >
            {job}
          </Link>
          <div className="text-sm text-gray-600 mt-1">
            {company} • {location}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">{postedAt}</div>
          <div className="text-sm font-medium text-gray-900 mt-2">{salary}</div>
        </div>
      </header>

      <section className="mt-4 flex flex-wrap gap-2">
        {tags.map((t) => (
          <VacancyTag key={t} t={t} />
        ))}
      </section>

      <footer className="mt-4 flex justify-between items-center">
        <h1 className="text-sm text-gray-400">Опубликовано {date}</h1>
        <button onClick={onClick} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 text-sm cursor-pointer">
          Предпросмотр
        </button>
      </footer>
    </article>
  );
}
