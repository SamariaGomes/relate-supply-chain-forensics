import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Maximize2 } from 'lucide-react';
import type { GraphEdge, GraphNode } from '../db/relateClient';

interface GraphViewerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedIds: string[];
}

export function GraphViewer({ nodes, edges, highlightedIds }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [selectedInfo, setSelectedInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cyFactory = (cytoscape as any).default || cytoscape;
    const highlightSet = new Set(highlightedIds);
    const hasHighlight = highlightSet.size > 0;

    const elements = [
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          // Exibe texto fixo apenas nos pacotes/projeto para evitar poluição visual
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
            color: '#f8fafc',
            'font-size': '12px',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-background-color': '#020617',
            'text-background-opacity': 0.75,
            'text-background-padding': '2px',
            'background-color': '#64748b',
            width: 26,
            height: 26,
          },
        },
        {
          selector: 'node[nodeType = "Project"]',
          style: {
            'background-color': '#3b82f6',
            width: 40,
            height: 40,
            'font-size': '13px',
            'font-weight': 'bold',
          },
        },
        {
          selector: 'node[nodeType = "Vulnerability"]',
          style: {
            'background-color': '#ef4444',
            shape: 'diamond',
            width: 16,
            height: 16,
          },
        },
        {
          selector: 'node[highlighted = "yes"]',
          style: {
            'border-width': 2.5,
            'border-color': '#facc15',
          },
        },
        {
          selector: 'node[dimmed = "yes"]',
          style: {
            opacity: 0.2,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#334155',
            'target-arrow-color': '#334155',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'edge[edgeType = "HAS_VULNERABILITY"]',
          style: {
            width: 1,
            'line-color': 'rgba(239, 68, 68, 0.45)',
            'target-arrow-color': 'rgba(239, 68, 68, 0.45)',
            'line-style': 'dashed',
          },
        },
        {
          selector: 'edge[highlighted = "yes"]',
          style: {
            width: 2.5,
            'line-color': '#facc15',
            'target-arrow-color': '#facc15',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        fit: true,
        padding: 36,
        nodeRepulsion: () => 18000,
        idealEdgeLength: () => 85,
      },
    });

    cy.on('mouseover', 'node', (evt: any) => {
      const data = evt.target.data();
      const ver = data.version ? `@${data.version}` : '';
      setSelectedInfo(`${data.nodeType}: ${data.fullName}${ver}`);
    });

    cy.on('mouseout', 'node', () => {
      setSelectedInfo(null);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [nodes, edges, highlightedIds]);

  function handleFit() {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 36);
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '460px',
        background: '#0f172a',
        borderRadius: '12px',
        border: '1px solid #1e293b',
        overflow: 'hidden',
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

      {selectedInfo && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(2, 6, 23, 0.9)',
            border: '1px solid #334155',
            color: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          {selectedInfo}
        </div>
      )}

      <button
        onClick={handleFit}
        title="Centralizar Grafo"
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid #334155',
          color: '#cbd5e1',
          padding: '6px 10px',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
        }}
      >
        <Maximize2 size={14} /> Centralizar
      </button>
    </div>
  );
}