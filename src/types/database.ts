export type Role = 'player' | 'table_admin'
export type ClassKey = 'warrior'|'arcanist'|'shadow_blade'|'necromancer'|'bard'|'druid'
export type Attributes = { strength:number; agility:number; intellect:number; presence:number; instinct:number }
export type Specialty = 'Atletismo'|'Acrobacia'|'Furtividade'|'Investigação'|'Percepção'|'Sobrevivência'|'Medicina'|'Persuasão'|'Intimidação'|'História'|'Arcanismo'|'Performance'|'Rastreamento'|'Alquimia'
export type CharacterSpecialty = { character_id:string; name:Specialty; source:'class'|'free'; created_at:string }
export type AvatarOptions = { presentation:string; skinTone:string; hair:string; primaryColor:string; secondaryColor:string; accessory:string; layerColors?: Record<string, string> }
export type CharacterCondition = { id: string; character_id: string; name: string; created_by: string; created_at: string }
export type CharacterState = { character_id: string; vitality_current: number; vitality_max: number; resource_current: number; resource_max: number; updated_at: string; updated_by: string }
export type Character = { id:string; campaign_id:string|null; owner_id:string; name:string; class_key:ClassKey; level:number; presentation:string; origin:string; appearance:string; personality:string; objective:string; fear:string; initial_bond:string; current_bond:string; attributes:Attributes; defense:number; inventory_capacity:number; avatar:AvatarOptions; created_at:string; updated_at:string; character_states:CharacterState|null; character_conditions:CharacterCondition[]; character_specialties:CharacterSpecialty[] }

export type SessionStatus = 'active' | 'ended' | 'archived'
export type CampaignSession = { id: string; campaign_id: string; number: number; title: string; status: SessionStatus; started_by: string; started_at: string; ended_at: string | null; created_at: string }

export type EventSource = 'player' | 'gpt' | 'system' | 'admin'
export type CampaignEvent = { id: string; sequence: number; campaign_id: string; session_id: string | null; source: EventSource; user_id: string | null; character_id: string | null; event_type: string; summary: string; payload: Record<string, unknown>; payload_version: number; is_test: boolean; is_archived: boolean; created_at: string }

export type CampaignEventPrefs = { campaign_id: string; user_id: string; hidden_before_sequence: number; updated_at: string }

export type RollRequestStatus = 'pending' | 'completed' | 'cancelled'
export type DiceSpecItem = { sides: 4 | 6 | 8 | 10 | 12 | 20 | 100; quantity: number }
export type RollRequestKind = 'character_test' | 'dice_pool'
export type RollRequest = { id: string; campaign_id: string; session_id: string | null; requested_character_id: string | null; requested_by: string; request_kind?: RollRequestKind; dice_spec?: DiceSpecItem[] | null; attribute: keyof Attributes | null; specialty: Specialty | null; modifier: number; reason: string; difficulty: number | null; status: RollRequestStatus; source: 'admin' | 'gpt' | 'system'; requested_at: string; completed_at: string | null; resulting_roll_id: string | null }

export type DiceKind = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'
export type RollOutcome = 'success' | 'failure' | 'critical_success' | 'critical_failure'
export type DiceResultGroup = { sides: DiceSpecItem['sides']; results: number[] }
export type DiceRoll = { id: string; campaign_id: string; session_id: string | null; character_id: string; rolled_by: string; roll_request_id: string | null; request_kind: RollRequestKind; dice_spec: DiceSpecItem[] | null; dice_results: DiceResultGroup[] | null; subtotal: number; dice: DiceKind; count: number; modifier: number; attribute: keyof Attributes | null; specialty: Specialty | null; difficulty: number | null; results: number[]; total: number; outcome: RollOutcome | null; label: string; is_test: boolean; created_at: string; event_id: string | null }
export type RegionId = 'vale-de-ardan'|'floresta-de-nhalor'|'costa-quebrada'|'cordilheira-de-ferro'|'pantanos-de-varg'|'deserto-de-sal'|'mar-de-cinzas'|'peninsula-da-aurora'|'estepes-do-norte'|'arquipelago-de-vesper'|'ilhas-cinzentas'|'ormara'
export type Campaign = { id: string; name: string; status: string; premise: string; current_summary: string; current_region_id: RegionId | null; last_session_summary: string; active_objectives: string[]; important_notes: string; created_at: string; created_by: string; updated_at: string }
export type CampaignMember = { campaign_id: string; user_id: string; role: Role; seat: number; joined_at: string; profile?: Profile | null }
export type CampaignLocation = { id: string; campaign_id: string; name: string; region_id: RegionId; kind: string | null; x: number; y: number; revealed: boolean; created_at: string }
export type Profile = { id: string; display_name: string; gpt_master_url: string | null; created_at: string; updated_at: string }

export type GptConnectionPermission = 'read_snapshot' | 'request_roll'
export type GptCampaignConnection = { id: string; campaign_id: string; label: string; permissions: GptConnectionPermission[]; created_at: string; last_used_at: string | null; revoked_at: string | null }
export type GptCampaignConnectionCreated = { id: string; raw_key: string; label: string; permissions: GptConnectionPermission[]; created_at: string }
export type CampaignPreparationResult = { archived_campaign_id: string; new_campaign_id: string; character_map: Record<string, string> }

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
  campaign_sessions: Table<CampaignSession>
  campaign_events: Table<CampaignEvent, Partial<CampaignEvent>, Pick<CampaignEvent, 'is_archived'>>
  campaign_event_prefs: Table<CampaignEventPrefs, CampaignEventPrefs, Partial<CampaignEventPrefs>>
  roll_requests: Table<RollRequest>
  dice_rolls: Table<DiceRoll>
}; Views: Record<string, never>; Functions: {
  create_my_character:{Args:{payload:unknown};Returns:string}
  assign_character_to_campaign:{Args:{target_character:string;target_campaign:string};Returns:void}
  create_campaign:{Args:{payload:unknown};Returns:Campaign}
  archive_campaign:{Args:{target_campaign:string};Returns:void}
  start_campaign_session:{Args:{target_campaign:string;session_title:string};Returns:CampaignSession}
  request_dice_roll:{Args:{payload:unknown};Returns:RollRequest}
  request_dice_pool:{Args:{payload:unknown};Returns:RollRequest}
  cancel_roll_request:{Args:{target_request:string};Returns:void}
  perform_dice_roll:{Args:{payload:unknown};Returns:unknown}
  get_campaign_snapshot:{Args:{target_campaign:string};Returns:unknown}
  list_gpt_campaign_connections:{Args:{p_campaign_id:string};Returns:GptCampaignConnection[]}
  create_gpt_campaign_connection:{Args:{target_campaign:string;connection_label:string;connection_permissions:GptConnectionPermission[]};Returns:unknown}
  revoke_gpt_campaign_connection:{Args:{target_connection:string};Returns:void}
  prepare_clean_campaign_copy:{Args:{p_source_campaign_id:string;p_new_campaign_name:string;p_request_id:string};Returns:CampaignPreparationResult}
}; Enums: { member_role: Role }; CompositeTypes: Record<string, never> } }
