import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, scoreBadge } from "../components/ui/Badge";
import KPICard from "../components/ui/KPICard";
import SkeletonLoader from "../components/ui/SkeletonLoader";
import { useAuth } from "../context/AuthContext";
import {
  getAdminActivity,
  getAdminAnalytics,
  getAdminStats,
  getAdminTopResumes,
  getAdminUserResumes,
  getAdminUsers,
} from "../services/api";

const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e", "#8b5cf6"];

function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const { token } = useAuth();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [topResumes, setTopResumes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // user drill-down
  const [expandedUser, setExpandedUser] = useState(null);
  const [userResumes, setUserResumes] = useState([]);
  const [userResumesLoading, setUserResumesLoading] = useState(false);

  // activity days filter
  const [activityDays, setActivityDays] = useState(30);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadActivity();
  }, [activityDays]);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u, t, act, an] = await Promise.all([
        getAdminStats(token),
        getAdminUsers(token),
        getAdminTopResumes(token),
        getAdminActivity(token, activityDays),
        getAdminAnalytics(token),
      ]);
      setStats(s);
      setUsers(u);
      setTopResumes(t);
      setActivity(act);
      setAnalytics(an);
    } catch (err) {
      console.error("Admin load error", err);
    }
    setLoading(false);
  }

  async function loadActivity() {
    try {
      const act = await getAdminActivity(token, activityDays);
      setActivity(act);
    } catch {
      /* ignore */
    }
  }

  async function toggleUserResumes(userId) {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }
    setExpandedUser(userId);
    setUserResumesLoading(true);
    try {
      const data = await getAdminUserResumes(userId, token);
      setUserResumes(data);
    } catch {
      setUserResumes([]);
    }
    setUserResumesLoading(false);
  }

  /* score distribution from stats bucket (we use admin/score-distribution or derive from analytics) */
  const scoreDist = [
    { range: "0-19", count: 0 },
    { range: "20-39", count: 0 },
    { range: "40-59", count: 0 },
    { range: "60-79", count: 0 },
    { range: "80-100", count: 0 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <SkeletonLoader rows={2} />
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 bg-white dark:bg-gray-800 rounded-2xl animate-pulse"
              />
            ))}
          </div>
          <SkeletonLoader rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Platform analytics &amp; user management
            </p>
          </div>
          <button
            onClick={loadAll}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KPICard
            icon={<Users className="w-5 h-5 text-blue-600" />}
            label="Total Users"
            value={stats?.total_users ?? 0}
            color="text-blue-600"
          />
          <KPICard
            icon={<FileText className="w-5 h-5 text-indigo-600" />}
            label="Total Resumes"
            value={stats?.total_resumes ?? 0}
            color="text-indigo-600"
          />
          <KPICard
            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
            label="Avg Score"
            value={`${stats?.avg_score ?? 0}%`}
            color="text-green-600"
          />
          <KPICard
            icon={<Trophy className="w-5 h-5 text-yellow-600" />}
            label="Max Score"
            value={`${stats?.max_score ?? 0}%`}
            color="text-yellow-600"
          />
          <KPICard
            icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
            label="Min Score"
            value={`${stats?.min_score ?? 0}%`}
            color="text-red-600"
          />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Timeline */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" /> Activity Timeline
              </h2>
              <select
                value={activityDays}
                onChange={(e) => setActivityDays(Number(e.target.value))}
                className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
            {activity.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={activity}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis
                    yAxisId="count"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="score"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "0.75rem",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,.1)",
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="count"
                    type="monotone"
                    dataKey="count"
                    name="Analyses"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="score"
                    type="monotone"
                    dataKey="avg_score"
                    name="Avg Score"
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-16">
                No activity data for this period
              </p>
            )}
          </Card>

          {/* Analytics — Common Weaknesses */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-red-500" /> Common Weaknesses
            </h2>
            {analytics?.common_weaknesses?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={analytics.common_weaknesses.slice(0, 8)}
                  layout="vertical"
                  margin={{ left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={180}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-16">
                No weakness data yet
              </p>
            )}
          </Card>
        </div>

        {/* Second Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Missing Keywords */}
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-orange-500" /> Top Missing
              Keywords
            </h2>
            {analytics?.missing_keywords?.length > 0 ? (
              <div className="space-y-2">
                {analytics.missing_keywords.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {item.label}
                    </span>
                    <span className="text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full ml-2">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No data</p>
            )}
          </Card>

          {/* Top Strengths */}
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-green-500" /> Top Strengths
            </h2>
            {analytics?.top_strengths?.length > 0 ? (
              <div className="space-y-2">
                {analytics.top_strengths.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {item.label}
                    </span>
                    <span className="text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full ml-2">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No data</p>
            )}
          </Card>

          {/* Top 5 Resumes */}
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-yellow-500" /> Top Resumes
            </h2>
            {topResumes.length > 0 ? (
              <div className="space-y-2">
                {topResumes.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <span
                      className={`text-sm font-bold w-6 text-center ${
                        i === 0
                          ? "text-yellow-500"
                          : i === 1
                            ? "text-gray-400"
                            : "text-orange-400"
                      }`}
                    >
                      #{i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {r.filename}
                      </p>
                      <p className="text-xs text-gray-400">{r.user_name}</p>
                    </div>
                    <Badge type={scoreBadge(r.score)} />
                    <span
                      className={`text-sm font-bold ${
                        r.score >= 75
                          ? "text-green-500"
                          : r.score >= 50
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    >
                      {r.score}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">
                No resumes yet
              </p>
            )}
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-500" /> Users ({users.length})
          </h2>

          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-6 gap-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-gray-700 mb-1">
            <span>Name</span>
            <span>Email</span>
            <span className="text-center">Role</span>
            <span className="text-center">Resumes</span>
            <span className="text-center">Last Active</span>
            <span className="text-center">Joined</span>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {users.map((u) => (
              <div key={u.id}>
                <button
                  onClick={() => toggleUserResumes(u.id)}
                  className="w-full grid grid-cols-2 md:grid-cols-6 gap-4 items-center py-3 px-1 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                      {u.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {u.name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate hidden md:block">
                    {u.email}
                  </span>
                  <span className="text-center">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        u.role === "admin"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {u.role}
                    </span>
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 text-center hidden md:block">
                    {u.resume_count}
                  </span>
                  <span className="text-xs text-gray-400 text-center hidden md:block">
                    {new Date(u.last_active).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-gray-400 text-center hidden md:flex items-center justify-center gap-1">
                    {new Date(u.created_at).toLocaleDateString()}
                    {expandedUser === u.id ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </span>
                </button>

                {/* Expanded user resumes */}
                {expandedUser === u.id && (
                  <div className="ml-10 mb-3 mt-1">
                    {userResumesLoading ? (
                      <SkeletonLoader rows={2} />
                    ) : userResumes.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">
                        No resumes uploaded
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {userResumes.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/30"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                {r.filename}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(r.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <Badge type={scoreBadge(r.score)} />
                              <span
                                className={`text-sm font-bold ${
                                  r.score >= 75
                                    ? "text-green-500"
                                    : r.score >= 50
                                      ? "text-yellow-500"
                                      : "text-red-500"
                                }`}
                              >
                                {r.score}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No users registered yet
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
