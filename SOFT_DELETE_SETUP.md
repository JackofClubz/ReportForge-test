# Soft Delete Setup Instructions

The soft delete functionality has been implemented but requires a database migration to be applied.

## Current Status
✅ **Code is ready** - All soft delete functionality has been implemented
⚠️ **Migration pending** - Database schema needs to be updated

## Quick Fix Applied
The reports page should now load without errors because I've temporarily disabled the `deleted_at` column query.

## To Complete the Setup

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20250120100000_add_soft_delete_to_reports.sql`
4. Click **Run** to execute the migration

### Option 2: Using the Migration Script

1. Set your environment variables:
   ```bash
   # Add these to your environment or .env file
   VITE_SUPABASE_URL=your-supabase-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. Run the migration script:
   ```bash
   node scripts/apply-soft-delete-migration.js
   ```

### Option 3: Manual SQL Execution

Run this SQL directly in your Supabase SQL editor:

```sql
-- Add soft delete column
ALTER TABLE reports 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for performance
CREATE INDEX idx_reports_deleted_at ON reports(deleted_at);

-- Update RLS policies (see full migration file for complete policies)
```

## After Migration is Applied

1. **Uncomment the filter** in `src/hooks/useAllReports.ts`:
   ```typescript
   // Change this line:
   .order('updated_at', { ascending: false });
   
   // To this:
   .is('deleted_at', null) // Filter out soft-deleted reports
   .order('updated_at', { ascending: false });
   ```

2. **Uncomment the delete button** in `src/pages/report/ReportsPortfolio.tsx`:
   Remove the `/* */` comments around the delete button code.

3. **Test the functionality**:
   - Go to the Reports page
   - You should see delete buttons (🗑️) for users with admin/QP roles
   - Click delete, confirm, and verify the report disappears

## What the Soft Delete Does

- ✅ **Preserves data** - Reports are not actually deleted from the database
- ✅ **Hides from users** - Deleted reports won't appear in any lists
- ✅ **Role-based** - Only admins and QPs can delete reports  
- ✅ **Recoverable** - Admins can restore deleted reports if needed
- ✅ **RLS protected** - Database-level security ensures proper access control

## Troubleshooting

If you see "Error loading reports" again:
1. Check that the migration was applied successfully
2. Verify the `deleted_at` column exists in your reports table
3. Make sure you've uncommented the code as instructed above

Need help? Check the migration file: `supabase/migrations/20250120100000_add_soft_delete_to_reports.sql`


