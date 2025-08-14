import { ORG_ROLES } from '../hooks/usePermissions';

export type AppRole = typeof ORG_ROLES[keyof typeof ORG_ROLES];

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sites: {
        Row: {
          id: string
          name: string
          coordinates: [number, number][]
          owner_id: string
          description: string | null
          primary_minerals: string | null
          start_date: string | null
          site_country: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          coordinates: [number, number][]
          owner_id: string
          description?: string | null
          primary_minerals?: string | null
          start_date?: string | null
          site_country?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          coordinates?: [number, number][]
          owner_id?: string
          description?: string | null
          primary_minerals?: string | null
          start_date?: string | null
          site_country?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          report_name: string
          site_id: string
          created_by: string
          primary_qp_id: string | null
          report_content: Json | null
          created_on: string
          published_on: string | null
          template_type: string
          status: string
          version: number
          is_locked: boolean
          metadata: Json
          updated_at: string
          org_id: string | null
        }
        Insert: {
          id?: string
          report_name: string
          site_id: string
          created_by: string
          primary_qp_id?: string | null
          report_content?: Json | null
          created_on?: string
          published_on?: string | null
          template_type: string
          status?: string
          version?: number
          is_locked?: boolean
          metadata?: Json
          updated_at?: string
          org_id?: string | null
        }
        Update: {
          id?: string
          report_name?: string
          site_id?: string
          created_by?: string
          primary_qp_id?: string | null
          report_content?: Json | null
          created_on?: string
          published_on?: string | null
          template_type?: string
          status?: string
          version?: number
          is_locked?: boolean
          metadata?: Json
          updated_at?: string
          org_id?: string | null
        }
      }
      report_users: {
        Row: {
          id: string
          report_id: string
          user_id: string
          role: string
          invited_on: string
          accepted: boolean
        }
        Insert: {
          id?: string
          report_id: string
          user_id: string
          role: string
          invited_on?: string
          accepted?: boolean
        }
        Update: {
          id?: string
          report_id?: string
          user_id?: string
          role?: string
          invited_on?: string
          accepted?: boolean
        }
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string
          role: string
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: string
          created_at?: string
        }
      }
      test_items: {
        Row: {
          id: number
          created_at: string
          name: string
          description: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          name: string
          description?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          name?: string
          description?: string | null
        }
      }
      orgs: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
          domain: string | null
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
          updated_at?: string
          domain?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
          updated_at?: string
          domain?: string | null
        }
      }
      org_users: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: AppRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role: AppRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          role?: AppRole
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types for common table operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TableInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TableUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific table types
export type Site = TableRow<'sites'>
export type NewSite = TableInsert<'sites'>
export type UpdateSite = TableUpdate<'sites'>

export type Report = TableRow<'reports'>
export type NewReport = TableInsert<'reports'>
export type UpdateReport = TableUpdate<'reports'>

export type ReportUser = TableRow<'report_users'>
export type NewReportUser = TableInsert<'report_users'>
export type UpdateReportUser = TableUpdate<'report_users'>

export type UserProfile = TableRow<'user_profiles'>
export type NewUserProfile = TableInsert<'user_profiles'>
export type UpdateUserProfile = TableUpdate<'user_profiles'>

export type TestItem = TableRow<'test_items'>
export type NewTestItem = TableInsert<'test_items'>
export type UpdateTestItem = TableUpdate<'test_items'>

// Specific types for Orgs
export type Org = TableRow<'orgs'>
export type NewOrg = TableInsert<'orgs'>
export type UpdateOrg = TableUpdate<'orgs'>

// Specific types for OrgUsers
export type OrgUser = TableRow<'org_users'>
export type NewOrgUser = TableInsert<'org_users'>
export type UpdateOrgUser = TableUpdate<'org_users'> 