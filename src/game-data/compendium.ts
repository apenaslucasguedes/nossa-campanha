import type { IconName } from '../assets/iconRegistry'
import { regionKeys, regionRegistry } from '../assets/regionRegistry'
import type { Attributes, ClassKey, Specialty } from '../types/database'
import { ATTRIBUTE_KEYS, ATTRIBUTE_NAMES, CLASSES, SPECIALTIES } from './classes'
import { SPECIALTY_ATTRIBUTES, enemyStats, type EnemyLevel } from './table'

export const ATTRIBUTE_REFERENCE: Record<keyof Attributes, { icon: IconName; definition: string; actions: string; mechanics: string }> = {
  strength:{icon:'forca',definition:'Potência física, carga e impacto.',actions:'Atletismo, esforço físico, carga e golpes de força.',mechanics:'Soma-se à Vitalidade e define a capacidade de inventário.'},
  agility:{icon:'agilidade',definition:'Reflexos, precisão e movimento.',actions:'Acrobacia, Furtividade, equilíbrio e precisão.',mechanics:'Soma-se à Defesa.'},
  intellect:{icon:'intelecto',definition:'Raciocínio, estudo e magia.',actions:'Investigação, Medicina, História, Arcanismo e Alquimia.',mechanics:'Modifica testes de Intelecto e especialidades relacionadas.'},
  presence:{icon:'presenca',definition:'Influência, expressão e liderança.',actions:'Persuasão, Intimidação e Performance.',mechanics:'Modifica testes de Presença e especialidades relacionadas.'},
  instinct:{icon:'instinto',definition:'Percepção, resistência e intuição.',actions:'Percepção, Sobrevivência e Rastreamento.',mechanics:'Soma-se à Vitalidade e à Defesa.'},
}

export const SPECIALTY_DESCRIPTIONS: Record<Specialty,string> = {
  Atletismo:'Ações de força, corrida, escalada e esforço físico.',Acrobacia:'Equilíbrio, quedas, saltos e manobras corporais.',Furtividade:'Mover-se e agir sem chamar atenção.',Investigação:'Encontrar pistas e interpretar evidências.',Percepção:'Notar ameaças, detalhes e mudanças no ambiente.',Sobrevivência:'Orientação, abrigo e resistência em regiões hostis.',Medicina:'Avaliar ferimentos e prestar cuidados.',Persuasão:'Convencer por diálogo, confiança e argumento.',Intimidação:'Pressionar alguém por presença ou ameaça.',História:'Recordar povos, eventos, lugares e tradições.',Arcanismo:'Reconhecer fenômenos, rituais e forças mágicas.',Performance:'Mobilizar uma audiência com arte e expressão.',Rastreamento:'Seguir sinais, trilhas e movimentos recentes.',Alquimia:'Identificar e preparar compostos e reagentes.'
}

export const CONDITIONS = [
  {name:'Ferido',icon:'ferido'},{name:'Exausto',icon:'exausto'},{name:'Amedrontado',icon:'amedrontado'},{name:'Envenenado',icon:'envenenado'},{name:'Imobilizado',icon:'imobilizado'},{name:'Desorientado',icon:'desorientado'},{name:'Corrompido',icon:'condicao-generica'},{name:'Caído',icon:'condicao-generica'},
] as const satisfies readonly {name:string;icon:IconName}[]

export const RULES = [
  {name:'Teste básico',icon:'teste-d20',text:'Role 1d20 e some o atributo. Uma especialidade treinada e relacionada acrescenta +1.'},
  {name:'Dificuldades',icon:'teste-d20',text:'O total do teste é comparado à dificuldade definida para a ação.'},
  {name:'Crítico e complicação',icon:'teste-d20',text:'Um 20 natural é crítico. Um 1 natural é complicação.'},
  {name:'Ataque',icon:'dano',text:'Um ataque acerta quando o total é igual ou superior à Defesa do alvo.'},
  {name:'Dano',icon:'dano',text:'O dano reduz a Vitalidade, sem ultrapassar zero.'},
  {name:'Cura',icon:'cura',text:'A cura recupera Vitalidade, sem ultrapassar o valor máximo.'},
  {name:'Vitalidade',icon:'vitalidade',text:'No nível 1: Vitalidade base da classe + Força × 2 + Instinto.'},
  {name:'Recurso de classe',icon:'recurso-de-classe',text:'No nível 1: recurso base da classe + seu atributo principal. O valor permanece entre zero e o máximo.'},
  {name:'Defesa',icon:'defesa',text:'Defesa = 8 + Agilidade + Instinto.'},
  {name:'Iniciativa',icon:'agilidade',text:'A ordem usa a iniciativa em valor decrescente; empates são ordenados pelo identificador.'},
  {name:'Zonas de combate',icon:'mesa',text:'As zonas disponíveis são corpo a corpo, perto, distante e fora de alcance.'},
  {name:'Condições',icon:'condicao-generica',text:'Condições podem durar rodadas, uma cena ou tempo indefinido. Efeitos individuais ainda não estão documentados.'},
  {name:'Queda e estabilização',icon:'vitalidade',text:'Vitalidade zero ou a marca Caído coloca o personagem em queda. A Mesa permite marcar sua estabilização.'},
] as const satisfies readonly {name:string;icon:IconName;text:string}[]

export const ENEMY_LEVELS = [1,2,3,4,5] as const
export const ENEMY_CATEGORIES = ['lacaio','comum','elite','chefe'] as const
export const ENEMY_ARCHETYPES = ['brutamontes','guardião','perseguidor','atirador','controlador','conjurador','suporte'] as const
export const ENEMY_REFERENCES = ENEMY_LEVELS.flatMap(level=>ENEMY_CATEGORIES.map(category=>({level,category,stats:enemyStats(level,category)})))

export const COMPENDIUM_SOURCE = { classes:CLASSES, attributes:ATTRIBUTE_KEYS.map(key=>({key,name:ATTRIBUTE_NAMES[key],...ATTRIBUTE_REFERENCE[key]})), specialties:SPECIALTIES.map(name=>({name,attribute:SPECIALTY_ATTRIBUTES[name],description:SPECIALTY_DESCRIPTIONS[name]})), conditions:CONDITIONS, rules:RULES, regions:regionKeys.map(key=>({key,...regionRegistry[key]})), enemies:ENEMY_REFERENCES }
export const classIcon = (key:ClassKey):IconName => ({warrior:'guerreiro',arcanist:'arcanista',shadow_blade:'lamina-sombria',necromancer:'necromante',bard:'bardo',druid:'druida'} as const)[key]
export const attributeName = (key:keyof Attributes|undefined)=>key?ATTRIBUTE_NAMES[key]:'Sem atributo documentado'
export type CompendiumCategory = 'classes'|'attributes'|'specialties'|'conditions'|'rules'|'regions'|'locations'|'enemies'|'items'
export type EnemyFilter = EnemyLevel|'all'
