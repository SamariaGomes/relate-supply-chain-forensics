export interface PresetQuery {
  id: string;
  title: string;
  description: string;
  cypher: string;
}

export const PRESET_QUERIES: PresetQuery[] = [
  {
    id: 'transitive-critical',
    title: '1. Cadeia Transitiva Crítica',
    description: 'Encontra dependências diretas que puxam vulnerabilidades graves vários níveis abaixo.',
    cypher: `MATCH path = (proj:Project)-[:DEPENDS_ON*1..6]->(pkg:Package)-[:HAS_VULNERABILITY]->(v:Vulnerability)
WHERE v.severity IN ['CRITICAL', 'HIGH']
RETURN proj.name AS Projeto, pkg.name AS PacoteVulneravel, v.id AS CVE, v.severity AS Gravidade`,
  },
  {
    id: 'prod-only',
    title: '2. Risco Real em Produção',
    description: 'Ignora devDependencies e mostra apenas vulnerabilidades que vão para o ambiente final.',
    cypher: `MATCH (proj:Project)-[:DEPENDS_ON {scope: 'prod'}]->(direct:Package)-[:DEPENDS_ON*0..5]->(vulnPkg:Package)-[:HAS_VULNERABILITY]->(v:Vulnerability)
RETURN direct.name AS PontoDeEntrada, vulnPkg.name AS PacoteAfetado, v.id AS CVE, v.severity AS Gravidade`,
  },
  {
    id: 'blast-radius',
    title: '3. Pacotes Mais Conectados (Hubs)',
    description: 'Lista os pacotes que mais sustentam outras dependências na árvore (maior raio de impacto).',
    cypher: `MATCH (parent:Package)-[:DEPENDS_ON]->(target:Package)
RETURN target.name AS Pacote, target.version AS Versao, count(parent) AS DependentesDiretos
ORDER BY DependentesDiretos DESC
LIMIT 10`,
  },
];