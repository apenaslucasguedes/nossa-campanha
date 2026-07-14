import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { ErrorBanner } from '../components/States'
export function LoginPage() { const { session, signIn, loading, error } = useAuth(); const location = useLocation(); const [email,setEmail]=useState(''); const [password,setPassword]=useState('')
  if (session) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/campanha'} replace />
  async function submit(event: FormEvent) { event.preventDefault(); await signIn(email, password) }
  return <main className="login-page"><section className="login-panel"><div className="sigil" aria-hidden="true">R</div><p className="eyebrow">Mesa para dois</p><h1>Abra o relicário</h1><p className="lede">Acesse sua ficha e o estado compartilhado da campanha.</p>{!isSupabaseConfigured ? <ErrorBanner>Configure as variáveis do Supabase para habilitar o acesso.</ErrorBanner> : null}{error ? <ErrorBanner>{error}</ErrorBanner> : null}<form onSubmit={submit}><label>E-mail<input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input id="login-password" name="password" type="password" autoComplete="current-password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary-button" disabled={loading || !isSupabaseConfigured}>{loading?'Verificando…':'Entrar'}</button></form><p className="login-note">O acesso é concedido pelo administrador da mesa. Não há cadastro público.</p></section></main> }
