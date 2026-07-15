import { publicAssetUrl } from '../assets/publicAssetUrl'

export const regionDescriptions = {
  'vale-de-ardan':
    'Uma ampla região de terras férteis, rios ramificados e campos cultivados, situada no coração de Auren. Suas estradas e cursos d’água conectam diferentes partes do continente, tornando o vale uma zona de passagem e encontro.',

  'floresta-de-nhalor':
    'Uma floresta antiga e profunda, formada por árvores monumentais, vales úmidos e caminhos encobertos pela vegetação. A luz atravessa o dossel com dificuldade, criando uma atmosfera silenciosa, viva e difícil de atravessar.',

  'costa-quebrada':
    'Uma faixa costeira recortada por penhascos, enseadas estreitas e formações rochosas castigadas pelo mar. O terreno acidentado e as águas inquietas fazem da região uma ligação difícil entre o interior de Auren e o oceano ocidental.',

  'cordilheira-de-ferro':
    'Uma cadeia de montanhas escuras e escarpadas que atravessa o centro de Auren. Seus picos, desfiladeiros e passagens estreitas formam uma barreira natural entre as regiões do norte e as terras centrais.',

  'pantanos-de-varg':
    'Uma extensa região de águas rasas, solo instável e vegetação densa no sudoeste de Auren. Névoa, canais sinuosos e áreas alagadas tornam a orientação difícil e escondem boa parte da paisagem.',

  'deserto-de-sal':
    'Uma vastidão clara de sal, pedra branca e planícies ressecadas no sudeste de Auren. A luz intensa, a escassez de água e as superfícies rachadas fazem da travessia uma experiência árida e desorientadora.',

  'mar-de-cinzas':
    'Uma região meridional marcada por solo escuro, cinzas vulcânicas e montanhas de origem ígnea. O terreno permanece seco e instável, atravessado por formações rochosas e sinais de atividade vulcânica antiga.',

  'peninsula-da-aurora':
    'Uma península oriental de falésias elevadas, caminhos de pedra e construções isoladas voltadas para o céu e o mar. Sua paisagem aberta e silenciosa favorece a contemplação, o estudo e o afastamento das regiões centrais.',

  'estepes-do-norte':
    'Uma imensa extensão de campos congelados, rios cobertos de gelo e montanhas distantes. O clima rigoroso, a vegetação escassa e as longas distâncias tornam o norte uma das regiões mais isoladas de Auren.',

  'arquipelago-de-vesper':
    'Um conjunto de ilhas rochosas a oeste de Auren, separadas por canais estreitos, enseadas e águas agitadas. Penhascos, cavernas costeiras e névoa constante dão ao arquipélago uma aparência remota e fragmentada.',

  'ilhas-cinzentas':
    'Uma cadeia de ilhas escuras e frias ao sul do continente, formada por costas rochosas, vegetação escassa e estruturas antigas desgastadas pelo tempo. A névoa e o isolamento reforçam a sensação de abandono que domina a região.',

  ormara:
    'Uma grande ilha isolada no mar oriental, cercada por falésias e terrenos elevados. Florestas, caminhos antigos e construções dispersas sugerem uma região autônoma, distante e pouco conectada ao restante de Auren.',
} as const

export type RegionDefinition = {
  name: string
  registryName: string
  aliases: readonly string[]
  description: string
  image: string
  assetKey: string
}

export const regions = {
  'vale-de-ardan': { name: 'Vale de Ardan', registryName: 'Vale de Ardan', aliases: ['Vale de Ardan'], description: regionDescriptions['vale-de-ardan'], image: publicAssetUrl('regions/vale-de-ardan.webp'), assetKey: 'vale-de-ardan' },
  'floresta-de-nhalor': { name: 'Floresta de Nhalor', registryName: 'Floresta Antiga', aliases: ['Floresta de Nhalor', 'Floresta Antiga', 'Vale de Ardan - Floresta Antiga'], description: regionDescriptions['floresta-de-nhalor'], image: publicAssetUrl('regions/vale-de-ardan-floresta-antiga.webp'), assetKey: 'floresta-antiga' },
  'costa-quebrada': { name: 'Costa Quebrada', registryName: 'Costa Quebrada', aliases: ['Costa Quebrada'], description: regionDescriptions['costa-quebrada'], image: publicAssetUrl('regions/costa-quebrada.webp'), assetKey: 'costa-quebrada' },
  'cordilheira-de-ferro': { name: 'Cordilheira de Ferro', registryName: 'Cordilheira de Ferro', aliases: ['Cordilheira de Ferro'], description: regionDescriptions['cordilheira-de-ferro'], image: publicAssetUrl('regions/cordilheira-de-ferro.webp'), assetKey: 'cordilheira-de-ferro' },
  'pantanos-de-varg': { name: 'Pântanos de Varg', registryName: 'Pântanos Negros', aliases: ['Pântanos de Varg', 'Pântanos Negros', 'Pantanos Negros'], description: regionDescriptions['pantanos-de-varg'], image: publicAssetUrl('regions/pantanos-negros.webp'), assetKey: 'pantanos-negros' },
  'deserto-de-sal': { name: 'Deserto de Sal', registryName: 'Deserto Branco', aliases: ['Deserto de Sal', 'Deserto Branco'], description: regionDescriptions['deserto-de-sal'], image: publicAssetUrl('regions/deserto-branco.webp'), assetKey: 'deserto-branco' },
  'mar-de-cinzas': { name: 'Mar de Cinzas', registryName: 'Terras Cinzentas', aliases: ['Mar de Cinzas', 'Terras Cinzentas'], description: regionDescriptions['mar-de-cinzas'], image: publicAssetUrl('regions/terras-cinzentas.webp'), assetKey: 'terras-cinzentas' },
  'peninsula-da-aurora': { name: 'Península da Aurora', registryName: 'Península dos Mosteiros', aliases: ['Península da Aurora', 'Península dos Mosteiros', 'Peninsula dos Mosteiros'], description: regionDescriptions['peninsula-da-aurora'], image: publicAssetUrl('regions/peninsula-dos-mosteiros.webp'), assetKey: 'peninsula-dos-mosteiros' },
  'estepes-do-norte': { name: 'Estepes do Norte', registryName: 'Estepes do Norte', aliases: ['Estepes do Norte'], description: regionDescriptions['estepes-do-norte'], image: publicAssetUrl('regions/estepes-do-norte.webp'), assetKey: 'estepes-do-norte' },
  'arquipelago-de-vesper': { name: 'Arquipélago de Vesper', registryName: 'Arquipélago de Vesper', aliases: ['Arquipélago de Vesper', 'Arquipelago de Vesper'], description: regionDescriptions['arquipelago-de-vesper'], image: publicAssetUrl('regions/Arquipelago de Vesper.png'), assetKey: 'arquipelago-de-vesper' },
  'ilhas-cinzentas': { name: 'Ilhas Cinzentas', registryName: 'Ilhas Cinzentas', aliases: ['Ilhas Cinzentas'], description: regionDescriptions['ilhas-cinzentas'], image: publicAssetUrl('regions/Ilhas Cinzentas.png'), assetKey: 'ilhas-cinzentas' },
  ormara: { name: 'Ormara', registryName: 'Ormara', aliases: ['Ormara'], description: regionDescriptions.ormara, image: publicAssetUrl('regions/Ormara.png'), assetKey: 'ormara' },
} as const satisfies Record<string, RegionDefinition>

export type RegionId = keyof typeof regions
export const regionIds = Object.keys(regions) as RegionId[]
