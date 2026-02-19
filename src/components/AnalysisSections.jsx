function Section({ title, items, icon, color }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-4">
      <div className={`flex items-center font-semibold mb-1 ${color}`}>
        {icon}
        <span className="ml-2">{title}</span>
      </div>
      <ul className="list-disc ml-7 text-gray-700">
        {items.map((item, i) => (
          <li key={i} className="mb-1">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnalysisSections({ analysis }) {
  if (!analysis) return null;
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <Section
        title="Strengths"
        items={analysis.strengths}
        icon={<span>✔️</span>}
        color="text-green-600"
      />
      <Section
        title="Weaknesses"
        items={analysis.weaknesses}
        icon={<span>⚠️</span>}
        color="text-red-500"
      />
      <Section
        title="Missing Keywords"
        items={analysis.missing_keywords}
        icon={<span>🔑</span>}
        color="text-yellow-500"
      />
      <Section
        title="Improvement Suggestions"
        items={analysis.suggestions}
        icon={<span>💡</span>}
        color="text-blue-500"
      />
    </div>
  );
}
