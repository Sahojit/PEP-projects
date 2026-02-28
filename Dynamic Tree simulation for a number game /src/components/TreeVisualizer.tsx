import React, { useMemo } from 'react';
import type { TreeNode } from '../engine/minimax';

interface TreeVisualizerProps {
    root: TreeNode | null;
    currentNodeId: string | null;
}

export const TreeVisualizer: React.FC<TreeVisualizerProps> = ({ root, currentNodeId }) => {

    // Simple pure recursive function to measure width/depth footprint
    // to calculate layout coords
    const computeLayout = (node: TreeNode, depth: number, offsetLeft: number): { width: number } => {
        // base calculation for x, y
        if (node.children.length === 0) {
            return { width: 1 };
        }
        let totalWidth = 0;
        for (const child of node.children) {
            const w = computeLayout(child, depth + 1, offsetLeft + totalWidth);
            totalWidth += w.width;
        }
        return { width: Math.max(1, totalWidth) };
    };

    // Build a flat list of nodes and links with X/Y coordinates
    const { nodesFlat, linksFlat, maxDepth, totalWidth } = useMemo(() => {
        if (!root) return { nodesFlat: [], linksFlat: [], maxDepth: 0, totalWidth: 0 };

        // 1. Calculate leaf distribution
        const treeWidth = computeLayout(root, 0, 0).width;

        const nFlat: any[] = [];
        const lFlat: any[] = [];
        let dMax = 0;

        // 2. Assign coordinates recursively
        const traverse = (node: TreeNode, depth: number, leftIndex: number, widthAlloc: number): number => {
            dMax = Math.max(dMax, depth);
            const myX = leftIndex + widthAlloc / 2;
            const myY = depth;

            nFlat.push({ ...node, x: myX, y: myY });

            if (node.children.length > 0) {
                let currentLeft = leftIndex;
                // Distribute width evenly among children
                // In a real tree layout algorithm (Reingold-Tilford), it's more complex,
                // but uniform distribution works for balanced/simulated trees
                const childWidthAlloc = widthAlloc / node.children.length;

                for (const child of node.children) {
                    const childX = traverse(child, depth + 1, currentLeft, childWidthAlloc);
                    lFlat.push({
                        source: { x: myX, y: myY },
                        target: { x: childX, y: depth + 1 },
                        evalState: child.evalState
                    });
                    currentLeft += childWidthAlloc;
                }
            }
            return myX;
        };

        traverse(root, 0, 0, treeWidth);
        return { nodesFlat: nFlat, linksFlat: lFlat, maxDepth: dMax, totalWidth: treeWidth };
    }, [root]);

    if (!root) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                <p>Waiting for AI to think...</p>
            </div>
        );
    }

    // ViewBox mapping
    const NODE_RADIUS = 16;
    const LEVEL_HEIGHT = 80;
    const X_SPACING = 50;

    const vbWidth = totalWidth * X_SPACING;
    const vbHeight = (maxDepth + 1.5) * LEVEL_HEIGHT;

    const nodeColor = (node: TreeNode) => {
        if (node.id === currentNodeId) return '#f59e0b'; // Highlight current evaluating
        if (node.evalState === 'unevaluated') return 'var(--color-bg-surface-elevated)';
        if (node.score === 10) return 'var(--color-danger)'; // AI Win path
        if (node.score === -10) return 'var(--color-success)'; // Human Win path
        return '#4f46e5'; // Intermediate evaluated
    };

    return (
        <div className="glass-panel" style={{ flex: 1, width: '100%', overflow: 'auto', position: 'relative', borderRadius: 'var(--radius-lg)' }}>
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${vbWidth} ${vbHeight}`}
                preserveAspectRatio="xMidYMin meet"
                style={{ minHeight: '400px' }}
            >
                <g transform={`translate(0, ${LEVEL_HEIGHT / 2})`}>
                    {/* Edges */}
                    {linksFlat.map((l, i) => (
                        <line
                            key={`link_${i}`}
                            x1={l.source.x * X_SPACING}
                            y1={l.source.y * LEVEL_HEIGHT}
                            x2={l.target.x * X_SPACING}
                            y2={l.target.y * LEVEL_HEIGHT}
                            stroke={l.evalState === 'unevaluated' ? 'var(--color-border)' : 'rgba(255,255,255,0.2)'}
                            strokeWidth={2}
                            style={{ transition: 'all 0.3s ease' }}
                        />
                    ))}

                    {/* Nodes */}
                    {nodesFlat.map(n => (
                        <g
                            key={n.id}
                            transform={`translate(${n.x * X_SPACING}, ${n.y * LEVEL_HEIGHT})`}
                            style={{ transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
                        >
                            <circle
                                r={NODE_RADIUS}
                                fill={nodeColor(n)}
                                stroke={n.id === currentNodeId ? '#fff' : 'var(--color-border)'}
                                strokeWidth={n.id === currentNodeId ? 3 : 1}
                                style={{ transition: 'fill 0.3s ease, stroke 0.3s ease' }}
                            />
                            <text
                                dy=".3em"
                                textAnchor="middle"
                                fill="#fff"
                                fontSize="12px"
                                fontWeight="600"
                                style={{ pointerEvents: 'none' }}
                            >
                                {n.state.currentNumber}
                            </text>
                            {/* Optional: Show Minimax score below node */}
                            {(n.score !== null) && (
                                <text
                                    dy="2.5em"
                                    textAnchor="middle"
                                    fill={n.score > 0 ? 'var(--color-danger)' : n.score < 0 ? 'var(--color-success)' : 'var(--color-text-secondary)'}
                                    fontSize="10px"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {n.score > 0 ? '+1' : n.score < 0 ? '-1' : '0'}
                                </text>
                            )}
                            {/* Move made label on the edge */}
                            {n.moveMade !== null && (
                                <text
                                    dx="-1em"
                                    dy="-1.5em"
                                    fill="var(--color-text-secondary)"
                                    fontSize="10px"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    -{n.moveMade}
                                </text>
                            )}
                        </g>
                    ))}
                </g>
            </svg>
        </div>
    );
};
