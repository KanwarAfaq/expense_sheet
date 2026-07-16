import { createClient } from '@supabase/supabase-js';

// Pull variables smoothly from the Vite meta environment context
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;