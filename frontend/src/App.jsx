import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Landing from './pages/Landing/Landing';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ForgotPassword from './pages/Login/ForgotPassword';
import ResetPassword from './pages/Login/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import Upload from './pages/Upload/Upload';
import SkillsConfirm from './pages/SkillsConfirm/SkillsConfirm';
import RoleSelection from './pages/RoleSelection/RoleSelection';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route 
                path="/upload" 
                element={
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/skills" 
                element={
                  <ProtectedRoute>
                    <SkillsConfirm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/role-selection" 
                element={
                  <ProtectedRoute>
                    <RoleSelection />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
