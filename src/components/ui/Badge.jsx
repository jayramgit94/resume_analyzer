export function Badge({ type }) {
  const config = {
    gold: {
      label: "Gold",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-400",
      icon: "🏆",
    },
    silver: {
      label: "Silver",
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-600 dark:text-gray-300",
      icon: "🥈",
    },
    bronze: {
      label: "Bronze",
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-700 dark:text-orange-400",
      icon: "🥉",
    },
  };
  const c = config[type] || config.bronze;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}
    >
      {c.icon} {c.label}
    </span>
  );
}

export function scoreBadge(score) {
  if (score >= 75) return "gold";
  if (score >= 50) return "silver";
  return "bronze";
}
