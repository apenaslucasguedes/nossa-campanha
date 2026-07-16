export type Role = 'player' | 'table_admin'
export type ClassKey = 'warrior'|'arcanist'|'shadow_blade'|'necromancer'|'bard'|'druid'
export type Attributes = { strength:number; agility:number; intellect:number; presence:number; instinct:number }
export type Specialty = 'Atletismo'|'Acrobacia'|'Furtividade'|'Investigação'|'Percepção'|'Sobrevivência'|'Medicina'|'Persuasão'|'Intimidação'|'História'|'Arcanismo'|'Performance'|'Rastreamento'|'Alquimia'
export type CharacterSpecialty = { character_id:string; name:Specialty; source:'class'|'free'; created_at:string }
export type AvatarOptions = { presentation:string; skinTone:string; hair:string; primaryColor:string; secondaryColor:string; accessory:string; layerColors?: Record<string, string> }
export type CharacterCondition = { id: string; character_id: string; name: string; created_by: string; created_at: string }
export type CharacterState = { character_id: string; vitality_current: number; vitality_max: number; resource_current: number; resource_max: number; updated_at: string; updated_by: string }
export type Character = { id:string; campaign_id:string; owner_id:string; name:string; class_key:ClassKey; level:number; presentation:string; origin:string; appearance:string; personality:string; objective:string; fear:string; initial_bond:string; current_bond:string; attributes:Attributes; defense:number; inventory_capacity:number; avatar:AvatarOptions; created_at:string; updated_at:string; character_states:CharacterState|null; character_conditions:CharacterCondition[]; character_specialties:CharacterSpecialty[] }
export type RegionId = 'vale-de-ardan'|'floresta-de-nhalor'|'costa-quebrada'|'cordilheira-de-ferro'|'pantanos-de-varg'|'deserto-de-sal'|'mar-de-cinzas'|'peninsula-da-aurora'|'estepes-do-norte'|'arquipelago-de-vesper'|'ilhas-cinzentas'|'ormara'
export type Campaign = { id: string; name: string; status: string; premise: string; current_summary: string; current_region_id: RegionId | null; last_session_summary: string; active_objectives: string[]; important_notes: string; created_at: string; created_by: string; updated_at: string }
export type CampaignMember = { campaign_id: string; user_id: string; role: Role; seat: number; joined_at: string; profile?: Profile | null }
export type CampaignLocation = { id: string; campaign_id: string; name: string; region_id: RegionId; kind: string | null; x: number; y: number; revealed: boolean; created_at: string }
export type Profile = { id: string; display_name: string; gpt_master_url: string | null; created_at: string; updated_at: string }

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] }
export type Database = { public: { Tables: {
  profiles: Table<Profile, { id: string; display_name: string }, Partial<Pick<Profile, 'display_name'|'gpt_master_url'|'updated_at'>>>
  campaigns: Table<Campaign, { name: string; created_by: string }, Partial<Pick<Campaign, 'name'|'status'|'premise'|'current_summary'|'current_region_id'|'last_session_summary'|'active_objectives'|'important_notes'|'updated_at'>>>
  campaign_members: Table<CampaignMember, CampaignMember>
  campaign_locations: Table<CampaignLocation, Omit<CampaignLocation, 'id'|'created_at'>>
  characters: Table<Omit<Character, 'character_states'|'character_conditions'|'character_specialties'>>
  character_states: Table<CharacterState, { character_id: string; vitality_current: number; vitality_max: number; resource_current: number; resource_max: number; updated_by: string }, Partial<CharacterState>>
  character_conditions: Table<CharacterCondition, { character_id: string; name: string; created_by: string }>
  character_specialties: Table<CharacterSpecialty, { character_id:string; name:Specialty; source:'class'|'free' }>
}; Views: Record<string, never>; Functions: { create_my_character:{Args:{payload:unknown};Returns:string} }; Enums: { member_role: Role }; CompositeTypes: Record<string, never> } }
