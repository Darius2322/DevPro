import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import UrlsPage from './pages/UrlsPage'
import SecretsPage from './pages/SecretsPage'
import Settings from './pages/Settings'
import SharePage from './pages/SharePage'
import Onboarding from './pages/Onboarding'
import Profile from './pages/Profile'
import AiAccounts from './pages/AiAccounts'
import Connections from './pages/Connections'
import Materials from './pages/Materials'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/share/:token" element={<SharePage />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/urls" element={<UrlsPage />} />
        <Route path="/secrets" element={<SecretsPage />} />
        <Route path="/ai-accounts" element={<AiAccounts />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
