// Legado (JWT de usuário). Ainda responde MIGRATION_REQUIRED mesmo com
// campaign_locations/current_region_id já existentes desde 202607160001;
// superada por campaign-snapshot, que já lê essa persistência corretamente.
import { authenticatedClient, body, failure, methodGuard, requireMembership, ApiError } from '../_shared/http.ts'
import { validateCampaignRequest } from '../_shared/contracts.ts'
Deno.serve(async request=>{const guarded=methodGuard(request);if(guarded)return guarded;try{const input=await body(request);if(!validateCampaignRequest(input))throw new ApiError('INVALID_ACTION','campaign_id deve ser um UUID válido.');const{client}=await authenticatedClient(request);await requireMembership(client,input.campaign_id);throw new ApiError('MIGRATION_REQUIRED','Regiões conhecidas e locais revelados ainda não possuem persistência por campanha.',503)}catch(error){return failure(request,error)}})
