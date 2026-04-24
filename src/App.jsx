import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './lib/theme.jsx'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import Auth from './pages/Auth.jsx'
import Home from './pages/Home.jsx'
import NuovaSessione from './pages/NuovaSessione.jsx'
import Sessione from './pages/Sessione.jsx'

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin .7s linear infinite'
      }} />
    </div>
  )
  if (!user) return <Navigate to="/auth" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Guard><Home /></Guard>} />
            <Route path="/nuova" element={<Guard><NuovaSessione /></Guard>} />
            <Route path="/sessione/:id" element={<Guard><Sessione /></Guard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
