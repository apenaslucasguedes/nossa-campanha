import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AppShell } from './components/AppShell'
import { LoadingState } from './components/States'
import { CampaignPage } from './pages/CampaignPage'
import { CharacterPage } from './pages/CharacterPage'
import { LoginPage } from './pages/LoginPage'
import { CreateCharacterPage } from './pages/CreateCharacterPage'
import { TablePage } from './pages/TablePage'
import { CompendiumPage } from './pages/CompendiumPage'
import { MapPage } from './pages/MapPage'
import { SettingsPage } from './pages/SettingsPage'

function Protected(){const {session,loading}=useAuth();const location=useLocation();if(loading)return <LoadingState/>;return session?<AppShell/>:<Navigate to="/login" state={{from:location.pathname}} replace/>}
export function App(){return <HashRouter><AuthProvider><Routes><Route path="/login" element={<LoginPage/>}/><Route element={<Protected/>}><Route path="/campanha" element={<CampaignPage/>}/><Route path="/criar-personagem" element={<CreateCharacterPage/>}/><Route path="/personagem" element={<CharacterPage/>}/><Route path="/mapa" element={<MapPage/>}/><Route path="/mesa" element={<TablePage/>}/><Route path="/compendio" element={<CompendiumPage/>}/><Route path="/configuracoes" element={<SettingsPage/>}/></Route><Route path="*" element={<Navigate to="/campanha" replace/>}/></Routes></AuthProvider></HashRouter>}
