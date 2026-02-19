export default function KPICard({
  icon,
  label,
  value,
  color = "text-blue-600",
  sub,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex items-start gap-4 hover:shadow-md transition-shadow duration-200">
      <div
        className={`p-3 rounded-xl bg-opacity-10 ${color.replace("text-", "bg-")}/10`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {label}
        </p>
        <p className={`text-2xl font-bold ${color} dark:${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
