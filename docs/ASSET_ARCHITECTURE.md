# Arquitetura de assets

## Estado desta etapa

Os assets destinados ao frontend ficam em `public/assets/`. Os originais permanecem preservados em `assets/` até a validação final da integração.

Inventário conferido:

- 72 de 72 ícones encontrados e organizados;
- 6 de 6 personagens encontrados;
- 12 de 12 imagens de regiões e ilhas encontradas; as nove anteriores permanecem em WebP e as três novas preservam os nomes e o formato PNG fornecidos;
- logo e favicon encontrados;
- o SVG interativo, o PNG recortado do continente e a textura de água foram conferidos e copiados para `public/assets/maps/`, mantendo os originais em `assets/mapa/`.

Os SVGs copiados mantêm o conteúdo original. Somente os nomes e diretórios de destino foram normalizados. Os nomes consumidos pelo código usam kebab-case, sem acentos.

## Estrutura final

```text
public/assets/
├── brand/
├── icons/
│   ├── classes/
│   ├── attributes/
│   ├── settlements/
│   ├── locations/
│   ├── exploration/
│   ├── threats/
│   ├── mechanics/
│   ├── conditions/
│   ├── character-sheet/
│   └── navigation/
├── characters/
├── regions/
└── maps/
```

## Registries

| Arquivo | Responsabilidade | Tipo de chave exportado |
| --- | --- | --- |
| `src/assets/iconRegistry.ts` | 72 ícones, rótulos e categorias | `IconName` |
| `src/assets/characterRegistry.ts` | seis artes de classe | `CharacterClassKey` |
| `src/assets/regionRegistry.ts` | nove regiões e aliases normalizados | `RegionKey` |
| `src/assets/brandRegistry.ts` | logo, símbolo e favicon | `BrandAssetName` |

Todos os caminhos passam por `publicAssetUrl`, respeitando o `BASE_URL` usado no GitHub Pages.

## Mapeamento de brand

| Origem | Destino | Operação |
| --- | --- | --- |
| `assets/logo relicario.svg` | `public/assets/brand/logo-relicario.svg` | cópia e renomeação |
| `assets/favicon.svg` | `public/assets/brand/favicon.svg` | cópia |
| — | `public/assets/brand/simbolo-relicario.svg` | símbolo já preparado na execução anterior |

## Mapeamento de personagens

| Origem | Destino |
| --- | --- |
| `assets/personagens/arcanista.svg` | `public/assets/characters/arcanista.svg` |
| `assets/personagens/bardo.svg` | `public/assets/characters/bardo.svg` |
| `assets/personagens/druida.svg` | `public/assets/characters/druida.svg` |
| `assets/personagens/guerreiro.svg` | `public/assets/characters/guerreiro.svg` |
| `assets/personagens/lamina-sombria.svg` | `public/assets/characters/lamina-sombria.svg` |
| `assets/personagens/necromante.svg` | `public/assets/characters/necromante.svg` |

## Mapeamento de regiões

| Origem PNG | Destino WebP |
| --- | --- |
| `assets/bg-regioes/Cordilheira de Ferro.png` | `public/assets/regions/cordilheira-de-ferro.webp` |
| `assets/bg-regioes/Costa Quebrada.png` | `public/assets/regions/costa-quebrada.webp` |
| `assets/bg-regioes/Deserto Branco.png` | `public/assets/regions/deserto-branco.webp` |
| `assets/bg-regioes/Estepes do Norte.png` | `public/assets/regions/estepes-do-norte.webp` |
| `assets/bg-regioes/Pantanos Negros.png` | `public/assets/regions/pantanos-negros.webp` |
| `assets/bg-regioes/Peninsula dos Mosteiros.png` | `public/assets/regions/peninsula-dos-mosteiros.webp` |
| `assets/bg-regioes/Terras Cinzentas.png` | `public/assets/regions/terras-cinzentas.webp` |
| `assets/bg-regioes/Vale de Ardan - Floresta Antiga.png` | `public/assets/regions/vale-de-ardan-floresta-antiga.webp` |
| `assets/bg-regioes/Vale de Ardan.png` | `public/assets/regions/vale-de-ardan.webp` |
| `assets/bg-regioes/Arquipelago de Vesper.png` | `public/assets/regions/Arquipelago de Vesper.png` |
| `assets/bg-regioes/Ilhas Cinzentas.png` | `public/assets/regions/Ilhas Cinzentas.png` |
| `assets/bg-regioes/Ormara.png` | `public/assets/regions/Ormara.png` |

## Mapeamento dos ícones

O prefixo numérico do arquivo original foi removido no destino.

### `icons/classes` (6)

| Origem | Destino |
| --- | --- |
| `01-guerreiro.svg` | `guerreiro.svg` |
| `02-arcanista.svg` | `arcanista.svg` |
| `03-lamina-sombria.svg` | `lamina-sombria.svg` |
| `04-necromante.svg` | `necromante.svg` |
| `05-bardo.svg` | `bardo.svg` |
| `06-druida.svg` | `druida.svg` |

### `icons/attributes` (5)

| Origem | Destino |
| --- | --- |
| `07-forca.svg` | `forca.svg` |
| `08-agilidade.svg` | `agilidade.svg` |
| `09-intelecto.svg` | `intelecto.svg` |
| `10-presenca.svg` | `presenca.svg` |
| `11-instinto.svg` | `instinto.svg` |

### `icons/settlements` (8)

| Origem | Destino |
| --- | --- |
| `13-metropole.svg` | `metropole.svg` |
| `14-cidade.svg` | `cidade.svg` |
| `15-vila.svg` | `vila.svg` |
| `16-fortaleza.svg` | `fortaleza.svg` |
| `17-castelo.svg` | `castelo.svg` |
| `18-acampamento.svg` | `acampamento.svg` |
| `19-mosteiro.svg` | `mosteiro.svg` |
| `20-observatorio.svg` | `observatorio.svg` |

### `icons/locations` (6)

| Origem | Destino |
| --- | --- |
| `21-ruinas.svg` | `ruinas.svg` |
| `22-caverna.svg` | `caverna.svg` |
| `23-mina.svg` | `mina.svg` |
| `24-porto.svg` | `porto.svg` |
| `25-ponte-passagem.svg` | `ponte-passagem.svg` |
| `26-estrada.svg` | `estrada.svg` |

### `icons/exploration` (4)

| Origem | Destino |
| --- | --- |
| `27-local-revelado.svg` | `local-revelado.svg` |
| `28-local-oculto.svg` | `local-oculto.svg` |
| `29-missao.svg` | `missao.svg` |
| `30-rumor.svg` | `rumor.svg` |

### `icons/threats` (6)

| Origem | Destino |
| --- | --- |
| `31-monstro.svg` | `monstro.svg` |
| `32-chefe.svg` | `chefe.svg` |
| `33-covil.svg` | `covil.svg` |
| `34-corrupcao.svg` | `corrupcao.svg` |
| `35-armadilha.svg` | `armadilha.svg` |
| `36-rota-bloqueada.svg` | `rota-bloqueada.svg` |

### `icons/mechanics` (6)

| Origem | Destino |
| --- | --- |
| `12-teste-d20.svg` | `teste-d20.svg` |
| `37-vitalidade.svg` | `vitalidade.svg` |
| `38-recurso-de-classe.svg` | `recurso-de-classe.svg` |
| `39-defesa.svg` | `defesa.svg` |
| `40-dano.svg` | `dano.svg` |
| `41-cura.svg` | `cura.svg` |

### `icons/conditions` (7)

| Origem | Destino |
| --- | --- |
| `42-condicao-generica.svg` | `condicao-generica.svg` |
| `43-ferido.svg` | `ferido.svg` |
| `44-exausto.svg` | `exausto.svg` |
| `45-amedrontado.svg` | `amedrontado.svg` |
| `46-envenenado.svg` | `envenenado.svg` |
| `47-imobilizado.svg` | `imobilizado.svg` |
| `48-desorientado.svg` | `desorientado.svg` |

### `icons/character-sheet` (12)

| Origem | Destino |
| --- | --- |
| `49-inventario.svg` | `inventario.svg` |
| `50-equipamento.svg` | `equipamento.svg` |
| `51-habilidades.svg` | `habilidades.svg` |
| `52-nivel.svg` | `nivel.svg` |
| `53-ouro.svg` | `ouro.svg` |
| `54-diario.svg` | `diario.svg` |
| `55-capacete.svg` | `capacete.svg` |
| `56-armadura.svg` | `armadura.svg` |
| `57-luvas.svg` | `luvas.svg` |
| `58-botas.svg` | `botas.svg` |
| `59-anel.svg` | `anel.svg` |
| `60-amuleto.svg` | `amuleto.svg` |

### `icons/navigation` (12)

| Origem | Destino |
| --- | --- |
| `61-campanhas.svg` | `campanhas.svg` |
| `62-personagens.svg` | `personagens.svg` |
| `63-mapa.svg` | `mapa.svg` |
| `64-mesa.svg` | `mesa.svg` |
| `65-compendio.svg` | `compendio.svg` |
| `66-configuracoes.svg` | `configuracoes.svg` |
| `67-nova-campanha.svg` | `nova-campanha.svg` |
| `68-exportar-para-gpt.svg` | `exportar-para-gpt.svg` |
| `69-missao-de-campanha.svg` | `missao-de-campanha.svg` |
| `70-npc.svg` | `npc.svg` |
| `71-mestre.svg` | `mestre.svg` |
| `72-assento-vazio.svg` | `assento-vazio.svg` |

## Mapeamento do mapa de Auren

| Origem | Destino | Uso |
| --- | --- | --- |
| `assets/mapa/agua.jpg` | `public/assets/maps/agua.jpg` | textura repetível de água, 1000 × 1000 px |
| `assets/mapa/mapa-realista-cortado.png` | `public/assets/maps/mapa-realista-cortado.png` | camada artística recortada e transparente, 1593 × 916 px |
| `assets/mapa/mapa-auren.svg` | `public/assets/maps/mapa-auren.svg` | geometria e interação, `viewBox="0 0 1591.7 916.3"` |

Os caminhos, dimensões e o `viewBox` são centralizados em `src/assets/mapRegistry.ts`. O SVG original não é reescrito: `prepareAurenSvg` prepara somente a cópia carregada no navegador com semântica, foco e atributos de interação.

### Arquitetura de camadas do mapa

1. `.auren-map__water` cobre todo o viewport com uma única camada e recebe `agua.jpg` diretamente em `background-image`. A imagem usa `repeat`, e o tamanho responsivo vem de `--auren-water-tile-size`, sem ampliar um único sprite nem criar elementos duplicados.
2. `.auren-map__stage` é o único plano sujeito a fit, zoom e pan. Seu tamanho lógico é 1591,7 × 916,3 e ele permanece centralizado no viewport.
3. `mapa-realista-cortado.png` ocupa toda a caixa lógica como camada artística (`z-index: 1`).
4. `mapa-auren.svg` ocupa a mesma caixa e o mesmo plano de transformação como camada interativa (`z-index: 2`). Seus IDs reais são associados em `aurenRegions`, sem alteração da geometria.
5. Marcadores revelados ficam acima do SVG (`z-index: 3`) e tooltips acima das camadas do mapa (`z-index: 4`). Estados de carregamento e erro ficam no topo.

IDs interativos confirmados no SVG: `vale-de-ardan`, `floresta-de-nhalor`, `costa-quebrada`, `cordilheira-de-ferro`, `pantanos-de-varg`, `deserto-de-sal`, `mar-de-cinzas`, `peninsula-da-aurora`, `estepes-do-norte`, `arquipelago-de-vesper`, `ilhas-cinzentas` e `ormara`. `divisoes-internas` e `contorno-geral` permanecem camadas passivas e são ocultadas na cópia preparada no navegador, sem alterar a geometria do arquivo original.

O viewport captura a roda do mouse com um listener não passivo: enquanto o cursor está sobre o mapa, a roda controla somente o zoom. O pan usa eventos de ponteiro e bloqueia o arraste nativo do PNG e do SVG. A rolagem normal da página continua disponível fora do mapa, com a barra visual ocultada.

## Pendências reais

- Ainda não existem dados reais de locais revelados para alimentar marcadores no mapa.
- Os originais em `assets/` só devem ser removidos depois da validação visual e funcional final.
