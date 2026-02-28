import { useState, useEffect, useRef } from 'react';
import { GameUI } from './components/GameUI';
import { TreeVisualizer } from './components/TreeVisualizer';
import {
  getInitialState,
  applyMove,
  isGameOver,
} from './engine/game';
import type { GameState } from './engine/game';
import {
  createInitialTree,
  minimaxGenerator,
  findBestMove,
} from './engine/minimax';
import type { TreeNode, TreeSnapshot } from './engine/minimax';

function App() {
  const [gameState, setGameState] = useState<GameState>(getInitialState());
  const [treeRoot, setTreeRoot] = useState<TreeNode | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // We use a ref to control the generator loop so we can abort it if the user resets
  const abortController = useRef<AbortController | null>(null);

  const handleReset = () => {
    if (abortController.current) {
      abortController.current.abort();
    }
    setGameState(getInitialState());
    setTreeRoot(null);
    setCurrentNodeId(null);
    setIsThinking(false);
  };

  const handleHumanMove = (move: number) => {
    if (gameState.currentPlayer !== 'Human' || isGameOver(gameState)) return;
    try {
      const nextState = applyMove(gameState, move);
      setGameState(nextState);
    } catch (e) {
      console.error(e);
    }
  };

  // Effect to trigger AI move when it's AI turn
  useEffect(() => {
    if (gameState.currentPlayer === 'AI' && !isGameOver(gameState) && !isThinking) {
      setIsThinking(true);

      const newCtx = new AbortController();
      abortController.current = newCtx;

      const runAI = async () => {
        // Create initial tree for this move
        const root = createInitialTree(gameState);
        setTreeRoot(root);

        // Let's limit the depth or it might be too large initially
        // Standard minimax depth without pruning is huge, but we added alpha-beta.
        const generator = minimaxGenerator(root, root, -Infinity, Infinity, true);

        let result = generator.next();

        while (!result.done) {
          if (newCtx.signal.aborted) return;

          const snapshot: TreeSnapshot = result.value;
          // To make it look cool and "smooth", we don't need to yield EVERY single loop state with a delay,
          // otherwise it takes hours. Let's do a tiny delay.
          // In React, setting state rapidly might batch. We'll force a tiny delay so we can see the tree grow.

          setTreeRoot({ ...snapshot.root }); // shallow clone to trigger re-render
          setCurrentNodeId(snapshot.currentNodeId);

          // Delay to visualize
          await new Promise(r => setTimeout(r, 20)); // ultra fast but visible

          result = generator.next();
        }

        if (newCtx.signal.aborted) return;

        // Generator finished, finding best move
        const treeFinale = root;
        const bestMove = findBestMove(treeFinale);

        setCurrentNodeId(null); // un-highlight
        setIsThinking(false);

        if (bestMove !== null) {
          // slight pause before applying so human sees the final tree briefly
          await new Promise(r => setTimeout(r, 500));
          if (newCtx.signal.aborted) return;

          setGameState(applyMove(gameState, bestMove));
        } else {
          console.error("No valid move found by AI!");
          setIsThinking(false);
        }
      };

      runAI();
    }
  }, [gameState, isThinking]);

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header className="glass-panel" style={{ padding: '1rem', textAlign: 'center', zIndex: 10, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Subtract to Zero</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Interactive Minimax Decision Tree Simulation
        </p>
      </header>

      <main style={{ flex: 1, display: 'flex', gap: '1rem', padding: '1rem', overflow: 'hidden' }}>
        {/* Left Side: Game UI */}
        <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column' }}>
          <GameUI
            state={gameState}
            onMakeMove={handleHumanMove}
            isAITurn={gameState.currentPlayer === 'AI'}
            isThinking={isThinking}
            onReset={handleReset}
          />
          <div className="glass-panel" style={{ marginTop: '1rem', padding: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>How it works</h3>
            <p>Start with a number (default 15). Players take turns subtracting 1, 2, or 3. First to exactly 0 wins.</p>
            <p style={{ marginTop: '0.5rem' }}>When the AI thinks, it uses the <strong>Minimax with Alpha-Beta Pruning</strong> algorithm to explore possible futures. The mathematical decision tree is visualised on the right.</p>
          </div>
        </div>

        {/* Right Side: Visualizer */}
        <TreeVisualizer root={treeRoot} currentNodeId={currentNodeId} />
      </main>
    </div>
  );
}

export default App;
