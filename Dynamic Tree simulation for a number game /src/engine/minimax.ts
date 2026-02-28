import { checkWinner, applyMove, POSSIBLE_MOVES } from './game';
import type { GameState } from './game';

// We want to visualize the tree, so we need a Node structure
export type EvaluationState = 'unevaluated' | 'evaluating' | 'evaluated';

export interface TreeNode {
    id: string; // Unique ID for D3/React keys
    state: GameState;
    moveMade: number | null; // The move that led to this state
    children: TreeNode[];
    score: number | null; // Minimax evaluation score
    evalState: EvaluationState;
    isOptimalPath: boolean;
}

// A snapshot of the decision tree to yield to the UI
export interface TreeSnapshot {
    root: TreeNode;
    currentNodeId: string; // node currently being visited
}

// Helper to create a unique ID for nodes
let nextId = 1;
function createNodeId(): string {
    return `node_${nextId++}`;
}

export function createInitialTree(gameState: GameState): TreeNode {
    nextId = 1;
    return {
        id: createNodeId(),
        state: gameState,
        moveMade: null,
        children: [],
        score: null,
        evalState: 'unevaluated',
        isOptimalPath: false,
    };
}

// We write Minimax as a generator function so we can yield the TreeSnapshot at every step.
// Yields `TreeSnapshot`. 
// Returns `number` (the best score for the maximizing player).
// The AI is the maximizing player (+1 for AI win, -1 for Human win).
export function* minimaxGenerator(
    node: TreeNode,
    root: TreeNode,
    alpha: number,
    beta: number,
    isMaximizing: boolean
): Generator<TreeSnapshot, number, unknown> {
    // Mark as evaluating
    node.evalState = 'evaluating';
    yield { root, currentNodeId: node.id };

    const winner = checkWinner(node.state);
    if (winner !== null) {
        // Terminal state
        const score = winner === 'AI' ? 10 : -10;
        node.score = score;
        node.evalState = 'evaluated';
        yield { root, currentNodeId: node.id };
        return score;
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of POSSIBLE_MOVES) {
            if (node.state.currentNumber - move >= 0) {
                const nextState = applyMove(node.state, move);
                const childNode: TreeNode = {
                    id: createNodeId(),
                    state: nextState,
                    moveMade: move,
                    children: [],
                    score: null,
                    evalState: 'unevaluated',
                    isOptimalPath: false,
                };
                node.children.push(childNode);

                // Show newly added child
                yield { root, currentNodeId: childNode.id };

                const evaluate = yield* minimaxGenerator(childNode, root, alpha, beta, false);
                maxEval = Math.max(maxEval, evaluate);

                // Alpha-beta pruning is possible, but for visualizing the full tree on small depths,
                // we might not want to prune. We will omit strictly required pruning to show full search tree,
                // unless depth gets too high. Since N is typically 15, branching 3^15 is huge.
                // Actually, without pruning or memoization, 3^15 is 14 million nodes. 
                // We MUST prune or use memoization. But memoization breaks a pure tree visualization.
                // Let's implement Alpha-Beta pruning so the UI tree doesn't blow up the browser!
                alpha = Math.max(alpha, evaluate);
                if (beta <= alpha) {
                    break; // Prune
                }
            }
        }
        node.score = maxEval;
        node.evalState = 'evaluated';
        yield { root, currentNodeId: node.id };
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of POSSIBLE_MOVES) {
            if (node.state.currentNumber - move >= 0) {
                const nextState = applyMove(node.state, move);
                const childNode: TreeNode = {
                    id: createNodeId(),
                    state: nextState,
                    moveMade: move,
                    children: [],
                    score: null,
                    evalState: 'unevaluated',
                    isOptimalPath: false,
                };
                node.children.push(childNode);

                yield { root, currentNodeId: childNode.id };

                const evaluate = yield* minimaxGenerator(childNode, root, alpha, beta, true);
                minEval = Math.min(minEval, evaluate);

                beta = Math.min(beta, evaluate);
                if (beta <= alpha) {
                    break; // Prune
                }
            }
        }
        node.score = minEval;
        node.evalState = 'evaluated';
        yield { root, currentNodeId: node.id };
        return minEval;
    }
}

// Function to find the optimal move based on the finalized tree
export function findBestMove(root: TreeNode): number | null {
    if (!root.children || root.children.length === 0) return null;
    // If AI is moving, root is maximizing player, so finding max score
    let bestScore = -Infinity;
    let bestMove = null;
    for (const child of root.children) {
        if (child.score !== null && child.score > bestScore) {
            bestScore = child.score;
            bestMove = child.moveMade;
        }
    }

    // Highlight the path (optional UI step)
    return bestMove;
}
