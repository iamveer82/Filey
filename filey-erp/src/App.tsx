import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Launcher from "./pages/Launcher";
import Dashboard from "./pages/Dashboard";
import Crm from "./pages/Crm";
import Invoicing from "./pages/Invoicing";
import Erp from "./pages/Erp";
import Hr from "./pages/Hr";
import Finance from "./pages/Finance";
import Tools from "./pages/Tools";
import Login from "./pages/Login";
import ProfileSetup from "./pages/ProfileSetup";
import SetupNotice from "./pages/SetupNotice";

function Splash() {
  return (
    <div className="min-h-full grid place-items-center bg-brand-50">
      <p className="text-sm font-semibold text-brand-400">Loading…</p>
    </div>
  );
}

function Gate() {
  const { loading, configured, user, needsProfile } = useAuth();
  if (loading) return <Splash />;
  if (!configured) return <SetupNotice />;
  if (!user) return <Login />;
  if (needsProfile) return <ProfileSetup />;

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Launcher />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/crm" element={<Crm />} />
          <Route path="/invoicing" element={<Invoicing />} />
          <Route path="/erp" element={<Erp />} />
          <Route path="/hr" element={<Hr />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/tools" element={<Tools />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
