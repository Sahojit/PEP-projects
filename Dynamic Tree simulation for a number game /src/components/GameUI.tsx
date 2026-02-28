import React from 'react';
import { checkWinner, isGameOver, POSSIBLE_MOVES } from '../engine/game';
import type { GameState } from '../engine/game';
import { BrainCircuit, User } from 'lucide-react';

interface GameUIProps {
    state: GameState;
    onMakeMove: (move: number) => void;
    isAITurn: boolean;
    isThinking: boolean;
    onReset: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({ state, onMakeMove, isAITurn, isThinking, onReset }) => {
    const winner = checkWinner(state);
    const gameOver = isGameOver(state);

    return (
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '400px', margin: '0 auto' }}>

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--color-primary-hover)', textShadow: 'var(--shadow-glow)', lineHeight: 1 }}>
                    {state.currentNumber}
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Current Number
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: state.currentPlayer === 'Human' && !gameOver ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                    <User size={20} />
                    <span style={{ fontWeight: state.currentPlayer === 'Human' ? 600 : 400 }}>Your Turn</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: state.currentPlayer === 'AI' && !gameOver ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                    <span style={{ fontWeight: state.currentPlayer === 'AI' ? 600 : 400 }}>AI Turn</span>
                    <BrainCircuit size={20} className={isThinking ? 'thinking-anim' : ''} />
                </div>
            </div>

            {winner && (
                <div style={{ textAlign: 'center', padding: '1rem', background: winner === 'Human' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${winner === 'Human' ? 'var(--color-success)' : 'var(--color-danger)'}`, borderRadius: 'var(--radius-md)' }}>
                    <h2 style={{ color: winner === 'Human' ? 'var(--color-success)' : 'var(--color-danger)', margin: 0 }}>
                        {winner === 'Human' ? 'You Won! 🎉' : 'AI Wins! 🤖'}
                    </h2>
                    <button onClick={onReset} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Play Again</button>
                </div>
            )}

            {!gameOver && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {POSSIBLE_MOVES.map(move => {
                        const disabled = isAITurn || isThinking || state.currentNumber - move < 0;
                        return (
                            <button
                                key={move}
                                disabled={disabled}
                                onClick={() => onMakeMove(move)}
                                style={{
                                    padding: '1rem',
                                    fontSize: '1.25rem',
                                    fontWeight: 600,
                                    color: disabled ? 'var(--color-text-secondary)' : '#fff',
                                    background: disabled ? 'rgba(255,255,255,0.05)' : 'var(--color-bg-surface-elevated)',
                                    border: `1px solid ${disabled ? 'transparent' : 'var(--color-border)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: disabled ? 'none' : 'var(--shadow-sm)'
                                }}
                                onMouseOver={e => { if (!disabled) e.currentTarget.style.background = 'var(--color-primary-hover)'; }}
                                onMouseOut={e => { if (!disabled) e.currentTarget.style.background = 'var(--color-bg-surface-elevated)'; }}
                            >
                                -{move}
                            </button>
                        )
                    })}
                </div>
            )}

            <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; color: var(--color-danger); }
          100% { transform: scale(1); opacity: 0.8; }
        }
        .thinking-anim {
          animation: pulse 1s infinite alternate;
        }
      `}</style>
        </div>
    );
};
