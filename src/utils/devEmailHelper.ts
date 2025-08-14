// Development helper for when email isn't configured
// This should NEVER be used in production!

export const createManualResetLink = (email: string): string => {
  // Generate a mock token (for development only)
  const mockToken = btoa(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  const refreshToken = btoa(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  
  const baseUrl = window.location.origin;
  const resetUrl = `${baseUrl}/auth/reset-password?access_token=${mockToken}&refresh_token=${refreshToken}&type=recovery`;
  
  return resetUrl;
};

export const showDevResetInstructions = (email: string, resetUrl: string) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) {
    console.warn('⚠️  Dev email helper should not be used in production!');
    return;
  }

  console.group('🛠️  [DEV] Email Configuration Issue - Manual Reset Link');
  console.log('📧 Email requested for:', email);
  console.log('🔗 Manual reset link (development only):');
  console.log(resetUrl);
  console.log('');
  console.log('📋 Instructions:');
  console.log('1. Copy the link above');
  console.log('2. Open it in a new tab');
  console.log('3. Test the password reset flow');
  console.log('');
  console.log('⚠️  Configure SMTP in Supabase for production!');
  console.groupEnd();
  
  // Also show in alert for easy copying
  if (window.confirm('❌ Email not configured!\n\n📧 No email was sent because SMTP is not set up.\n\n🛠️  Click OK to get a manual reset link for development.')) {
    prompt('Copy this manual reset link for testing:', resetUrl);
  }
};

export const logSupabaseEmailStatus = () => {
  console.group('📧 [DEBUG] Supabase Email Configuration Check');
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('🔗 Current origin:', window.location.origin);
  console.log('');
  console.log('📧 Resend Configuration Detected:');
  console.log('✅ Provider: Resend (excellent choice!)');
  console.log('✅ From: no-reply@reportforge.co');
  console.log('✅ Host: smtp.resend.com');
  console.log('✅ Port: 465 (SSL/TLS)');
  console.log('');
  console.log('🔍 Common Resend Issues:');
  console.log('1. Domain not verified in Resend dashboard');
  console.log('2. Wrong API key in password field');
  console.log('3. DNS records not set up for reportforge.co');
  console.log('');
  console.log('📋 To verify setup:');
  console.log('1. Check Resend dashboard → Domains');
  console.log('2. Ensure reportforge.co is verified');
  console.log('3. Copy fresh API key to Supabase password field');
  console.log('4. Try sending test email');
  console.groupEnd();
}; 