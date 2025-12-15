import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfvvxhtcjdghtfuaphfz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmdnZ4aHRjamRnaHRmdWFwaGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NjMyMzUsImV4cCI6MjA4MTIzOTIzNX0.5qRjb0rTemzcKo00UCwXf9zKdlnQ5uGX3RoUSA1PBzE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
