import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { GraphEdge, GraphNode } from '../db/relateClient';

interface GraphViewerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedIds: string[];
}

export function GraphViewer({ nodes, edges, highlightedIds }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cyFactory = (cytoscape as any).default || cytoscape;
    const highlightSet = new Set(highlightedIds);
    const hasHighlight = highlightSet.size > 0;

    const elements = [
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.name,
          nodeType: n.label,
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
      autoungrabify: false,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            color: '#f8fafc',
            'font-size': '11px',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'background-color': '#475569',
            width: 24,
            height: 24,
          },
        },
        {
          selector: 'node[nodeType = "Project"]',
          style: {
            'background-color': '#3b82f6',
            width: 38,
            height: 38,
            'font-weight': 'bold',
          },
        },
        {
          selector: 'node[nodeType = "Vulnerability"]',
          style: {
            'background-color': '#ef4444',
            shape: 'diamond',
            width: 32,
            height: 32,
          },
        },
        {
          selector: 'node[highlighted = "yes"]',
          style: {
            'border-width': 3,
            'border-color': '#facc15',
          },
        },
        {
          selector: 'node[dimmed = "yes"]',
          style: {
            opacity: 0.25,
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
            'line-color': '#ef4444',
            'target-arrow-color': '#ef4444',
            'line-style': 'dashed',
          },
        },
        {
          selector: 'edge[highlighted = "yes"]',
          style: {
            width: 3,
            'line-color': '#facc15',
            'target-arrow-color': '#facc15',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        fit: true,
        padding: 30,
        nodeRepulsion: () => 8000,
      },
    });

    return () => {
      cy.destroy();
    };
  }, [nodes, edges, highlightedIds]);

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
    </div>
  );
}