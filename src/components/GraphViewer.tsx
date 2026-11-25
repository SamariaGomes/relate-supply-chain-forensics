import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Maximize2, Plus, Minus } from 'lucide-react';
import type { GraphEdge, GraphNode } from '../db/relateClient';

interface GraphViewerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedIds: string[];
}

export function GraphViewer({ nodes, edges, highlightedIds }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [selectedInfo, setSelectedInfo] = useState<{ type: string; name: string } | null>(null);

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
            color: '#f5f5f7',
            'font-family': '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
            'font-size': '11px',
            'font-weight': 500,
            'text-valign': 'bottom',
            'text-margin-y': 7,
            'text-background-color': '#09090b',
            'text-background-opacity': 0.85,
            'text-background-padding': '3px',
            'background-color': '#52525b',
            'border-width': 1.5,
            'border-color': 'rgba(255,255,255,0.18)',
            width: 24,
            height: 24,
          },
        },
        {
          selector: 'node[nodeType = "Project"]',
          style: {
            'background-color': '#0a84ff',
            'border-color': '#64d2ff',
            'border-width': 2,
            width: 38,
            height: 38,
            'font-size': '12px',
            'font-weight': 600,
          },
        },
        {
          selector: 'node[nodeType = "Vulnerability"]',
          style: {
            'background-color': '#ff453a',
            'border-color': 'rgba(255, 69, 58, 0.4)',
            'border-width': 3,
            shape: 'ellipse',
            width: 12,
            height: 12,
          },
        },
        {
          selector: 'node[highlighted = "yes"]',
          style: {
            'border-width': 2.5,
            'border-color': '#ffd60a',
          },
        },
        {
          selector: 'node[dimmed = "yes"]',
          style: {
            opacity: 0.16,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.25,
            'line-color': 'rgba(255, 255, 255, 0.14)',
            'target-arrow-color': 'rgba(255, 255, 255, 0.22)',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.75,
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'edge[edgeType = "HAS_VULNERABILITY"]',
          style: {
            width: 1,
            'line-color': 'rgba(255, 69, 58, 0.32)',
            'target-arrow-color': 'rgba(255, 69, 58, 0.32)',
            'line-style': 'dotted',
          },
        },
        {
          selector: 'edge[highlighted = "yes"]',
          style: {
            width: 2,
            'line-color': '#ffd60a',
            'target-arrow-color': '#ffd60a',
            'line-style': 'solid',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        fit: true,
        padding: 40,
        nodeRepulsion: () => 22000,
        idealEdgeLength: () => 95,
      },
    });

    cy.on('mouseover', 'node', (evt: any) => {
      const data = evt.target.data();
      const ver = data.version ? ` v${data.version}` : '';
      setSelectedInfo({ type: data.nodeType, name: `${data.fullName}${ver}` });
    });

    cy.on('mouseout', 'node', () => {
      setSelectedInfo(null);
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
        height: '500px',
        background: 'radial-gradient(circle at 50% 35%, #16181d 0%, #09090b 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Dynamic Island / Floating Pill Inspector */}
      {selectedInfo && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(28, 28, 30, 0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#f5f5f7',
            padding: '7px 16px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background:
                selectedInfo.type === 'Vulnerability'
                  ? '#ff453a'
                  : selectedInfo.type === 'Project'
                  ? '#0a84ff'
                  : '#98989d',
            }}
          />
          <span style={{ color: '#86868b' }}>{selectedInfo.type}</span>
          <span>{selectedInfo.name}</span>
        </div>
      )}

      {/* Legenda minimalista no canto inferior esquerdo */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(28, 28, 30, 0.72)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '6px 12px',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontSize: '0.72rem',
          color: '#a1a1a6',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <i style={{ width: 7, height: 7, borderRadius: '50%', background: '#0a84ff', display: 'inline-block' }} />
          Projeto
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <i style={{ width: 7, height: 7, borderRadius: '50%', background: '#636366', display: 'inline-block' }} />
          Pacote
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <i style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff453a', display: 'inline-block' }} />
          CVE
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <i style={{ width: 10, height: 2, background: '#ffd60a', display: 'inline-block' }} />
          Rota Isolada
        </span>
      </div>

      {/* Controles flutuantes estilo macOS */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          display: 'flex',
          gap: '6px',
          background: 'rgba(28, 28, 30, 0.78)',
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
          onClick={() => cyRef.current?.fit(undefined, 40)}
          title="Ajustar à tela"
          style={{ ...controlBtnStyle, padding: '5px 10px', gap: '4px', fontSize: '0.72rem' }}
        >
          <Maximize2 size={12} /> Ajustar
        </button>
      </div>
    </div>
  );
}

const controlBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#f5f5f7',
  padding: '5px 7px',
  borderRadius: '999px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};