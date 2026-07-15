# Relicário Visual System

## Theme

Interface escura editorial de fantasia medieval. O cenário físico é uma mesa em luz baixa onde duas pessoas consultam um registro mecânico; carvão, madeira escurecida e metal envelhecido definem as superfícies.

## Color

- Obsidiana `#0b0b0a`: fundo principal.
- Carvão `#171612`: painéis e navegação.
- Ferro `#2b2821`: superfícies elevadas e controles.
- Pergaminho `#eee6d4`: texto principal e ações sólidas.
- Ouro antigo `#b79a5c`: seleção, foco e pequenos pontos de orientação.
- Ferrugem `#974f40`: dano, alertas e ênfase mecânica.
- Musgo `#687650`: estados positivos e cura.
- Mineral `#56728f`: recurso de classe e informação.

O dourado é um sinal funcional e não uma textura decorativa dominante. Texto corrido usa tons claros suficientes para contraste AA.

## Typography

Títulos usam Georgia ou Times New Roman como serif expressiva e disponível localmente. Interface, formulários e dados usam Inter quando disponível, seguida de system-ui e Segoe UI. Títulos de página têm escala editorial contida; rótulos e botões nunca usam a fonte display.

## Layout

Sidebar fixa no desktop, coluna principal ampla e divisões internas por linhas finas. Em telas médias, a navegação recolhe; no celular, uma barra inferior mantém as quatro rotas prioritárias e um menu expõe as demais. Componentes usam cantos de até 8 px, pouco relevo e sem cartões aninhados.

## Components

- Cabeçalhos combinam título, descrição e ações sem métricas heroicas.
- Painéis usam borda quente fina ou divisão interna, nunca sombra larga junto de borda.
- Botão primário é claro e sólido; secundário é escuro com borda; ações destrutivas usam ferrugem.
- Retratos usam exclusivamente a arte da classe persistida.
- Ícones são carregados pelo registro central e herdam tamanho, não cor interna redesenhada.
- Imagens de região recebem overlay apenas onde necessário e nunca reduzem a legibilidade do texto.
- Loading usa estrutura discreta; erro explica a ação seguinte; estado vazio ensina o limite real.

## Motion

Transições de 150–220 ms comunicam hover, foco e abertura de navegação. Nada depende de animação para ficar visível. `prefers-reduced-motion` reduz todas as transições e animações ao mínimo.

## Signature

A assinatura do Relicário é o encontro entre o símbolo vertical real da marca, linhas de registro e faixas de região: a interface parece um arquivo mecânico de campanha, não um painel administrativo tematizado.
