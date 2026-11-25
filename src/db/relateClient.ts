import type { ParsedLockfile } from '../services/lockfileParser';
import type { VulnerabilityInfo } from '../services/osvApi';

export interface GraphNode {
  id: string;
  label: 'Project' | 'Package' | 'Vulnerability';
  name: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'DEPENDS_ON' | 'HAS_VULNERABILITY';
  properties: Record<string, any>;
}

export interface RemediationInsight {
  rootPackage: string;
  vulnerabilitiesSolved: number;
  cves: string[];
  recommendation: string;
}

export interface RelateSnapshot {
  version: string;
  engine: 'relate-1.2.0';
  createdAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

class RelateGraphStore {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];

  async init() {
    console.log('Relate Supply Chain Graph Engine pronto.');
  }

  async ingestLockfile(lockfile: ParsedLockfile, vulns: VulnerabilityInfo[]) {
    this.nodes.clear();
    this.edges = [];

    const projectId = `project:${lockfile.projectName}@${lockfile.projectVersion}`;
    this.nodes.set(projectId, {
      id: projectId,
      label: 'Project',
      name: lockfile.projectName,
      properties: { version: lockfile.projectVersion },
    });

    const nameToIds = new Map<string, string[]>();

    for (const pkg of lockfile.packages) {
      this.nodes.set(pkg.id, {
        id: pkg.id,
        label: 'Package',
        name: pkg.name,
        properties: {
          version: pkg.version,
          isDirect: pkg.isDirect,
          scope: pkg.scope,
        },
      });

      const existing = nameToIds.get(pkg.name) || [];
      existing.push(pkg.id);
      nameToIds.set(pkg.name, existing);

      if (pkg.isDirect) {
        this.edges.push({
          id: `${projectId}->${pkg.id}`,
          source: projectId,
          target: pkg.id,
          type: 'DEPENDS_ON',
          properties: { scope: pkg.scope },
        });
      }
    }

    for (const pkg of lockfile.packages) {
      for (const depName of pkg.dependencies) {
        const targetIds = nameToIds.get(depName);
        if (targetIds && targetIds.length > 0) {
          const targetId = targetIds[0];
          this.edges.push({
            id: `${pkg.id}->${targetId}`,
            source: pkg.id,
            target: targetId,
            type: 'DEPENDS_ON',
            properties: { scope: pkg.scope },
          });
        }
      }
    }

    for (const v of vulns) {
      const vulnNodeId = `vuln:${v.id}`;
      if (!this.nodes.has(vulnNodeId)) {
        this.nodes.set(vulnNodeId, {
          id: vulnNodeId,
          label: 'Vulnerability',
          name: v.id,
          properties: {
            summary: v.summary,
            severity: v.severity,
          },
        });
      }

      this.edges.push({
        id: `${v.packageId}->${vulnNodeId}`,
        source: v.packageId,
        target: vulnNodeId,
        type: 'HAS_VULNERABILITY',
        properties: { severity: v.severity },
      });
    }
  }

  async runCypher(cypher: string): Promise<{ rows: any[]; highlightNodeIds: string[] }> {
    const q = cypher.toUpperCase();
    const vulnNodes = Array.from(this.nodes.values()).filter((n) => n.label === 'Vulnerability');

    if (q.includes('HAS_VULNERABILITY')) {
      const prodOnly = q.includes("SCOPE: 'PROD'");
      const rows: any[] = [];
      const highlightSet = new Set<string>();

      for (const v of vulnNodes) {
        if (q.includes('CRITICAL') && !['CRITICAL', 'HIGH'].includes(v.properties.severity)) {
          continue;
        }

        const vulnEdges = this.edges.filter((e) => e.target === v.id && e.type === 'HAS_VULNERABILITY');
        for (const ve of vulnEdges) {
          const vulnPkg = this.nodes.get(ve.source);
          if (!vulnPkg) continue;
          if (prodOnly && vulnPkg.properties.scope !== 'prod') continue;

          const path = this.findPathFromProject(vulnPkg.id);
          path.forEach((id) => highlightSet.add(id));
          highlightSet.add(v.id);

          const entryPkg = path.length > 1 ? this.nodes.get(path[1])?.name : vulnPkg.name;

          rows.push({
            PontoDeEntrada: entryPkg,
            PacoteVulneravel: `${vulnPkg.name}@${vulnPkg.properties.version}`,
            CVE: v.name,
            Gravidade: v.properties.severity,
            SaltosNoGrafo: Math.max(1, path.length - 1),
          });
        }
      }

      return { rows, highlightNodeIds: Array.from(highlightSet) };
    }

    const incomingCounts = new Map<string, number>();
    for (const edge of this.edges) {
      if (edge.type === 'DEPENDS_ON') {
        incomingCounts.set(edge.target, (incomingCounts.get(edge.target) || 0) + 1);
      }
    }

    const hubs = Array.from(incomingCounts.entries())
      .map(([id, count]) => {
        const node = this.nodes.get(id);
        return {
          id,
          Pacote: node?.name || id,
          Versao: node?.properties.version || '-',
          DependentesDiretos: count,
        };
      })
      .sort((a, b) => b.DependentesDiretos - a.DependentesDiretos)
      .slice(0, 10);

    return {
      rows: hubs.map(({ id, ...rest }) => rest),
      highlightNodeIds: hubs.map((h) => h.id),
    };
  }

  getRemediationPlan(): RemediationInsight[] {
    const vulnNodes = Array.from(this.nodes.values()).filter((n) => n.label === 'Vulnerability');
    const impactByRoot = new Map<string, Set<string>>();

    for (const v of vulnNodes) {
      const vulnEdges = this.edges.filter((e) => e.target === v.id && e.type === 'HAS_VULNERABILITY');
      for (const ve of vulnEdges) {
        const path = this.findPathFromProject(ve.source);
        const rootId = path.length > 1 ? path[1] : ve.source;
        const rootNode = this.nodes.get(rootId);
        const rootLabel = rootNode ? `${rootNode.name}@${rootNode.properties.version}` : rootId;

        const existing = impactByRoot.get(rootLabel) || new Set<string>();
        existing.add(v.name);
        impactByRoot.set(rootLabel, existing);
      }
    }

    return Array.from(impactByRoot.entries())
      .map(([rootPackage, cveSet]) => ({
        rootPackage,
        vulnerabilitiesSolved: cveSet.size,
        cves: Array.from(cveSet),
        recommendation: `Atualize a dependência direta "${rootPackage}" para cortar ${cveSet.size} vulnerabilidade(s) na árvore transitiva.`,
      }))
      .sort((a, b) => b.vulnerabilitiesSolved - a.vulnerabilitiesSolved);
  }

  private findPathFromProject(targetId: string): string[] {
    const projectNode = Array.from(this.nodes.values()).find((n) => n.label === 'Project');
    if (!projectNode) return [targetId];

    const queue: string[][] = [[projectNode.id]];
    const visited = new Set<string>([projectNode.id]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const curr = path[path.length - 1];
      if (curr === targetId) return path;

      const outgoing = this.edges.filter((e) => e.source === curr && e.type === 'DEPENDS_ON');
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push([...path, edge.target]);
        }
      }
    }

    return [projectNode.id, targetId];
  }

  getGraphData() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }

  exportToSingleFile(): string {
    const snapshot: RelateSnapshot = {
      version: '1.0.0',
      engine: 'relate-1.2.0',
      createdAt: new Date().toISOString(),
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
    return JSON.stringify(snapshot, null, 2);
  }

  importFromSingleFile(rawJson: string) {
    const snapshot: RelateSnapshot = JSON.parse(rawJson);
    this.nodes.clear();
    for (const node of snapshot.nodes) {
      this.nodes.set(node.id, node);
    }
    this.edges = snapshot.edges;
  }
}

export const relateStore = new RelateGraphStore();