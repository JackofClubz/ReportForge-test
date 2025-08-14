export interface Report {
  id: string;
  name: string;
  site: string;
  created: string;
  published: string;
  template: string;
  status: string;
  statusType: 'purple' | 'red' | 'magenta' | 'green' | 'gray';
}

export interface Site {
  id: string;
  name: string;
  site_country: string;
  primary_minerals: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}

export interface TableHeader {
  key: string;
  header: string;
}

export interface DashboardData {
  recentReports: Report[];
  recentSites: Site[];
  tableHeaders: {
    recentReports: TableHeader[];
    recentSites: TableHeader[];
  };
} 