export function extractEmailDomain(email: string): string {
  return email.split('@')[1];
} 