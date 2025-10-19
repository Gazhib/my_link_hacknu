export default function AuthInput({
  name,
  type = "text",
  placeholder,
  label,
  value,
  onChange,
}: {
  name: string;
  type?: string;
  placeholder?: string;
  label: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 justify-center items-center w-full">
      <label className="text-[14px]">{label}</label>
      <input
        className="px-[20px] py-[10px] w-[70%] border-[1px] border-gray-300 rounded-[4px]"
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
