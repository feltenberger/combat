import { ref, set, onValue, off } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { PlayerInput, GameState } from '../types/game';
import {
  NetworkTransport,
  ConnectionState,
  TransportType,
  TransportConfig,
} from './NetworkTransport';

/**
 * Firebase Realtime Database transport implementation.
 * Uses RTDB for relaying game data between players.
 * This serves as the fallback when WebRTC P2P fails.
 */
export class FirebaseTransport implements NetworkTransport {
  private _state: ConnectionState = 'connecting';
  private _paused = false;
  private config: TransportConfig;
  private unsubscribers: (() => void)[] = [];
  private stateChangeCallbacks: ((state: ConnectionState, type: TransportType) => void)[] = [];
  private inputCallbacks: ((input: PlayerInput) => void)[] = [];
  private stateCallbacks: ((state: GameState) => void)[] = [];

  readonly transportType: TransportType = 'relay';

  constructor(config: TransportConfig) {
    this.config = config;
    this.setupListeners();
  }

  get state(): ConnectionState {
    return this._state;
  }

  private setState(newState: ConnectionState): void {
    if (this._state !== newState) {
      this._state = newState;
      for (const cb of this.stateChangeCallbacks) {
        cb(newState, this.transportType);
      }
    }
  }

  private setupListeners(): void {
    // Set up remote input listener
    const remoteInputRef = ref(rtdb, `games/${this.config.gameId}/input/${this.config.remoteUid}`);
    onValue(remoteInputRef, (snap) => {
      const data = snap.val();
      if (data) {
        for (const cb of this.inputCallbacks) {
          cb(data as PlayerInput);
        }
      }
    });
    this.unsubscribers.push(() => off(remoteInputRef));

    // Set up state listener (guest reads host state)
    const stateRef = ref(rtdb, `games/${this.config.gameId}/state`);
    onValue(stateRef, (snap) => {
      const data = snap.val();
      if (data) {
        for (const cb of this.stateCallbacks) {
          cb(data as GameState);
        }
      }
    });
    this.unsubscribers.push(() => off(stateRef));

    // Mark as connected once listeners are set up
    // In a real scenario, we might wait for first successful read
    this.setState('connected');
  }

  sendInput(input: PlayerInput): void {
    if (this._paused || this._state === 'disconnected' || this._state === 'failed') {
      return;
    }

    const inputRef = ref(rtdb, `games/${this.config.gameId}/input/${this.config.localUid}`);
    set(inputRef, {
      left: input.left,
      right: input.right,
      up: input.up,
      down: input.down,
      fire: input.fire,
      timestamp: input.timestamp,
      ...(input.targetAngle !== undefined && { targetAngle: input.targetAngle }),
    });
  }

  sendState(state: GameState): void {
    if (this._paused || this._state === 'disconnected' || this._state === 'failed') {
      return;
    }

    const stateRef = ref(rtdb, `games/${this.config.gameId}/state`);
    set(stateRef, state);
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

  /**
   * Pause sending data. Used when P2P is active to reduce Firebase usage.
   */
  pause(): void {
    this._paused = true;
  }

  /**
   * Resume sending data. Used when falling back from P2P to relay.
   */
  resume(): void {
    this._paused = false;
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.inputCallbacks = [];
    this.stateCallbacks = [];
    this.stateChangeCallbacks = [];
    this.setState('disconnected');
  }
}
