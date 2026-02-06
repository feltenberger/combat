import { PlayerInput, GameState } from '../types/game';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'failed';
export type TransportType = 'p2p' | 'relay';

/**
 * NetworkTransport interface for game data communication.
 * Implementations can use WebRTC (P2P) or Firebase (relay).
 */
export interface NetworkTransport {
  readonly state: ConnectionState;
  readonly transportType: TransportType;

  /**
   * Send local player input to remote peer.
   * Called by both host and guest.
   */
  sendInput(input: PlayerInput): void;

  /**
   * Send authoritative game state.
   * Called only by host.
   */
  sendState(state: GameState): void;

  /**
   * Register callback for receiving remote player input.
   * Host uses this to receive guest input.
   */
  onInput(callback: (input: PlayerInput) => void): void;

  /**
   * Register callback for receiving game state.
   * Guest uses this to receive host state updates.
   */
  onState(callback: (state: GameState) => void): void;

  /**
   * Register callback for connection state changes.
   */
  onStateChange(callback: (state: ConnectionState, type: TransportType) => void): void;

  /**
   * Clean up resources and close connections.
   */
  destroy(): void;
}

/**
 * Configuration for creating a network transport.
 */
export interface TransportConfig {
  gameId: string;
  localUid: string;
  remoteUid: string;
  isHost: boolean;
}
