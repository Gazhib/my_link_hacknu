export default function VacancyTag({ t }: { t: string }) {
  return (
    <span
      key={t}
      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
    >
      {t}
    </span>
  );
}
