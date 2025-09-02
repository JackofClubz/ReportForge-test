/**
 * Script to apply the soft delete migration to the remote Supabase database
 * Run this with: node scripts/apply-soft-delete-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// You need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your-') || supabaseServiceKey.includes('your-')) {
  console.error('❌ Missing Supabase credentials!');
  console.log('Please set the following environment variables:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  console.log('');
  console.log('Or edit this script to include your values directly.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🔄 Reading migration file...');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250120100000_add_soft_delete_to_reports.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Applying migration...');
    
    // Split the SQL by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error('❌ Error executing statement:', error);
        throw error;
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('🎉 You can now:');
    console.log('1. Uncomment the deleted_at filter in src/hooks/useAllReports.ts');
    console.log('2. Uncomment the delete button in src/pages/report/ReportsPortfolio.tsx');
    console.log('3. Test the soft delete functionality');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('');
    console.log('💡 Alternative: Apply the migration manually via Supabase Dashboard');
    console.log('📖 See the migration file: supabase/migrations/20250120100000_add_soft_delete_to_reports.sql');
  }
}

applyMigration();
