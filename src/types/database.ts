export type Role = 'player' | 'table_admin'
export type CharacterCondition = { id: string; character_id: string; name: string; created_by: string; created_at: string }
export type CharacterState = { character_id: string; vitality_current: number; vitality_max: number; resource_current: number; resource_max: number; updated_at: string; updated_by: string }
export type Character = { id: string; campaign_id: string; owner_id: string; name: string; class_key: string; level: number; created_at: string; updated_at: string; character_states: CharacterState | null; character_conditions: CharacterCondition[] }
export type Campaign = { id: string; name: string; created_at: string; created_by: string }
export type CampaignMember = { campaign_id: string; user_id: string; role: Role; seat: number; joined_at: string }
export type Profile = { id: string; display_name: string; created_at: string; updated_at: string }

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] }
export type Database = { public: { Tables: {
  profiles: Table<Profile, { id: string; display_name: string }>
  campaigns: Table<Campaign, { name: string; created_by: string }>
  campaign_members: Table<CampaignMember, CampaignMember>
  characters: Table<Omit<Character, 'character_states' | 'character_conditions'>, { campaign_id: string; owner_id: string; name: string; class_key: string; level?: number }>
  character_states: Table<CharacterState, { character_id: string; vitality_current: number; vitality_max: number; resource_current: number; resource_max: number; updated_by: string }>
  character_conditions: Table<CharacterCondition, { character_id: string; name: string; created_by: string }>
}; Views: Record<string, never>; Functions: Record<string, never>; Enums: { member_role: Role }; CompositeTypes: Record<string, never> } }
