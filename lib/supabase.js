import { createClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Use cookie-backed sessions so Next middleware can read auth state.
// Force singleton to avoid multiple auth clients under HMR.
export const supabase = createBrowserClient(supabaseUrl, supabaseKey, { isSingleton: true })

/** Server / Route Handler: pass the user access token so RLS policies apply. */
export function createServerSupabaseClient(accessToken) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
