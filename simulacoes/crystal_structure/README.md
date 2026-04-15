# Estruturas cristalinas

Este diretório contém um gerador simples das posições atômicas das principais estruturas cristalinas.

Estruturas incluídas:
- `sc`: cúbica simples
- `bcc`: cúbica de corpo centrado
- `fcc`: cúbica de face centrada
- `hcp`: hexagonal compacta
- `diamond`: estrutura diamante
- `zb`: zinc blende (ZnS)
- `wz`: wurtzita (ZnS)
- `graphene`: célula primitiva do grafeno

Para gerar os arquivos:

```bash
python3 generate_crystal_structures.py
```

Os arquivos são salvos em `estruturas_xyz/`, um arquivo `.xyz` por estrutura.

O diretório também inclui um site interativo:

- `../crystal_structure.html`
- `webui/app.js`
- `webui/data.js`
- `webui/styles.css`

No visualizador:
- cristais 3D são exibidos como supercélulas `4x4x4`
- grafeno é expandido em `6x6`
- estruturas 3D têm botões para exibir planos cristalográficos principais
- existe um painel `Comparar BCC/FCC/Cubic` com três supercélulas menores e rotação sincronizada

Para abrir o visualizador no navegador com um servidor local:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.
