export default function ProgressBar({
  label,
  value,
  max = 100,
  color = "bg-blue-500",
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-300 truncate">
          {label}
        </span>
        <span className="text-gray-500 dark:text-gray-400 font-medium">
          {value}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
