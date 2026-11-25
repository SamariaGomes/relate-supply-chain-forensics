import { useEffect, useState } from 'react';
import {
  Download,
  Play,
  Upload,
  Sparkles,
  Wrench,
  Code2,
  ShieldAlert,
  Layers,
  Activity,
  ChevronDown,
  ChevronUp,
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
  const [showCode, setShowCode] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [remediations, setRemediations] = useState<RemediationInsight[]>([]);
  const [status, setStatus] = useState<string>('Motor Relate pronto');
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
          setStatus('Grafo restaurado de supply-chain-audit.relate');
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
      setStatus(`Mapeando árvore de ${label}...`);
      const parsed = parsePackageLock(text);
      setStatus(`Sincronizando inteligência de CVEs (OSV.dev)...`);
      const vulns = await fetchVulnerabilities(parsed.packages);
      await relateStore.ingestLockfile(parsed, vulns);
      refreshGraph();
      await executeQuery(cypher);
      setStatus(`Auditoria ativa · ${parsed.packages.length} pacotes analisados`);
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
      setStatus(`Snapshot "${file.name}" carregado`);
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

  const packageCount = nodes.filter((n) => n.label === 'Package').length;
  const vulnCount = nodes.filter((n) => n.label === 'Vulnerability').length;
  const activePreset = PRESET_QUERIES.find((p) => p.id === activePresetId);

  const lensTitles: Record<string, { label: string; badge: string }> = {
    'transitive-critical': { label: 'Riscos Críticos', badge: 'Transitivo' },
    'prod-only': { label: 'Exposição em Produção', badge: 'Runtime' },
    'blast-radius': { label: 'Núcleos de Impacto', badge: 'Topologia' },
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(56, 189, 248, 0.14), transparent), #030712',
        color: '#f8fafc',
        padding: '28px 32px 56px',
        overflowX: 'hidden',
      }}
    >
      {/* Hero Banner Tecnológico Moderno */}
      <header
        style={{
          maxWidth: '1340px',
          margin: '0 auto 24px',
          padding: '34px 38px',
          borderRadius: '26px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundImage:
            'linear-gradient(100deg, rgba(3, 7, 18, 0.94) 38%, rgba(3, 7, 18, 0.52) 100%), url("/hero-bg.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        }}
      >
        <div style={{ maxWidth: '600px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 14px',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              fontSize: '0.73rem',
              fontWeight: 600,
              color: '#7dd3fc',
              letterSpacing: '0.03em',
              marginBottom: '14px',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: loading ? '#fbbf24' : '#34d399',
                boxShadow: loading ? '0 0 8px #fbbf24' : '0 0 8px #34d399',
              }}
            />
            POWERED BY RELATE GRAPH ENGINE
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '2.15rem',
              fontWeight: 700,
              letterSpacing: '-0.035em',
              lineHeight: 1.12,
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 60%, #7dd3fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Supply Chain Intelligence
          </h1>

          <p
            style={{
              margin: '10px 0 0',
              color: '#94a3b8',
              fontSize: '0.95rem',
              lineHeight: 1.55,
            }}
          >
            Visibilidade em tempo real sobre dependências ocultas, caminhos de ataque e remediação automatizada por grafo.
          </p>
        </div>

        {/* Botões de Ação Modernos */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label
            style={{
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color: '#f8fafc',
              padding: '11px 18px',
              borderRadius: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.84rem',
              fontWeight: 500,
              border: '1px solid rgba(255, 255, 255, 0.14)',
            }}
          >
            <Upload size={15} color="#38bdf8" />
            Carregar Lockfile
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
              background: 'rgba(255, 255, 255, 0.95)',
              color: '#030712',
              border: 'none',
              padding: '11px 20px',
              borderRadius: '14px',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 8px 20px rgba(255, 255, 255, 0.12)',
            }}
          >
            Simular Auditoria
            <ArrowUpRight size={15} />
          </button>

          <button
            onClick={handleExportRelateFile}
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '11px 20px',
              borderRadius: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '0.84rem',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(14, 165, 233, 0.3)',
            }}
          >
            <Download size={15} />
            Salvar .relate
          </button>
        </div>
      </header>

      {/* Faixa de Métricas Modernas (KPI Cards) */}
      <section
        style={{
          maxWidth: '1340px',
          margin: '0 auto 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div style={kpiCardStyle}>
          <div style={kpiHeaderStyle}>
            <span>Componentes Mapeados</span>
            <Layers size={15} color="#38bdf8" />
          </div>
          <div style={kpiValueStyle}>{packageCount}</div>
          <div style={kpiSubStyle}>Dependências diretas e transitivas</div>
        </div>

        <div style={kpiCardStyle}>
          <div style={kpiHeaderStyle}>
            <span>Vulnerabilidades Ativas</span>
            <ShieldAlert size={15} color="#fb7185" />
          </div>
          <div style={{ ...kpiValueStyle, color: '#fb7185' }}>{vulnCount}</div>
          <div style={kpiSubStyle}>Alertas sincronizados via OSV.dev</div>
        </div>

        <div style={kpiCardStyle}>
          <div style={kpiHeaderStyle}>
            <span>Ações de Correção</span>
            <Wrench size={15} color="#34d399" />
          </div>
          <div style={{ ...kpiValueStyle, color: '#34d399' }}>{remediations.length}</div>
          <div style={kpiSubStyle}>Pacotes raiz que eliminam falhas</div>
        </div>

        <div style={kpiCardStyle}>
          <div style={kpiHeaderStyle}>
            <span>Status do Motor</span>
            <Activity size={15} color="#818cf8" />
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', marginTop: '8px' }}>
            {status}
          </div>
          <div style={kpiSubStyle}>Processamento local 100% privado</div>
        </div>
      </section>

      {/* Workspace Principal */}
      <main
        style={{
          maxWidth: '1340px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Coluna Esquerda: Grafo Interativo + Plano de Ação */}
        <section style={{ minWidth: 0 }}>
          <GraphViewer nodes={nodes} edges={edges} highlightedIds={highlightedIds} />

          {/* Card de Remediação Inteligente */}
          <div
            style={{
              marginTop: '20px',
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(20px)',
              padding: '24px',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Wrench size={17} color="#34d399" />
                Recomendações de Remediação
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Priorizado por impacto no grafo
              </span>
            </div>

            {remediations.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                Nenhuma atualização urgente necessária.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {remediations.map((rem) => (
                  <div
                    key={rem.rootPackage}
                    style={{
                      background: 'rgba(255, 255, 255, 0.025)',
                      padding: '15px 18px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                        Atualizar pacote direto{' '}
                        <span style={{ color: '#38bdf8' }}>{rem.rootPackage}</span>
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '4px' }}>
                        Neutraliza {rem.vulnerabilitiesSolved} vulnerabilidade(s) na cadeia ·{' '}
                        {rem.cves.slice(0, 3).join(', ')}
                        {rem.cves.length > 3 ? ` +${rem.cves.length - 3}` : ''}
                      </div>
                    </div>
                    <span
                      style={{
                        background: 'rgba(52, 211, 153, 0.12)',
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        color: '#34d399',
                        padding: '5px 12px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      -{rem.vulnerabilitiesSolved} falhas
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Coluna Direita: Lentes de Inteligência + Resultados */}
        <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Lentes de Análise (Visual limpo sem parecer terminal) */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(20px)',
              padding: '24px',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={17} color="#38bdf8" />
                Lentes de Investigação
              </h2>

              <button
                onClick={() => setShowCode(!showCode)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  padding: '5px 11px',
                  borderRadius: '999px',
                  fontSize: '0.73rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Code2 size={13} color="#38bdf8" />
                {showCode ? 'Ocultar Cypher' : 'Ver Cypher'}
                {showCode ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* Cards interativos de Lentes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PRESET_QUERIES.map((q: PresetQuery) => {
                const isSelected = activePresetId === q.id;
                const meta = lensTitles[q.id] || { label: q.title, badge: 'Grafo' };
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActivePresetId(q.id);
                      setCypher(q.cypher);
                      executeQuery(q.cypher);
                    }}
                    style={{
                      textAlign: 'left',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.14) 0%, rgba(99, 102, 241, 0.12) 100%)'
                        : 'rgba(255, 255, 255, 0.025)',
                      border: isSelected
                        ? '1px solid rgba(56, 189, 248, 0.45)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      color: '#f8fafc',
                      padding: '14px 16px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{meta.label}</span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '2px 9px',
                          borderRadius: '999px',
                          background: isSelected
                            ? 'rgba(56, 189, 248, 0.2)'
                            : 'rgba(255, 255, 255, 0.06)',
                          color: isSelected ? '#7dd3fc' : '#94a3b8',
                        }}
                      >
                        {meta.badge}
                      </span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.4 }}>
                      {q.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Editor Cypher recolhível (só abre quando clicar em "Ver Cypher") */}
            {showCode && (
              <div
                style={{
                  marginTop: '14px',
                  background: '#030712',
                  borderRadius: '16px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  padding: '14px',
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
                    color: '#7dd3fc',
                    border: 'none',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.77rem',
                    lineHeight: 1.55,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    onClick={() => executeQuery()}
                    style={{
                      background: '#38bdf8',
                      color: '#030712',
                      border: 'none',
                      padding: '7px 16px',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Play size={12} fill="#030712" /> Executar Consulta
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card de Resultados Conectados */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(20px)',
              padding: '24px',
              borderRadius: '24px',
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
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                {activePreset ? lensTitles[activePreset.id]?.label : 'Resultados'}
              </h3>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#7dd3fc',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                }}
              >
                {queryResult.length} itens
              </span>
            </div>

            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {queryResult.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.83rem', margin: 0 }}>
                  Nenhum item encontrado nesta lente.
                </p>
              ) : (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.8rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        textAlign: 'left',
                        color: '#94a3b8',
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
                          color: '#e2e8f0',
                        }}
                      >
                        {Object.values(row).map((val: any, cIdx) => {
                          const text = String(val);
                          const isCritical = text === 'CRITICAL';
                          const isHigh = text === 'HIGH';
                          return (
                            <td key={cIdx} style={{ padding: '10px 6px' }}>
                              {isCritical || isHigh ? (
                                <span
                                  style={{
                                    padding: '3px 9px',
                                    borderRadius: '999px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    background: isCritical
                                      ? 'rgba(251, 113, 133, 0.16)'
                                      : 'rgba(251, 191, 36, 0.16)',
                                    color: isCritical ? '#fb7185' : '#fbbf24',
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

const kpiCardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.55)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '20px',
  padding: '18px 20px',
};

const kpiHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.78rem',
  color: '#94a3b8',
  fontWeight: 500,
};

const kpiValueStyle: React.CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 700,
  letterSpacing: '-0.03em',
  marginTop: '6px',
  color: '#ffffff',
};

const kpiSubStyle: React.CSSProperties = {
  fontSize: '0.73rem',
  color: '#64748b',
  marginTop: '4px',
};

export default App;