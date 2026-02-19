import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ATSScoreCard from "../components/ATSScoreCard";
import AnalysisSections from "../components/AnalysisSections";
import InterviewQuestions from "../components/InterviewQuestions";
import { useAuth } from "../context/AuthContext";
import { deleteHistory, getHistory, getHistoryDetail } from "../services/api";

export default function History() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const data = await getHistory(token);
      setItems(data);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  async function handleView(id) {
    setDetailLoading(true);
    try {
      const data = await getHistoryDetail(id, token);
      setSelected(data);
    } catch {
      setSelected(null);
    }
    setDetailLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this analysis?")) return;
    try {
      await deleteHistory(id, token);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      // ignore
    }
  }

  function scoreColor(score) {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-500";
  }

  if (selected) {
    const r = selected.result || {};
    const analysis = {
      strengths: r.strengths || [],
      weaknesses: r.weaknesses || [],
      missing_keywords: r.missing_keywords || [],
      suggestions: r.suggestions || [],
      raw: r.ai_analysis || "",
    };
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-white py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setSelected(null)}
            className="text-blue-600 hover:underline mb-4 inline-flex items-center gap-1"
          >
            ← Back to History
          </button>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            {selected.filename}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {new Date(selected.created_at).toLocaleString()}
          </p>
          <ATSScoreCard score={selected.score} />
          <div className="mt-4">
            <AnalysisSections analysis={analysis} />
          </div>
          {r.hr_questions?.length > 0 && (
            <InterviewQuestions questions={r.hr_questions} />
          )}
          {r.tips?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6 mt-6">
              <div className="font-semibold text-purple-600 mb-2 flex items-center gap-2">
                <span>📋</span> Tips
              </div>
              <ul className="list-disc ml-6 text-gray-700 space-y-1">
                {r.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-700">Resume History</h1>
          <Link
            to="/"
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            ← Analyze New
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg mb-2">No analyses yet</p>
            <Link to="/" className="text-blue-600 hover:underline">
              Upload your first resume
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {item.filename}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`text-lg font-bold mx-4 ${scoreColor(item.score)}`}
                >
                  {item.score}%
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(item.id)}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {detailLoading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-lg">Loading...</div>
          </div>
        )}
      </div>
    </div>
  );
}
