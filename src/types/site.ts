export interface SiteData {
  id?: string;
  name: string;
  primary_minerals: string;
  latitude: number;
  longitude: number;
  start_date: string;
  site_country: string;
  investor_name?: string;
  description?: string | null;
  owner_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSiteForm {
  siteName: string;
  primaryMinerals: string;
  investorName: string;
  startDate: string;
  country: string;
  siteCoordinates: string;
  notes: string;
}

export interface ValidationErrors {
  siteName?: string;
  primaryMinerals?: string;
  startDate?: string;
  country?: string;
  siteCoordinates?: string;
}

export const validateCoordinates = (input: string): boolean => {
  if (!input.trim()) return false;
  
  const parts = input.split(',');
  if (parts.length !== 2) return false;
  
  const lat = parseFloat(parts[0].trim());
  const lng = parseFloat(parts[1].trim());
  
  return !isNaN(lat) && !isNaN(lng) && 
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180;
}; 