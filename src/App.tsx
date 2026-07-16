import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AppShell } from './components/AppShell'
import { LoadingState } from './components/States'
import { CampaignListPage } from './pages/CampaignListPage'
import { CampaignPage } from './pages/CampaignPage'
import { CharacterPage } from './pages/CharacterPage'
import { LegacyCampaignRedirect } from './pages/LegacyCampaignRedirect'
import { LoginPage } from './pages/LoginPage'
import { CreateCharacterPage } from './pages/CreateCharacterPage'
import { TablePage } from './pages/TablePage'
import { CompendiumPage } from './pages/CompendiumPage'
import { MapPage } from './pages/MapPage'
import { SettingsPage } from './pages/SettingsPage'

function Protected(){const {session,loading}=useAuth();const location=useLocation();if(loading)return <LoadingState/>;return session?<AppShell/>:<Navigate to="/login" state={{from:location.pathname}} replace/>}
export function App(){return <HashRouter><AuthProvider><Routes>
  <Route path="/login" element={<LoginPage/>}/>
  <Route element={<Protected/>}>
    <Route path="/campanhas" element={<CampaignListPage/>}/>
    <Route path="/campanhas/:campaignId" element={<CampaignPage/>}/>
    <Route path="/campanhas/:campaignId/mesa" element={<TablePage/>}/>
    <Route path="/campanhas/:campaignId/mapa" element={<MapPage/>}/>
    <Route path="/campanhas/:campaignId/personagens" element={<CharacterPage/>}/>
    <Route path="/campanhas/:campaignId/criar-personagem" element={<CreateCharacterPage/>}/>
    <Route path="/criar-personagem" element={<CreateCharacterPage/>}/>
    <Route path="/personagens/:characterId" element={<CharacterPage/>}/>
    <Route path="/compendio" element={<CompendiumPage/>}/>
    <Route path="/configuracoes" element={<SettingsPage/>}/>
    <Route path="/campanha" element={<LegacyCampaignRedirect suffix=""/>}/>
    <Route path="/mesa" element={<LegacyCampaignRedirect suffix="/mesa"/>}/>
    <Route path="/mapa" element={<LegacyCampaignRedirect suffix="/mapa"/>}/>
    <Route path="/personagem" element={<LegacyCampaignRedirect suffix="/personagens"/>}/>
  </Route>
  <Route path="*" element={<Navigate to="/campanhas" replace/>}/>
</Routes></AuthProvider></HashRouter>}
