import { PlayerInput, GameState } from '../types/game';
import {
  NetworkTransport,
  ConnectionState,
  TransportType,
  TransportConfig,
} from './NetworkTransport';
import { WebRTCTransport } from './WebRTCTransport';
import { FirebaseTransport } from './FirebaseTransport';
import { WEBRTC_CONNECT_TIMEOUT_MS } from './constants';

/**
 * HybridTransport attempts WebRTC P2P first, falling back to Firebase relay.
 *
 * Strategy:
 * 1. Start both transports simultaneously
 * 2. If WebRTC connects within timeout (5s), use P2P and pause Firebase
 * 3. If WebRTC fails or times out, fall back to Firebase relay
 * 4. If P2P disconnects mid-game, fall back to relay
 */
export class HybridTransport implements NetworkTransport {
  private _state: ConnectionState = 'connecting';
  private _transportType: TransportType = 'relay';
  private config: TransportConfig;

  private webrtc: WebRTCTransport;
  private firebase: FirebaseTransport;

  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private usingP2P = false;
  private p2pFailed = false;

  private stateChangeCallbacks: ((state: ConnectionState, type: TransportType) => void)[] = [];
  private inputCallbacks: ((input: PlayerInput) => void)[] = [];
  private stateCallbacks: ((state: GameState) => void)[] = [];

  constructor(config: TransportConfig) {
    this.config = config;

    // Create both transports
    this.webrtc = new WebRTCTransport(config);
    this.firebase = new FirebaseTransport(config);

    this.setupListeners();
    this.startConnectionTimeout();
  }

  get state(): ConnectionState {
    return this._state;
  }

  get transportType(): TransportType {
    return this._transportType;
  }

  private setState(newState: ConnectionState, type: TransportType): void {
    const changed = this._state !== newState || this._transportType !== type;
    this._state = newState;
    this._transportType = type;

    if (changed) {
      for (const cb of this.stateChangeCallbacks) {
        cb(newState, type);
      }
    }
  }

  private setupListeners(): void {
    // Listen for WebRTC state changes
    this.webrtc.onStateChange((state, type) => {
      this.handleWebRTCStateChange(state, type);
    });

    // Listen for Firebase state changes
    this.firebase.onStateChange((state, type) => {
      this.handleFirebaseStateChange(state, type);
    });

    // Forward input from both transports
    this.webrtc.onInput((input) => {
      if (this.usingP2P) {
        for (const cb of this.inputCallbacks) {
          cb(input);
        }
      }
    });

    this.firebase.onInput((input) => {
      if (!this.usingP2P) {
        for (const cb of this.inputCallbacks) {
          cb(input);
        }
      }
    });

    // Forward state from both transports
    this.webrtc.onState((state) => {
      if (this.usingP2P) {
        for (const cb of this.stateCallbacks) {
          cb(state);
        }
      }
    });

    this.firebase.onState((state) => {
      if (!this.usingP2P) {
        for (const cb of this.stateCallbacks) {
          cb(state);
        }
      }
    });
  }

  private startConnectionTimeout(): void {
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, WEBRTC_CONNECT_TIMEOUT_MS);
  }

  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private handleTimeout(): void {
    if (!this.usingP2P && !this.p2pFailed) {
      // P2P didn't connect in time, fall back to relay
      this.p2pFailed = true;
      this.fallbackToRelay();
    }
  }

  private handleWebRTCStateChange(state: ConnectionState, _type: TransportType): void {
    if (state === 'connected' && !this.p2pFailed) {
      // P2P connected successfully
      this.clearTimeout();
      this.usingP2P = true;
      this.firebase.pause();
      this.setState('connected', 'p2p');
    } else if (state === 'failed' || state === 'disconnected') {
      // P2P failed or disconnected
      this.p2pFailed = true;
      this.clearTimeout();

      if (this.usingP2P) {
        // Was using P2P, need to fall back to relay
        this.usingP2P = false;
        this.fallbackToRelay();
      } else {
        // Never established P2P, just use relay
        this.fallbackToRelay();
      }
    }
  }

  private handleFirebaseStateChange(state: ConnectionState, _type: TransportType): void {
    // Only care about Firebase state when not using P2P
    if (!this.usingP2P && state === 'connected') {
      this.setState('connected', 'relay');
    } else if (!this.usingP2P && (state === 'failed' || state === 'disconnected')) {
      this.setState(state, 'relay');
    }
  }

  private fallbackToRelay(): void {
    this.usingP2P = false;
    this.firebase.resume();

    // If Firebase is already connected, update our state
    if (this.firebase.state === 'connected') {
      this.setState('connected', 'relay');
    }
  }

  sendInput(input: PlayerInput): void {
    if (this.usingP2P) {
      this.webrtc.sendInput(input);
    } else {
      this.firebase.sendInput(input);
    }
  }

  sendState(state: GameState): void {
    if (this.usingP2P) {
      this.webrtc.sendState(state);
    } else {
      this.firebase.sendState(state);
    }
  }

  onInput(callback: (input: PlayerInput) => void): void {
    this.inputCallbacks.push(callback);
  }

  onState(callback: (state: GameState) => void): void {
    this.stateCallbacks.push(callback);
  }

  onStateChange(callback: (state: ConnectionState, type: TransportType) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  destroy(): void {
    this.clearTimeout();
    this.webrtc.destroy();
    this.firebase.destroy();

    this.inputCallbacks = [];
    this.stateCallbacks = [];
    this.stateChangeCallbacks = [];
  }
}
