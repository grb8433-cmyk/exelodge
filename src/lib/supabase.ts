import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fodrfcuobnonekdsjssl.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yBjxl-v8BaaoCrXArp6IVA_XSUDnH_x';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);