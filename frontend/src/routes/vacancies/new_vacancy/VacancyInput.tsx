export default function VacancyInput({
  onChange,
  label,
  placeholder,
  value,
  id,
  text,
  type,
}: {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  placeholder?: string;
  value?: string | number;
  id: string;
  text?: string;
  type?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-700 mb-2"
      >
        {label}
      </label>
      <input
        type={type || "text"}
        id={id}
        value={value}
        onChange={(e) => onChange(e)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        placeholder={placeholder}
      />
      <p className="text-sm text-gray-500 mt-1">{text}</p>
    </div>
  );
}
