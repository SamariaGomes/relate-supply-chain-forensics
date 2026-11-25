import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Maximize2, Plus, Minus, Sparkles } from 'lucide-react';
import type { GraphEdge, GraphNode } from '../db/relateClient';

interface GraphViewerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedIds: string[];
}

export function GraphViewer({ nodes, edges, highlightedIds }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [hoveredNode, setHoveredNode] = useState<{
    type: string;
    name: string;
    version: string;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cyFactory = (cytoscape as any).default || cytoscape;
    const highlightSet = new Set(highlightedIds);
    const hasHighlight = highlightSet.size > 0;

    const elements = [
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label === 'Vulnerability' ? '' : n.name,
          fullName: n.name,
          nodeType: n.label,
          version: n.properties?.version || '',
          highlighted: highlightSet.has(n.id) ? 'yes' : 'no',
          dimmed: hasHighlight && !highlightSet.has(n.id) ? 'yes' : 'no',
        },
      })),
      ...edges.map((e) => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          edgeType: e.type,
          highlighted:
            highlightSet.has(e.source) && highlightSet.has(e.target) ? 'yes' : 'no',
        },
      })),
    ];

    const cy = cyFactory({
      container: containerRef.current,
      elements,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            color: '#e2e8f0',
            'font-family': 'Plus Jakarta Sans, sans-serif',
            'font-size': '11px',
            'font-weight': 500,
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'text-background-color': '#030712',
            'text-background-opacity': 0.8,
            'text-background-padding': '4px',
            'background-color': '#38bdf8',
            'background-opacity': 0.85,
            'border-width': 2,
            'border-color': 'rgba(56, 189, 248, 0.35)',
            width: 24,
            height: 24,
          },
        },
        {
          selector: 'node[nodeType = "Project"]',
          style: {
            'background-color': '#818cf8',
            'border-color': 'rgba(129, 140, 248, 0.5)',
            'border-width': 4,
            width: 42,
            height: 42,
            'font-size': '12px',
            'font-weight': 700,
            color: '#ffffff',
          },
        },
        {
          selector: 'node[nodeType = "Vulnerability"]',
          style: {
            'background-color': '#fb7185',
            'border-color': 'rgba(251, 113, 133, 0.35)',
            'border-width': 3,
            shape: 'ellipse',
            width: 11,
            height: 11,
          },
        },
        {
          selector: 'node[highlighted = "yes"]',
          style: {
            'border-width': 3,
            'border-color': '#34d399',
          },
        },
        {
          selector: 'node[dimmed = "yes"]',
          style: {
            opacity: 0.14,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.4,
            'line-color': 'rgba(148, 163, 184, 0.18)',
            'target-arrow-color': 'rgba(148, 163, 184, 0.28)',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.7,
            'curve-style': 'unbundled-bezier',
          },
        },
        {
          selector: 'edge[edgeType = "HAS_VULNERABILITY"]',
          style: {
            width: 1,
            'line-color': 'rgba(251, 113, 133, 0.25)',
            'target-arrow-color': 'rgba(251, 113, 133, 0.25)',
            'line-style': 'dotted',
          },
        },
        {
          selector: 'edge[highlighted = "yes"]',
          style: {
            width: 2.2,
            'line-color': '#34d399',
            'target-arrow-color': '#34d399',
            'line-style': 'solid',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        fit: true,
        padding: 44,
        nodeRepulsion: () => 24000,
        idealEdgeLength: () => 100,
      },
    });

    cy.on('mouseover', 'node', (evt: any) => {
      const data = evt.target.data();
      setHoveredNode({
        type: data.nodeType,
        name: data.fullName,
        version: data.version || '',
      });
    });

    cy.on('mouseout', 'node', () => {
      setHoveredNode(null);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [nodes, edges, highlightedIds]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '520px',
        background:
          'radial-gradient(circle at 30% 20%, rgba(56, 189, 248, 0.08) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(129, 140, 248, 0.08) 0%, transparent 45%), #070b14',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Grade tecnológica sutil no fundo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }}
      />

      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Cápsula de Inspeção Flutuante */}
      {hoveredNode ? (
        <div
          style={{
            position: 'absolute',
            top: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#f8fafc',
            padding: '8px 18px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
            pointerEvents: 'none',
          }}
        >
          <Sparkles size={13} color="#38bdf8" />
          <span style={{ color: '#94a3b8' }}>{hoveredNode.type}</span>
          <strong style={{ fontWeight: 600 }}>{hoveredNode.name}</strong>
          {hoveredNode.version && (
            <span style={{ color: '#38bdf8', fontSize: '0.75rem' }}>
              v{hoveredNode.version}
            </span>
          )}
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: '18px',
            left: '18px',
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '0.74rem',
            color: '#94a3b8',
            pointerEvents: 'none',
          }}
        >
          Passe o cursor sobre os nós para inspecionar dependências e CVEs
        </div>
      )}

      {/* Legenda minimalista */}
      <div
        style={{
          position: 'absolute',
          bottom: '18px',
          left: '18px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '7px 14px',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontSize: '0.73rem',
          color: '#cbd5e1',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8', display: 'inline-block' }} />
          Aplicação
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
          Pacote
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#fb7185', display: 'inline-block' }} />
          Vulnerabilidade
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i style={{ width: 12, height: 2, background: '#34d399', display: 'inline-block' }} />
          Caminho Ativo
        </span>
      </div>

      {/* Controles de Zoom Flutuantes */}
      <div
        style={{
          position: 'absolute',
          bottom: '18px',
          right: '18px',
          display: 'flex',
          gap: '4px',
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '4px',
          borderRadius: '999px',
        }}
      >
        <button
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}
          title="Aproximar"
          style={controlBtnStyle}
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
          title="Afastar"
          style={controlBtnStyle}
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => cyRef.current?.fit(undefined, 44)}
          title="Centralizar"
          style={{ ...controlBtnStyle, padding: '5px 12px', gap: '5px', fontSize: '0.73rem' }}
        >
          <Maximize2 size={12} /> Centralizar
        </button>
      </div>
    </div>
  );
}

const controlBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#f8fafc',
  padding: '6px 8px',
  borderRadius: '999px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};