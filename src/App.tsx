import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireRole } from '@/components/auth/RequireRole';
import { AuthenticatedLayout } from '@/routes/AuthenticatedLayout';
import { LoginPage } from '@/routes/LoginPage';
import { ForgotPasswordPage } from '@/routes/ForgotPasswordPage';
import { UpdatePasswordPage } from '@/routes/UpdatePasswordPage';
import { DashboardPage } from '@/routes/DashboardPage';
import { ContributionsPage } from '@/routes/ContributionsPage';
import { ContributionFormPage } from '@/routes/contributions/ContributionFormPage';
import { ExpensesLedgerPage } from '@/routes/expenses/ExpensesLedgerPage';
import { ExpenseFormPage } from '@/routes/expenses/ExpenseFormPage';
import { ApprovalQueuePage } from '@/routes/expenses/ApprovalQueuePage';
import { NotificationsPage } from '@/routes/expenses/NotificationsPage';
import { SubAccountManagerPage } from '@/routes/sub-accounts/SubAccountManagerPage';
import { ReportsPage } from '@/routes/reports/ReportsPage';
import { ConsolidatedStatementPage } from '@/routes/reports/ConsolidatedStatementPage';
import { AnnualSummaryPage } from '@/routes/summary/AnnualSummaryPage';
import { SignaturePage } from '@/routes/signature/SignaturePage';
import { TwoFactorEnrollPage } from '@/routes/TwoFactorEnrollPage';
import { MembersListPage } from '@/routes/members/MembersListPage';
import { MemberFormPage } from '@/routes/members/MemberFormPage';
import { MemberImportPage } from '@/routes/members/MemberImportPage';
import { HouseholdsPage } from '@/routes/members/HouseholdsPage';
import { MemberProfilePage } from '@/routes/member/MemberProfilePage';
import { AdminConsolePage } from '@/routes/admin/AdminConsolePage';
import { AdminUsersPage } from '@/routes/admin/AdminUsersPage';
import { PermissionMatrixPage } from '@/routes/admin/PermissionMatrixPage';
import { AuditLogPage } from '@/routes/admin/AuditLogPage';
import { HealthPage } from '@/routes/admin/HealthPage';
import { CategoriesPage } from '@/routes/admin/CategoriesPage';
import { SubAccountAssignmentPage } from '@/routes/admin/SubAccountAssignmentPage';
import { canEditMembers, canApproveExpenses, canRecordContributions, canRecordExpenses } from '@/lib/auth/roles';

export const APP_TITLE = 'NICC-SJ Finance & Membership Portal';

/**
 * Application route tree (backlog 1.8). Public auth routes sit outside the
 * shell; everything else is gated by RequireAuth, and role-restricted
 * sections are additionally wrapped in RequireRole (presentation-layer mirror
 * of the PRD §7 matrix; RLS is the authoritative boundary).
 */
export default function App() {
  return (
    <Routes>
      {/* Public, unauthenticated routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />

      {/* Authenticated app */}
      <Route
        element={
          <RequireAuth>
            <AuthenticatedLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/security/2fa" element={<TwoFactorEnrollPage />} />
        <Route
          path="/profile"
          element={
            <RequireRole navKey="profile">
              <MemberProfilePage />
            </RequireRole>
          }
        />
        <Route
          path="/contributions"
          element={<ContributionsPage />}
        />
        <Route
          path="/contributions/new"
          element={
            <RequireRole allow={canRecordContributions}>
              <ContributionFormPage />
            </RequireRole>
          }
        />
        <Route
          path="/contributions/:id"
          element={
            <RequireRole allow={canRecordContributions}>
              <ContributionFormPage />
            </RequireRole>
          }
        />

        <Route
          path="/members"
          element={
            <RequireRole navKey="members">
              <MembersListPage />
            </RequireRole>
          }
        />
        <Route
          path="/members/new"
          element={
            <RequireRole allow={canEditMembers}>
              <MemberFormPage />
            </RequireRole>
          }
        />
        <Route
          path="/members/import"
          element={
            <RequireRole allow={canEditMembers}>
              <MemberImportPage />
            </RequireRole>
          }
        />
        <Route
          path="/members/:id"
          element={
            <RequireRole allow={canEditMembers}>
              <MemberFormPage />
            </RequireRole>
          }
        />
        <Route
          path="/households"
          element={
            <RequireRole navKey="households">
              <HouseholdsPage />
            </RequireRole>
          }
        />
        <Route
          path="/expenses"
          element={
            <RequireRole navKey="expenses">
              <ExpensesLedgerPage />
            </RequireRole>
          }
        />
        <Route
          path="/expenses/new"
          element={
            <RequireRole allow={canRecordExpenses}>
              <ExpenseFormPage />
            </RequireRole>
          }
        />
        <Route
          path="/expenses/approvals"
          element={
            <RequireRole allow={canApproveExpenses}>
              <ApprovalQueuePage />
            </RequireRole>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequireRole navKey="notifications">
              <NotificationsPage />
            </RequireRole>
          }
        />
        <Route
          path="/sub-accounts"
          element={
            <RequireRole navKey="sub-accounts">
              <SubAccountManagerPage />
            </RequireRole>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireRole navKey="reports">
              <ReportsPage />
            </RequireRole>
          }
        />
        <Route
          path="/reports/consolidated"
          element={
            <RequireRole navKey="consolidated-statement">
              <ConsolidatedStatementPage />
            </RequireRole>
          }
        />
        <Route
          path="/annual-summary"
          element={
            <RequireRole navKey="annual-summary">
              <AnnualSummaryPage />
            </RequireRole>
          }
        />
        <Route
          path="/signature"
          element={
            <RequireRole navKey="signature">
              <SignaturePage />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole navKey="admin">
              <AdminConsolePage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireRole navKey="admin">
              <AdminUsersPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/permissions"
          element={
            <RequireRole navKey="admin">
              <PermissionMatrixPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <RequireRole navKey="admin">
              <AuditLogPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/health"
          element={
            <RequireRole navKey="admin">
              <HealthPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <RequireRole navKey="admin">
              <CategoriesPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/sub-accounts"
          element={
            <RequireRole navKey="admin">
              <SubAccountAssignmentPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
