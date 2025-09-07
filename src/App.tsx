// 1. External libraries first
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 2. Internal components/pages
import Dashboard from './pages/dashboard/Dashboard';
import SitePage from './pages/site/SitePage';
import CreateSite from './pages/site/CreateSite';
import SitesPortfolio from './pages/site/SitesPortfolio';
import ReportPage from './pages/report/ReportPage';
import CreateReport from './pages/report/CreateReport';
import ReportQuestions from './pages/report/ReportQuestions';

import ReportEditor from './pages/report/ReportEditor';
import ReportsPortfolio from './pages/report/ReportsPortfolio';
import EditReportSettings from './pages/report/EditReportSettings';
import AddOrgPage from './pages/organisation/AddOrgPage';
import OrganisationPage from './pages/organisation/Organisation';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import CompleteSignup from './pages/auth/CompleteSignup';
import ResetPassword from './pages/auth/ResetPassword';
import PendingApprovalPage from './pages/site/PendingApprovalPage';
import Support from './pages/support/Support';
import AIReportBuilderTest from './pages/test/AIReportBuilderTest';
import AISlashTest from './pages/test/AISlashTest';
import SimpleAITest from './pages/test/SimpleAITest';
import AccountSettings from './pages/account/AccountSettings';
import ChangePassword from './pages/account/ChangePassword';
import ChangeEmail from './pages/account/ChangeEmail';
import ChangeOrganization from './pages/account/ChangeOrganization';
import DeleteAccount from './pages/account/DeleteAccount';
import Plan from './pages/account/Plan';

// 3. Contexts and utilities
import RequireAuth from './components/RequireAuth';
import { AuthProvider } from './contexts/AuthContext';

// 4. Styles last (good practice)
import './styles/app.scss';

function App() {
  console.log('🚀 App component is rendering');
  
  return (
    <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/complete-signup" element={<CompleteSignup />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            
            {/* Route for pending approval - needs to be accessible by authenticated (pending) users */}
            {/* It uses AppLayout, so RequireAuth will still wrap it, but RequireAuth has logic to allow this path. */}
            <Route path="/pending-approval" element={
              <RequireAuth>
                <PendingApprovalPage />
              </RequireAuth>
            } />
            
            {/* Protected Routes */}
            <Route path="/organisation/add" element={
              <RequireAuth>
                <AddOrgPage />
              </RequireAuth>
            } />
            <Route path="/organisation" element={
              <RequireAuth>
                <OrganisationPage />
              </RequireAuth>
            } />
            <Route path="/dashboard" element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            } />
            <Route path="/reports" element={
              <RequireAuth>
                <ReportsPortfolio />
              </RequireAuth>
            } />
            <Route path="/sites" element={
              <RequireAuth>
                <SitesPortfolio />
              </RequireAuth>
            } />
            <Route path="/support" element={
              <RequireAuth>
                <Support />
              </RequireAuth>
            } />
            
            {/* Account Management Routes */}
            <Route path="/account/settings" element={
              <RequireAuth>
                <AccountSettings />
              </RequireAuth>
            } />
            <Route path="/account/change-password" element={
              <RequireAuth>
                <ChangePassword />
              </RequireAuth>
            } />
            <Route path="/account/change-email" element={
              <RequireAuth>
                <ChangeEmail />
              </RequireAuth>
            } />
            <Route path="/account/change-organization" element={
              <RequireAuth>
                <ChangeOrganization />
              </RequireAuth>
            } />
            <Route path="/account/delete" element={
              <RequireAuth>
                <DeleteAccount />
              </RequireAuth>
            } />
            <Route path="/account/plan" element={
              <RequireAuth>
                <Plan />
              </RequireAuth>
            } />
            
            <Route path="/site/create" element={
              <RequireAuth>
                <CreateSite />
              </RequireAuth>
            } />
            <Route path="/site/:siteId/edit" element={
              <RequireAuth>
                <CreateSite />
              </RequireAuth>
            } />
            <Route path="/site/:id" element={
              <RequireAuth>
                <SitePage />
              </RequireAuth>
            } />
            <Route path="/report/create" element={
              <RequireAuth>
                <CreateReport />
              </RequireAuth>
            } />
            <Route path="/report/:reportId/questions" element={
              <RequireAuth>
                <ReportQuestions />
              </RequireAuth>
            } />
            <Route path="/report/:reportId" element={
              <RequireAuth>
                <ReportPage />
              </RequireAuth>
            } />
            <Route path="/report/:reportId/edit" element={
              <RequireAuth>
                <ReportEditor />
              </RequireAuth>
            } />
            <Route path="/report/:reportId/settings" element={
              <RequireAuth>
                <EditReportSettings />
              </RequireAuth>
            } />
            
            {/* Test Routes */}
            {<Route path="/test/ai-report-builder" element={
              <RequireAuth>
                <AIReportBuilderTest />
              </RequireAuth>
            } />}
            {<Route path="/test/ai-slash" element={
              <RequireAuth>
                <AISlashTest />
              </RequireAuth>
            } />}
            {<Route path="/test/simple-ai" element={
              <RequireAuth>
                <SimpleAITest />
              </RequireAuth>
            } />}
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
  );
}

export default App;
