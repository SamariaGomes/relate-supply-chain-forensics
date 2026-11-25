import { useEffect, useState } from 'react';
import {
  Download,
  Play,
  Upload,
  Sparkles,
  Wrench,
  Terminal,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
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
  const [activePresetId, setActivePresetId] = useState<string>(PRESET_QUERIES[0].id);
  const [cypher, setCypher] = useState<string>(PRESET_QUERIES[0].cypher);
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [remediations, setRemediations] = useState<RemediationInsight[]>([]);
  const [status, setStatus] = useState<string>('Inicializando motor Relate...');
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
          setStatus('Relate Single-File carregado');
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
      setStatus(`Analisando ${label} localmente...`);
      const parsed = parsePackageLock(text);
      setStatus(`Consultando CVEs em tempo real (OSV.dev)...`);
      const vulns = await fetchVulnerabilities(parsed.packages);
      await relateStore.ingestLockfile(parsed, vulns);
      refreshGraph();
      await executeQuery(cypher);
      setStatus(`${parsed.packages.length} pacotes · ${vulns.length} vulnerabilidades mapeadas`);
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
      setStatus(`Arquivo "${file.name}" restaurado`);
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
  const activePreset = PRESET_QUERIES.find((p) => p.id === activePresetId);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000000',
        color: '#f5f5f7',
        padding: '28px 32px 48px',
        overflowX: 'hidden',
      }}
    >
      {/* Top Navigation / Hero Glass Banner estilo Apple */}
      <header
        style={{
          maxWidth: '1320px',
          margin: '0 auto 28px',
          padding: '32px 36px',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundImage:
            'linear-gradient(105deg, rgba(10, 10, 12, 0.94) 35%, rgba(10, 10, 12, 0.55) 100%), url("/hero-bg.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.85)',
        }}
      >
        <div style={{ maxWidth: '580px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.72rem',
              fontWeight: 500,
              color: '#a1a1a6',
              letterSpacing: '0.02em',
              marginBottom: '12px',
            }}
          >
            <ShieldCheck size={13} color="#30d158" />
            RELATE EMBEDDED GRAPH ENGINE · ZERO-BACKEND
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              background: 'linear-gradient(180deg, #ffffff 0%, #a1a1a6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Supply Chain Forensics
          </h1>

          <p
            style={{
              margin: '8px 0 0',
              color: '#86868b',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              fontWeight: 400,
            }}
          >
            Mapeamento profundo de dependências transitivas e vulnerabilidades executado privadamente no seu navegador.
          </p>
        </div>

        {/* Pill Action Buttons estilo Apple */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              color: '#f5f5f7',
              padding: '10px 18px',
              borderRadius: '999px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.84rem',
              fontWeight: 500,
              border: '1px solid rgba(255, 255, 255, 0.14)',
              transition: 'all 0.2s ease',
            }}
          >
            <Upload size={15} />
            Importar Arquivo
            <input
              type="file"
              accept=".json,.relate,.rl"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          <button
            onClick={loadDemoLockfile}
            disabled={loading}
            style={{
              background: '#f5f5f7',
              color: '#000000',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Analisar Demo
            <ArrowUpRight size={15} />
          </button>

          <button
            onClick={handleExportRelateFile}
            style={{
              background: '#0a84ff',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '999px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '0.84rem',
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            <Download size={15} />
            Exportar .relate
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main
        style={{
          maxWidth: '1320px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Graph + AI Remediation */}
        <section style={{ minWidth: 0 }}>
          {/* Status & Telemetry Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              padding: '0 6px',
              fontSize: '0.8rem',
              color: '#86868b',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: loading ? '#ffd60a' : '#30d158',
                }}
              />
              {status}
            </span>

            <div style={{ display: 'flex', gap: '16px', fontVariantNumeric: 'tabular-nums' }}>
              <span>
                Nós <strong style={{ color: '#f5f5f7', fontWeight: 600 }}>{nodes.length}</strong>
              </span>
              <span>
                Relações <strong style={{ color: '#f5f5f7', fontWeight: 600 }}>{edges.length}</strong>
              </span>
              <span>
                CVEs <strong style={{ color: '#ff453a', fontWeight: 600 }}>{vulnCount}</strong>
              </span>
            </div>
          </div>

          <GraphViewer nodes={nodes} edges={edges} highlightedIds={highlightedIds} />

          {/* AI Remediation Card */}
          <div
            style={{
              marginTop: '20px',
              background: '#111113',
              padding: '22px 24px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#f5f5f7',
                }}
              >
                <Wrench size={16} color="#30d158" />
                Plano de Remediação Inteligente
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#86868b' }}>
                Contexto extraído do grafo
              </span>
            </div>

            {remediations.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#86868b' }}>
                Nenhuma vulnerabilidade crítica detectada na árvore atual.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {remediations.map((rem) => (
                  <div
                    key={rem.rootPackage}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#f5f5f7' }}>
                        Atualizar <span style={{ color: '#30d158' }}>{rem.rootPackage}</span>
                      </div>
                      <div style={{ color: '#86868b', fontSize: '0.76rem', marginTop: '3px' }}>
                        Elimina {rem.vulnerabilitiesSolved} falha(s) transitiva(s) ·{' '}
                        {rem.cves.slice(0, 3).join(', ')}
                        {rem.cves.length > 3 ? ` +${rem.cves.length - 3}` : ''}
                      </div>
                    </div>
                    <span
                      style={{
                        background: 'rgba(48, 209, 88, 0.12)',
                        color: '#30d158',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      -{rem.vulnerabilitiesSolved} CVEs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Apple-style Segmented Query Studio + Results */}
        <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Query Studio Card */}
          <div
            style={{
              background: '#111113',
              padding: '22px 24px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Terminal size={16} color="#0a84ff" />
                Cypher Studio
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#86868b' }}>Relate Query Engine</span>
            </div>

            {/* Apple Segmented Control */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                background: '#1c1c1e',
                padding: '4px',
                borderRadius: '12px',
                marginBottom: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              {PRESET_QUERIES.map((q: PresetQuery, idx: number) => {
                const isSelected = activePresetId === q.id;
                const shortLabels = ['Cadeia Crítica', 'Produção', 'Hubs (Impacto)'];
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActivePresetId(q.id);
                      setCypher(q.cypher);
                      executeQuery(q.cypher);
                    }}
                    style={{
                      background: isSelected ? '#2c2c2e' : 'transparent',
                      color: isSelected ? '#ffffff' : '#86868b',
                      border: 'none',
                      padding: '8px 6px',
                      borderRadius: '9px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 600 : 500,
                      boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.35)' : 'none',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {shortLabels[idx] || q.title}
                  </button>
                );
              })}
            </div>

            {/* Descrição sutil da consulta ativa */}
            {activePreset && (
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: '0.78rem',
                  color: '#86868b',
                  lineHeight: 1.4,
                }}
              >
                {activePreset.description}
              </p>
            )}

            {/* Editor Cypher minimalista estilo Xcode */}
            <div
              style={{
                background: '#09090b',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '12px 14px',
              }}
            >
              <textarea
                value={cypher}
                onChange={(e) => setCypher(e.target.value)}
                rows={4}
                spellCheck={false}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#64d2ff',
                  border: 'none',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.78rem',
                  lineHeight: 1.55,
                }}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <button
                  onClick={() => executeQuery()}
                  style={{
                    background: '#0a84ff',
                    color: '#ffffff',
                    border: 'none',
                    padding: '7px 16px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Play size={12} fill="#ffffff" /> Executar Query
                </button>
              </div>
            </div>
          </div>

          {/* Results Table Card */}
          <div
            style={{
              background: '#111113',
              padding: '22px 24px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={16} color="#bf5af2" />
                Contexto Conectado
              </h3>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  color: '#a1a1a6',
                }}
              >
                {queryResult.length} registros
              </span>
            </div>

            <div style={{ maxHeight: '280px', overflow: 'auto' }}>
              {queryResult.length === 0 ? (
                <p style={{ color: '#86868b', fontSize: '0.82rem', margin: 0 }}>
                  Nenhum registro retornado para esta consulta.
                </p>
              ) : (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.79rem',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        textAlign: 'left',
                        color: '#86868b',
                      }}
                    >
                      {Object.keys(queryResult[0]).map((col) => (
                        <th key={col} style={{ padding: '8px 6px', fontWeight: 500 }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          color: '#e5e5ea',
                        }}
                      >
                        {Object.values(row).map((val: any, cIdx) => {
                          const text = String(val);
                          const isCritical = text === 'CRITICAL';
                          const isHigh = text === 'HIGH';
                          return (
                            <td key={cIdx} style={{ padding: '9px 6px' }}>
                              {isCritical || isHigh ? (
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    background: isCritical
                                      ? 'rgba(255, 69, 58, 0.16)'
                                      : 'rgba(255, 159, 10, 0.16)',
                                    color: isCritical ? '#ff453a' : '#ff9f0a',
                                  }}
                                >
                                  {text}
                                </span>
                              ) : (
                                text
                              )}
                            </td>
                          );
                        })}
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