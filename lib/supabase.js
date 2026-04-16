import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _supabase = null;

export function getSupabase() {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    }
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

// Convenience alias — imported as { supabase }
// Lazy-initializes on first use so the build doesn't crash without env vars
export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getSupabase();
    return client[prop];
  },
});