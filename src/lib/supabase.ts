import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const isSupabaseConfigured = Boolean(url && key && !url.includes('SEU-PROJETO'))
export const supabase = createClient<Database>(url || 'https://placeholder.supabase.co', key || 'placeholder', { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
