import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthValue = { session: Session | null; loading: boolean; error: string | null; signIn(email: string, password: string): Promise<boolean>; signOut(): Promise<void> }
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    void supabase.auth.getSession().then(({ data, error: authError }) => { setSession(data.session); setError(authError?.message ?? null); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false) })
    return () => data.subscription.unsubscribe()
  }, [])
  const value = useMemo<AuthValue>(() => ({ session, loading, error,
    async signIn(email, password) { setLoading(true); setError(null); const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password }); setLoading(false); if (signInError) { setError('E-mail ou senha inválidos.'); return false } setSession(data.session); return true },
    async signOut() { setLoading(true); const { error: signOutError } = await supabase.auth.signOut(); setError(signOutError?.message ?? null); setSession(null); setLoading(false) },
  }), [session, loading, error])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
// O hook compartilha o mesmo módulo para manter o contexto privado.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth deve estar dentro de AuthProvider'); return value }
