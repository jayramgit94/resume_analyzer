import {
  ArrowRight,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Shield,
  Sun,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import LoadingSpinner from "./components/LoadingSpinner";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import AdminDashboard from "./pages/AdminDashboard";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";

/* ---- route guards ---- */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function AuthPageRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  return children;
}

/* ---- Navbar ---- */
function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoggedIn = Boolean(user);
  const isAdmin = user?.role === "admin";

  const navLinks = isLoggedIn
    ? [
        {
          to: "/",
          label: "Home",
          icon: <Home className="w-4 h-4" />,
        },
        {
          to: isAdmin ? "/admin" : "/dashboard",
          label: "Dashboard",
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ]
    : [
        {
          to: "/",
          label: "Home",
          icon: <Home className="w-4 h-4" />,
        },
      ];

  function isActive(path) {
    return location.pathname === path;
  }

  const displayName =
    user?.name || user?.username || user?.email?.split("@")[0] || "User";

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200/60 dark:border-gray-700/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            to={isLoggedIn ? (isAdmin ? "/admin" : "/dashboard") : "/"}
            className="flex items-center gap-2 text-lg font-bold text-blue-600 dark:text-blue-400"
          >
            <FileText className="w-5 h-5" />
            Resume Analyzer
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(link.to)
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Toggle theme"
            >
              {dark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Guest actions */}
            {!isLoggedIn && (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="hidden sm:inline-flex px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* User badge */}
            {isLoggedIn && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                {isAdmin ? (
                  <Shield className="w-4 h-4 text-purple-500" />
                ) : (
                  <User className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {displayName}
                </span>
                <span className="text-[10px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 rounded-full">
                  ID: {user.id || "N/A"}
                </span>
                {isAdmin && (
                  <span className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">
                    ADMIN
                  </span>
                )}
              </div>
            )}

            {/* Logout */}
            {isLoggedIn && (
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 py-2 pb-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive(link.to)
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}

            {isLoggedIn ? (
              <>
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <User className="w-4 h-4" /> {displayName}
                </div>
                <div className="px-3 -mt-1 pb-1 text-xs text-gray-500 dark:text-gray-400 break-all">
                  {user.email}
                </div>
                <div className="px-3 pb-2 text-xs text-gray-500 dark:text-gray-400">
                  User ID: {user.id}
                </div>
              </>
            ) : (
              <div className="px-3 py-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigate("/login");
                    setMobileOpen(false);
                  }}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    navigate("/register");
                    setMobileOpen(false);
                  }}
                  className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

/* ---- App Root ---- */
export default function App() {
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
      {location.pathname !== "/" && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <AuthPageRoute>
              <Login />
            </AuthPageRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthPageRoute>
              <Register />
            </AuthPageRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
