const DEBUG = true;

export const debug = {
  auth: (message: string, data?: any) => {
    if (DEBUG) {
      console.group(`🔐 Auth: ${message}`);
      if (data) console.log(data);
      console.groupEnd();
    }
  },
  data: (message: string, data?: any) => {
    if (DEBUG) {
      console.group(`📊 Data: ${message}`);
      if (data) console.log(data);
      console.groupEnd();
    }
  },
  error: (message: string, error?: any) => {
    if (DEBUG) {
      console.group(`❌ Error: ${message}`);
      if (error) console.error(error);
      console.groupEnd();
    }
  }
};

// Debugging helpers for auth issues
(window as any).clearAuthState = () => {
  const STORAGE_KEYS = {
    USER_ROLE: 'reportforge_user_role',
    ORG_ID: 'reportforge_org_id',
    USER_DATA: 'reportforge_user_data'
  };
  
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    localStorage.removeItem(STORAGE_KEYS.ORG_ID);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    console.log('🧹 [DEBUG] LocalStorage auth data cleared. Please refresh the page.');
    return 'Success: Auth state cleared from localStorage. Please refresh the page.';
  } catch (error) {
    console.error('❌ [DEBUG] Failed to clear localStorage:', error);
    return 'Error: Failed to clear localStorage';
  }
};

(window as any).checkAuthState = () => {
  const STORAGE_KEYS = {
    USER_ROLE: 'reportforge_user_role',
    ORG_ID: 'reportforge_org_id',
    USER_DATA: 'reportforge_user_data'
  };
  
  const authState = {
    userRole: localStorage.getItem(STORAGE_KEYS.USER_ROLE),
    orgId: localStorage.getItem(STORAGE_KEYS.ORG_ID),
    userData: localStorage.getItem(STORAGE_KEYS.USER_DATA)
  };
  
  console.log('🔍 [DEBUG] Current localStorage auth state:', authState);
  return authState;
};

console.log('🛠️ Debug helpers available:');
console.log('  - clearAuthState() - Clear localStorage auth data');
console.log('  - checkAuthState() - Check current localStorage auth state'); 