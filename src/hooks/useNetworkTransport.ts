import { useRef, useEffect, useCallback, useState } from 'react';
import { HybridTransport } from '../network/HybridTransport';
import { ConnectionState, TransportType, TransportConfig } from '../network/NetworkTransport';
import { PlayerInput, GameState } from '../types/game';

export interface UseNetworkTransportOptions {
  gameId: string;
  localUid: string;
  remoteUid: string;
  isHost: boolean;
  /**
   * If true, skip P2P and use relay only.
   * Useful for CPU games or when WebRTC is known to be unavailable.
   */
  relayOnly?: boolean;
}

export interface UseNetworkTransportResult {
  /** Current connection state */
  state: ConnectionState;
  /** Current transport type (p2p or relay) */
  transportType: TransportType;
  /** Send local player input */
  sendInput: (input: PlayerInput) => void;
  /** Send game state (host only) */
  sendState: (state: GameState) => void;
  /** Register callback for remote input */
  onInput: (callback: (input: PlayerInput) => void) => void;
  /** Register callback for remote state */
  onState: (callback: (state: GameState) => void) => void;
}

/**
 * React hook for network transport.
 * Creates and manages a HybridTransport instance that attempts WebRTC P2P
 * and falls back to Firebase relay if needed.
 */
export function useNetworkTransport(options: UseNetworkTransportOptions): UseNetworkTransportResult {
  const { gameId, localUid, remoteUid, isHost, relayOnly } = options;

  const transportRef = useRef<HybridTransport | null>(null);
  const [state, setState] = useState<ConnectionState>('connecting');
  const [transportType, setTransportType] = useState<TransportType>('relay');

  // Callbacks stored in refs to avoid re-creating transport on callback changes
  const inputCallbacksRef = useRef<((input: PlayerInput) => void)[]>([]);
  const stateCallbacksRef = useRef<((state: GameState) => void)[]>([]);

  // Create transport on mount
  useEffect(() => {
    if (!gameId || !localUid || !remoteUid) {
      return;
    }

    const config: TransportConfig = {
      gameId,
      localUid,
      remoteUid,
      isHost,
    };

    const transport = new HybridTransport(config);
    transportRef.current = transport;

    // Set up state change listener
    transport.onStateChange((newState, newType) => {
      setState(newState);
      setTransportType(newType);
    });

    // Forward input to callbacks
    transport.onInput((input) => {
      for (const cb of inputCallbacksRef.current) {
        cb(input);
      }
    });

    // Forward state to callbacks
    transport.onState((gameState) => {
      for (const cb of stateCallbacksRef.current) {
        cb(gameState);
      }
    });

    return () => {
      transport.destroy();
      transportRef.current = null;
    };
  }, [gameId, localUid, remoteUid, isHost, relayOnly]);

  const sendInput = useCallback((input: PlayerInput) => {
    transportRef.current?.sendInput(input);
  }, []);

  const sendState = useCallback((gameState: GameState) => {
    transportRef.current?.sendState(gameState);
  }, []);

  const onInput = useCallback((callback: (input: PlayerInput) => void) => {
    inputCallbacksRef.current.push(callback);
  }, []);

  const onState = useCallback((callback: (state: GameState) => void) => {
    stateCallbacksRef.current.push(callback);
  }, []);

  return {
    state,
    transportType,
    sendInput,
    sendState,
    onInput,
    onState,
  };
}
