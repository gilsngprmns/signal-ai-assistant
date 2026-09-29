import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import HomeRedirect from "./components/HomeRedirect.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Chat from "./pages/Chat.jsx";
import History from "./pages/History.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminConversations from "./pages/admin/AdminConversations.jsx";
import AdminContexts from "./pages/admin/AdminContexts.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import AdminUsage from "./pages/admin/AdminUsage.jsx";
import AdminActivity from "./pages/admin/AdminActivity.jsx";
import Profile from "./pages/Profile.jsx";
import "./App.css";
import "./theme.css";
import "./Redesign.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<DashboardLayout />}>
              <Route index element={<Navigate to="chat" replace />} />
              <Route path="chat" element={<Chat />} />
              <Route path="history" element={<History />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="conversations" element={<AdminConversations />} />
                <Route path="ai-contexts" element={<AdminContexts />} />
                <Route path="ai-settings" element={<AdminSettings />} />
                <Route path="usage" element={<AdminUsage />} />
                <Route path="activity-logs" element={<AdminActivity />} />
              </Route>
            </Route>
          </Route>
          <Route path="/chat" element={<Navigate to="/app/chat" replace />} />
          <Route path="/history" element={<Navigate to="/app/history" replace />} />
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
