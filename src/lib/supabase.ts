import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cspruputleoswzdzoems.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_SqIpMRjBfiALjeJkEfVklg_Gg4U_dna';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);