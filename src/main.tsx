import { createRoot } from 'react-dom/client'
import './styles/index.scss'

// Liveblocks CSS imports
import "@blocknote/core/fonts/inter.css";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-blocknote/styles.css";

import App from './App'

// Debug utilities for development
if (import.meta.env.DEV) {
  import('./utils/debug-org-users').then(({ debugOrgUsers, fixOrgUserRecord }) => {
    (window as any).debugOrgUsers = debugOrgUsers;
    (window as any).fixOrgUserRecord = fixOrgUserRecord;
    console.log('🔧 Debug utilities loaded:');
    console.log('  - debugOrgUsers() - Check your org_users status');
    console.log('  - fixOrgUserRecord() - Fix missing org_users records');
  });
  
  import('./lib/utils/adminCleanup').then(({ adminDeleteUser, checkUserExists, adminResetPassword, sendPasswordResetEmail, changeUserRole, promotePendingUsersToAdmin, listPendingUsers, debugOrgUsersTable, listAllOrgUsers }) => {
    (window as any).adminDeleteUser = adminDeleteUser;
    (window as any).checkUserExists = checkUserExists;
    (window as any).adminResetPassword = adminResetPassword;
    (window as any).sendPasswordResetEmail = sendPasswordResetEmail;
    (window as any).changeUserRole = changeUserRole;
    (window as any).promotePendingUsersToAdmin = promotePendingUsersToAdmin;
    (window as any).listPendingUsers = listPendingUsers;
    (window as any).debugOrgUsersTable = debugOrgUsersTable;
    (window as any).listAllOrgUsers = listAllOrgUsers;
    console.log('🔧 Admin utilities loaded:');
    console.log('  - debugOrgUsersTable() - Check org_users table structure');
    console.log('  - listAllOrgUsers() - Show all org_users records');
    console.log('  - checkUserExists("email") - Check if user exists in system');
    console.log('  - listPendingUsers() - Show all pending users');
    console.log('  - changeUserRole("email", "admin") - Change user role');
    console.log('  - promotePendingUsersToAdmin() - Promote all pending users to admin');
    console.log('  - adminDeleteUser("email") - Completely remove user (ADMIN ONLY)');
    console.log('  - adminResetPassword("email", "newPassword") - Reset user password (ADMIN ONLY)');
    console.log('  - sendPasswordResetEmail("email") - Send password reset email');
  });
}

createRoot(document.getElementById('root')!).render(
  <App />
)
