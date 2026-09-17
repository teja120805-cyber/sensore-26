export interface DefectPillOption {
  key: string;
  label: string;
  color?: string;
}

export default function DefectTypePills({
  options,
  active,
  onChange,
}: {
  options: DefectPillOption[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2 shadow-card">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            active === opt.key
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {opt.color && (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: active === opt.key ? "white" : opt.color }}
            />
          )}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
