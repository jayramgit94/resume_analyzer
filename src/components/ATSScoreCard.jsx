export default function ATSScoreCard({ score }) {
  const color =
    score >= 76
      ? "text-green-600 border-green-400"
      : score >= 51
        ? "text-yellow-500 border-yellow-400"
        : "text-red-500 border-red-400";
  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center border">
      <div className={`text-4xl font-bold ${color}`}>{score ?? "--"}</div>
      <div className="text-gray-500 mt-2">ATS Score</div>
    </div>
  );
}
