import axios from "axios";

// In production (Vercel), API is on the same domain (empty string = relative URLs).
// In dev, FastAPI runs on localhost:8000.
const API_BASE = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Auth ---

export async function registerUser(name, email, password) {
  const res = await axios.post(`${API_BASE}/auth/register`, {
    name,
    email,
    password,
  });
  return res.data;
}

export async function loginUser(email, password) {
  const res = await axios.post(`${API_BASE}/auth/login`, {
    email,
    password,
  });
  return res.data;
}

export async function getMe(token) {
  const res = await axios.get(`${API_BASE}/auth/me`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// --- Resume Analysis ---

export async function analyzeResume(file, token) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(`${API_BASE}/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data", ...authHeaders(token) },
  });
  return res.data;
}

export async function generateHRQuestions(resumeText, token) {
  const res = await axios.post(
    `${API_BASE}/generate-hr-questions`,
    { resume_text: resumeText },
    { headers: { "Content-Type": "application/json", ...authHeaders(token) } },
  );
  return res.data;
}

// --- History ---

export async function getHistory(token) {
  const res = await axios.get(`${API_BASE}/history`, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function getHistoryDetail(id, token) {
  const res = await axios.get(`${API_BASE}/history/${id}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function deleteHistory(id, token) {
  const res = await axios.delete(`${API_BASE}/history/${id}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// --- Admin ---

export async function getAdminStats(token) {
  const res = await axios.get(`${API_BASE}/admin/stats`, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function getAdminUsers(token) {
  const res = await axios.get(`${API_BASE}/admin/users`, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function getAdminUserResumes(userId, token) {
  const res = await axios.get(`${API_BASE}/admin/users/${userId}/resumes`, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function getAdminTopResumes(token) {
  const res = await axios.get(`${API_BASE}/admin/top-resumes`, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function getAdminActivity(token, days = 30) {
  const res = await axios.get(`${API_BASE}/admin/activity?days=${days}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function getAdminAnalytics(token) {
  const res = await axios.get(`${API_BASE}/admin/analytics`, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function getAdminScoreDistribution(token) {
  const res = await axios.get(`${API_BASE}/admin/score-distribution`, {
    headers: authHeaders(token),
  });
  return res.data;
}
