import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AnimatedScore from "../components/ui/AnimatedScore";
import { Badge, scoreBadge } from "../components/ui/Badge";
import ProgressBar from "../components/ui/ProgressBar";
import SkeletonLoader from "../components/ui/SkeletonLoader";
import { useAuth } from "../context/AuthContext";
import {
  analyzeResume,
  deleteHistory,
  generateHRQuestions,
  getHistory,
  getHistoryDetail,
} from "../services/api";

/* ---------- tiny tab button ---------- */
function Tab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- section card wrapper ---------- */
function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export default function UserDashboard() {
  const { user, token } = useAuth();
  const fileInput = useRef();

  /* ---------- state ---------- */
  const [tab, setTab] = useState("analyze"); // analyze | results | history
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // current analysis
  const [hrQuestions, setHrQuestions] = useState([]);
  const [hrLoading, setHrLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  // history
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* ---------- load history on mount ---------- */
  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const data = await getHistory(token);
      setHistory(data);
    } catch {
      setHistory([]);
    }
    setHistoryLoading(false);
  }

  /* ---------- file handling ---------- */
  async function handleFile(file) {
    if (!file) return;
    setError("");
    setUploading(true);
    setResult(null);
    setHrQuestions([]);
    setFileName(file.name);
    try {
      const data = await analyzeResume(file, token);
      setResult(data);
      setTab("results");
      loadHistory(); // refresh history sidebar
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to analyze. Please try again.",
      );
    }
    setUploading(false);
  }

  /* ---------- HR questions ---------- */
  async function handleGenerateHR() {
    if (!result) return;
    setHrLoading(true);
    try {
      const data = await generateHRQuestions(
        result.ai_analysis || result.strengths?.join(", ") || "",
        token,
      );
      setHrQuestions(data.questions || []);
    } catch {
      setHrQuestions([]);
    }
    setHrLoading(false);
  }

  /* ---------- history detail ---------- */
  async function handleViewDetail(id) {
    setDetailLoading(true);
    try {
      const data = await getHistoryDetail(id, token);
      setSelectedDetail(data);
    } catch {
      setSelectedDetail(null);
    }
    setDetailLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this analysis?")) return;
    try {
      await deleteHistory(id, token);
      setHistory((prev) => prev.filter((i) => i.id !== id));
      if (selectedDetail?.id === id) setSelectedDetail(null);
    } catch {
      /* ignore */
    }
  }

  /* ---------- computed stats ---------- */
  const scores = history.map((h) => h.score);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const bestScore = scores.length ? Math.max(...scores) : 0;
  const improvement =
    scores.length >= 2 ? scores[0] - scores[scores.length - 1] : 0;

  /* chart data (newest-last for line chart) */
  const chartData = [...history].reverse().map((h, i) => ({
    name: `#${i + 1}`,
    score: h.score,
    date: new Date(h.created_at).toLocaleDateString(),
  }));

  /* score distribution for bar chart */
  const scoreBuckets = [
    { label: "0-25", min: 0, max: 25 },
    { label: "26-50", min: 26, max: 50 },
    { label: "51-75", min: 51, max: 75 },
    { label: "76-100", min: 76, max: 100 },
  ];
  const distData = scoreBuckets.map((b) => ({
    range: b.label,
    count: scores.filter((s) => s >= b.min && s <= b.max).length,
  }));
  const distColors = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

  /* ================================================================
   *  RENDER
   * ================================================================ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ---- Header ---- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Welcome, {user?.name || "User"} 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Upload a resume to get your ATS score, AI analysis &amp; interview
              prep.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge type={scoreBadge(bestScore)} />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Best: {bestScore}%
            </span>
          </div>
        </div>

        {/* ---- KPI row ---- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MiniKPI
            icon={<FileText className="w-5 h-5 text-blue-500" />}
            label="Total Analyses"
            value={history.length}
          />
          <MiniKPI
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            label="Avg Score"
            value={`${avgScore}%`}
          />
          <MiniKPI
            icon={<Award className="w-5 h-5 text-yellow-500" />}
            label="Best Score"
            value={`${bestScore}%`}
          />
          <MiniKPI
            icon={<Sparkles className="w-5 h-5 text-purple-500" />}
            label="Improvement"
            value={improvement > 0 ? `+${improvement}` : `${improvement}`}
          />
        </div>

        {/* ---- Tabs ---- */}
        <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 rounded-xl p-1.5 w-fit shadow-sm border border-gray-100 dark:border-gray-700">
          <Tab active={tab === "analyze"} onClick={() => setTab("analyze")}>
            <span className="flex items-center gap-1.5">
              <Upload className="w-4 h-4" /> Analyze
            </span>
          </Tab>
          <Tab active={tab === "results"} onClick={() => setTab("results")}>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Results
            </span>
          </Tab>
          <Tab active={tab === "history"} onClick={() => setTab("history")}>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> History
            </span>
          </Tab>
        </div>

        {/* ---- Error ---- */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        {/* ================================================================
         *  TAB: ANALYZE
         * ================================================================ */}
        {tab === "analyze" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Upload card */}
            <Card className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" /> Upload Resume
              </h2>
              <div
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer
                  ${
                    uploading
                      ? "opacity-60 pointer-events-none border-gray-300 dark:border-gray-600"
                      : "border-blue-300 dark:border-blue-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                  }`}
                onClick={() => fileInput.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  disabled={uploading}
                />
                <div className="p-4 bg-blue-100 dark:bg-blue-900/40 rounded-full mb-4">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {uploading
                    ? "Analyzing..."
                    : "Drag & drop or click to upload PDF"}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  PDF files up to 10 MB
                </p>
              </div>
              {fileName && !uploading && result && (
                <p className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Analyzed: {fileName}
                </p>
              )}
              {uploading && (
                <div className="mt-6">
                  <SkeletonLoader rows={4} />
                </div>
              )}
            </Card>

            {/* Quick stats sidebar */}
            <div className="space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Score Trend
                </h3>
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#3b82f6" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                    Upload 2+ resumes to see trend
                  </p>
                )}
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Recent Analyses
                </h3>
                {historyLoading ? (
                  <SkeletonLoader rows={3} />
                ) : history.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                    No history yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {history.slice(0, 5).map((h) => (
                      <button
                        key={h.id}
                        onClick={() => {
                          handleViewDetail(h.id);
                          setTab("results");
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {h.filename}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(h.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold ml-2 ${
                            h.score >= 75
                              ? "text-green-500"
                              : h.score >= 50
                                ? "text-yellow-500"
                                : "text-red-500"
                          }`}
                        >
                          {h.score}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ================================================================
         *  TAB: RESULTS
         * ================================================================ */}
        {tab === "results" && (
          <>
            {/* If viewing a history detail */}
            {detailLoading && (
              <Card>
                <SkeletonLoader rows={6} />
              </Card>
            )}

            {!result && !selectedDetail && !detailLoading && (
              <Card className="text-center py-16">
                <Sparkles className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No results yet. Upload a resume to see your analysis.
                </p>
                <button
                  onClick={() => setTab("analyze")}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  Go to Upload
                </button>
              </Card>
            )}

            {(result || selectedDetail) && !detailLoading && (
              <ResultsView
                data={
                  selectedDetail
                    ? buildResultFromDetail(selectedDetail)
                    : result
                }
                fileName={selectedDetail ? selectedDetail.filename : fileName}
                createdAt={selectedDetail?.created_at}
                hrQuestions={hrQuestions}
                hrLoading={hrLoading}
                onGenerateHR={handleGenerateHR}
                showHRButton={!selectedDetail}
              />
            )}
          </>
        )}

        {/* ================================================================
         *  TAB: HISTORY
         * ================================================================ */}
        {tab === "history" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* List */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> Analysis History
                </h2>
                <button
                  onClick={loadHistory}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  title="Refresh"
                >
                  <RotateCcw className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {historyLoading ? (
                <SkeletonLoader rows={5} />
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No analyses yet
                  </p>
                  <button
                    onClick={() => setTab("analyze")}
                    className="mt-3 text-blue-600 hover:underline text-sm"
                  >
                    Upload your first resume
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                        selectedDetail?.id === item.id
                          ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/20"
                          : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      }`}
                      onClick={() => handleViewDetail(item.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
                          <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {item.filename}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                        <Badge type={scoreBadge(item.score)} />
                        <span
                          className={`text-lg font-bold ${
                            item.score >= 75
                              ? "text-green-500"
                              : item.score >= 50
                                ? "text-yellow-500"
                                : "text-red-500"
                          }`}
                        >
                          {item.score}%
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Charts sidebar */}
            <div className="space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Score Over Time
                </h3>
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#3b82f6" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Upload 2+ resumes to see chart
                  </p>
                )}
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Score Distribution
                </h3>
                {scores.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={distData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />
                      <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {distData.map((_, i) => (
                          <Cell key={i} fill={distColors[i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No data yet
                  </p>
                )}
              </Card>

              {/* Detail preview */}
              {detailLoading && (
                <Card>
                  <SkeletonLoader rows={4} />
                </Card>
              )}
              {selectedDetail && !detailLoading && (
                <Card>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {selectedDetail.filename}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    {new Date(selectedDetail.created_at).toLocaleString()}
                  </p>
                  <div className="flex justify-center mb-3">
                    <AnimatedScore score={selectedDetail.score} size={100} />
                  </div>
                  <div className="space-y-1">
                    {(selectedDetail.result?.strengths || [])
                      .slice(0, 3)
                      .map((s, i) => (
                        <p
                          key={i}
                          className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {s}
                        </p>
                      ))}
                  </div>
                  <button
                    onClick={() => setTab("results")}
                    className="mt-3 w-full text-center text-sm text-blue-600 hover:underline"
                  >
                    View full details →
                  </button>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================================================================
 *  SUB-COMPONENTS
 * ====================================================================== */

function MiniKPI({ icon, label, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
      <div className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

/* Build a normalised result object from a history detail doc */
function buildResultFromDetail(detail) {
  const r = detail.result || {};
  return {
    algorithm_score: detail.score,
    ai_analysis: r.ai_analysis || "",
    strengths: r.strengths || [],
    weaknesses: r.weaknesses || [],
    missing_keywords: r.missing_keywords || [],
    suggestions: r.suggestions || [],
    hr_questions: r.hr_questions || [],
    tips: r.tips || [],
  };
}

/* ---------- Full Results View ---------- */
function ResultsView({
  data,
  fileName,
  createdAt,
  hrQuestions,
  hrLoading,
  onGenerateHR,
  showHRButton,
}) {
  const score = data.algorithm_score;
  const strengths = data.strengths || [];
  const weaknesses = data.weaknesses || [];
  const missingKeywords = data.missing_keywords || [];
  const suggestions = data.suggestions || [];
  const tips = data.tips || [];
  const builtInHR = data.hr_questions || [];

  return (
    <div className="space-y-6">
      {/* Score + meta row */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center text-center">
          <AnimatedScore score={score} size={150} strokeWidth={12} />
          <div className="mt-3">
            <Badge type={scoreBadge(score)} />
          </div>
          {fileName && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 truncate max-w-full">
              {fileName}
            </p>
          )}
          {createdAt && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(createdAt).toLocaleString()}
            </p>
          )}
        </Card>

        {/* Strengths */}
        <Card>
          <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Strengths
          </h3>
          {strengths.length === 0 ? (
            <p className="text-sm text-gray-400">None detected</p>
          ) : (
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Weaknesses */}
        <Card>
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> Weaknesses
          </h3>
          {weaknesses.length === 0 ? (
            <p className="text-sm text-gray-400">None detected</p>
          ) : (
            <ul className="space-y-2">
              {weaknesses.map((w, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                >
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Missing Keywords + Suggestions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" /> Missing Keywords
          </h3>
          {missingKeywords.length === 0 ? (
            <p className="text-sm text-gray-400">None detected</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {missingKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" /> Suggestions
          </h3>
          {suggestions.length === 0 ? (
            <p className="text-sm text-gray-400">None</p>
          ) : (
            <ul className="space-y-2">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                >
                  <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Tips */}
      {tips.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Tips &amp; Best Practices
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 rounded-lg bg-purple-50/50 dark:bg-purple-900/10"
              >
                <span className="text-purple-500 mt-0.5">•</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {tip}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* HR / Interview Questions */}
      {builtInHR.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Interview Questions
          </h3>
          <ol className="space-y-2 list-decimal list-inside">
            {builtInHR.map((q, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                {typeof q === "string" ? q : q.question || q}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Generate advanced HR questions */}
      {showHRButton && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" /> Advanced
                Interview Prep
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Generate 10 tailored questions with expected answers
              </p>
            </div>
            <button
              onClick={onGenerateHR}
              disabled={hrLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 shadow-sm"
            >
              {hrLoading ? "Generating..." : "Generate"}
            </button>
          </div>

          {hrLoading && (
            <div className="mt-4">
              <SkeletonLoader rows={5} />
            </div>
          )}

          {hrQuestions.length > 0 && (
            <div className="mt-4 space-y-3">
              {hrQuestions.map((qa, i) => (
                <div
                  key={i}
                  className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    {i + 1}. {qa.question}
                  </p>
                  {qa.expected_answer && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 pl-4 border-l-2 border-indigo-300 dark:border-indigo-700">
                      {qa.expected_answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Score breakdown progress bars */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" /> Score Breakdown
        </h3>
        <div className="space-y-1">
          <ProgressBar
            label="Strengths Found"
            value={strengths.length}
            max={Math.max(strengths.length, 8)}
            color="bg-green-500"
          />
          <ProgressBar
            label="Weaknesses Found"
            value={weaknesses.length}
            max={Math.max(weaknesses.length, 8)}
            color="bg-red-500"
          />
          <ProgressBar
            label="Missing Keywords"
            value={missingKeywords.length}
            max={Math.max(missingKeywords.length, 10)}
            color="bg-orange-500"
          />
          <ProgressBar
            label="Suggestions"
            value={suggestions.length}
            max={Math.max(suggestions.length, 8)}
            color="bg-blue-500"
          />
        </div>
      </Card>
    </div>
  );
}
