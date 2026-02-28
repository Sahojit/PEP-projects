export type Player = 'Human' | 'AI';

export interface GameState {
    currentNumber: number;
    currentPlayer: Player;
}

export const INITIAL_NUMBER = 15;
export const WINNING_NUMBER = 0;
export const POSSIBLE_MOVES = [1, 2, 3];

export function getInitialState(): GameState {
    return {
        currentNumber: INITIAL_NUMBER,
        currentPlayer: 'Human', // Human usually goes first
    };
}

export function isValidMove(state: GameState, move: number): boolean {
    return POSSIBLE_MOVES.includes(move) && state.currentNumber - move >= 0;
}

export function applyMove(state: GameState, move: number): GameState {
    if (!isValidMove(state, move)) {
        throw new Error(`Invalid move: ${move}`);
    }
    return {
        currentNumber: state.currentNumber - move,
        currentPlayer: state.currentPlayer === 'Human' ? 'AI' : 'Human',
    };
}

export function checkWinner(state: GameState): Player | null {
    if (state.currentNumber === WINNING_NUMBER) {
        // The player who just moved won, meaning it's the OTHER player's turn now in the state
        return state.currentPlayer === 'Human' ? 'AI' : 'Human';
    }
    return null;
}

export function isGameOver(state: GameState): boolean {
    return state.currentNumber === WINNING_NUMBER;
}
