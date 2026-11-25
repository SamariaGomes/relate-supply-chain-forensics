# Relate Supply Chain Forensics
Auditoria forense de dependências transitivas e vulnerabilidades 100% no navegador com Relate (WebAssembly).

## Caso de uso
Arquivos `package-lock.json` possuem centenas de dependências transitivas onde vulnerabilidades críticas ficam escondidas vários níveis abaixo dos pacotes diretos. Listas planas de CVEs não mostram *qual* dependência raiz introduziu o risco nem se ela afeta o ambiente de produção. Este projeto modela o grafo de dependências e CVEs reais (via OSV.dev) diretamente no navegador, garantindo privacidade total (zero upload de código proprietário para servidores).

## Como utiliza o Relate
- **Modo:** Arquivo único (`supply-chain-audit.relate`) + execução embarcada no navegador via WebAssembly.
- **Por que esse modo:** Permite inspecionar grafos de segurança de forma privada no navegador e exportar toda a auditoria em um único arquivo portátil para compartilhamento entre equipes e agentes de IA.
- **O que os modelos gráficos representam:**
  - `(:Project)` — O repositório/aplicação analisada.
  - `(:Package)` — Pacotes diretos e transitivos com escopo (`prod` ou `dev`).
  - `(:Vulnerability)` — CVEs e alertas de segurança obtidos em lote na API OSV.dev.
  - `[:DEPENDS_ON]` e `[:HAS_VULNERABILITY]` — Relações que permitem consultas Cypher multi-hop para isolar pontos de entrada e raio de impacto.

## Configurar e executar
1. Clone o repositório:
   ```bash
   git clone [https://github.com/SEU-USUARIO/relate-supply-chain-forensics.git](https://github.com/SEU-USUARIO/relate-supply-chain-forensics.git)
   cd relate-supply-chain-forensics