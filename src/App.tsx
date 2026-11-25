import { useEffect, useState } from 'react';
import { Download, Play, ShieldAlert, Upload, Network, Sparkles, Wrench } from 'lucide-react';
import { parsePackageLock } from './services/lockfileParser';
import { fetchVulnerabilities } from './services/osvApi';
import {
  relateStore,
  type GraphEdge,
  type GraphNode,
  type RemediationInsight,
} from './db/relateClient';
import { PRESET_QUERIES, type PresetQuery } from './db/queries';
import { GraphViewer } from './components/GraphViewer';

export function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [cypher, setCypher] = useState<string>(PRESET_QUERIES[0].cypher);
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [remediations, setRemediations] = useState<RemediationInsight[]>([]);
  const [status, setStatus] = useState<string>('Inicializando Relate...');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function boot() {
      await relateStore.init();
      try {
        const res = await fetch('/samples/supply-chain-audit.relate');
        if (res.ok) {
          const raw = await res.text();
          relateStore.importFromSingleFile(raw);
          refreshGraph();
          setStatus('Grafo carregado de /samples/supply-chain-audit.relate (Relate Single-File)');
          await executeQuery(PRESET_QUERIES[0].cypher);
          return;
        }
      } catch {
        // Fallback para o lockfile de exemplo
      }
      await loadDemoLockfile();
    }
    boot();
  }, []);

  function refreshGraph() {
    const data = relateStore.getGraphData();
    setNodes([...data.nodes]);
    setEdges([...data.edges]);
    setRemediations(relateStore.getRemediationPlan());
  }

  async function processLockfileText(text: string, label: string) {
    setLoading(true);
    try {
      setStatus(`Analisando ${label} localmente no navegador...`);
      const parsed = parsePackageLock(text);
      setStatus(`Consultando CVEs reais na API OSV.dev para ${parsed.packages.length} pacotes...`);
      const vulns = await fetchVulnerabilities(parsed.packages);
      await relateStore.ingestLockfile(parsed, vulns);
      refreshGraph();
      await executeQuery(cypher);
      setStatus(
        `Concluído: ${parsed.packages.length} pacotes e ${vulns.length} vulnerabilidades conectadas no Relate.`
      );
    } catch (err: any) {
      setStatus(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadDemoLockfile() {
    const res = await fetch('/samples/vulnerable-package-lock.json');
    const text = await res.text();
    await processLockfileText(text, 'vulnerable-package-lock.json');
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (file.name.endsWith('.relate') || file.name.endsWith('.rl')) {
      relateStore.importFromSingleFile(text);
      refreshGraph();
      await executeQuery(cypher);
      setStatus(`Banco único "${file.name}" importado com sucesso.`);
      return;
    }
    await processLockfileText(text, file.name);
  }

  async function executeQuery(queryToRun = cypher) {
    const { rows, highlightNodeIds } = await relateStore.runCypher(queryToRun);
    setQueryResult(rows);
    setHighlightedIds(highlightNodeIds);
  }

  function handleExportRelateFile() {
    const content = relateStore.exportToSingleFile();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supply-chain-audit.relate';
    a.click();
    URL.revokeObjectURL(url);
  }

  const vulnCount = nodes.filter((n) => n.label === 'Vulnerability').length;

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', padding: '24px', fontFamily: 'system-ui, sans-serif', overflowX: 'hidden' }}>
      <header style={{ maxWidth: '1280px', margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Network color="#38bdf8" size={28} />
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Relate Supply Chain Forensics</h1>
          </div>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
            Auditoria de dependências transitivas e CVEs 100% no navegador com Relate
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', border: '1px solid #334155' }}>
            <Upload size={16} />
            Importar package-lock.json ou .relate
            <input type="file" accept=".json,.relate,.rl" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          <button
            onClick={loadDemoLockfile}
            disabled={loading}
            style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            Analisar Demo Real (OSV.dev)
          </button>

          <button
            onClick={handleExportRelateFile}
            style={{ background: '#10b981', color: '#022c22', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}
          >
            <Download size={16} />
            Exportar .relate
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        <section style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem', color: '#cbd5e1', gap: '8px', flexWrap: 'wrap' }}>
            <span>{status}</span>
            <span>
              Nós: <strong>{nodes.length}</strong> | Arestas: <strong>{edges.length}</strong> | CVEs: <strong style={{ color: '#f87171' }}>{vulnCount}</strong>
            </span>
          </div>

          <GraphViewer nodes={nodes} edges={edges} highlightedIds={highlightedIds} />

          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '0.8rem', color: '#94a3b8', flexWrap: 'wrap' }}>
            <span>🔵 Projeto Raiz</span>
            <span>⚪ Pacote (Dependência)</span>
            <span>♦️ Vulnerabilidade (CVE)</span>
            <span>🟡 Caminho Isolado pela Query</span>
          </div>

          <div style={{ marginTop: '18px', background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
              <Wrench size={16} />
              Agente de Remediação (Contexto Conectado)
            </h3>
            {remediations.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Nenhuma ação corretiva pendente.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {remediations.map((rem) => (
                  <div key={rem.rootPackage} style={{ background: '#020617', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #10b981', fontSize: '0.82rem' }}>
                    <div>{rem.recommendation}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>
                      CVEs eliminadas: {rem.cves.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <h2 style={{ margin: '0 0 10px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="#f59e0b" />
              Consultas Forenses (Cypher)
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {PRESET_QUERIES.map((q: PresetQuery) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setCypher(q.cypher);
                    executeQuery(q.cypher);
                  }}
                  style={{
                    textAlign: 'left',
                    background: cypher === q.cypher ? '#1e293b' : '#020617',
                    border: '1px solid #334155',
                    color: '#e2e8f0',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  <strong>{q.title}</strong>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{q.description}</div>
                </button>
              ))}
            </div>

            <textarea
              value={cypher}
              onChange={(e) => setCypher(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#020617',
                color: '#38bdf8',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
              }}
            />

            <button
              onClick={() => executeQuery()}
              style={{
                marginTop: '8px',
                background: '#38bdf8',
                color: '#0f172a',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Play size={14} /> Executar Cypher
            </button>
          </div>

          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#a855f7" />
              Contexto Conectado Extraído ({queryResult.length} resultados)
            </h3>

            <div style={{ maxHeight: '260px', overflow: 'auto', fontSize: '0.8rem' }}>
              {queryResult.length === 0 ? (
                <p style={{ color: '#64748b' }}>Nenhum resultado encontrado para esta consulta.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                      {Object.keys(queryResult[0]).map((col) => (
                        <th key={col} style={{ padding: '6px' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                        {Object.values(row).map((val: any, cIdx) => (
                          <td key={cIdx} style={{ padding: '6px' }}>{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;