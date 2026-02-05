import { ref, set, onValue, off, onDisconnect, remove } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { PlayerInput, GameState } from '../types/game';
import { GameRoom } from '../types/firebase';

export class GameSyncService {
  private gameId: string;
  private uid: string;
  private unsubscribers: (() => void)[] = [];

  constructor(gameId: string, uid: string) {
    this.gameId = gameId;
    this.uid = uid;
  }

  // Write local input to RTDB
  writeInput(input: PlayerInput): void {
    const inputRef = ref(rtdb, `games/${this.gameId}/input/${this.uid}`);
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

  // Listen for remote player input (host reads guest input)
  listenToInput(remoteUid: string, callback: (input: PlayerInput) => void): void {
    const inputRef = ref(rtdb, `games/${this.gameId}/input/${remoteUid}`);
    onValue(inputRef, (snap) => {
      const data = snap.val();
      if (data) {
        callback(data as PlayerInput);
      }
    });
    this.unsubscribers.push(() => off(inputRef));
  }

  // Host writes game state
  writeState(state: GameState): void {
    const stateRef = ref(rtdb, `games/${this.gameId}/state`);
    set(stateRef, state);
  }

  // Guest reads game state
  listenToState(callback: (state: GameState) => void): void {
    const stateRef = ref(rtdb, `games/${this.gameId}/state`);
    onValue(stateRef, (snap) => {
      const data = snap.val();
      if (data) {
        callback(data as GameState);
      }
    });
    this.unsubscribers.push(() => off(stateRef));
  }

  // Listen for game config (both players)
  listenToConfig(callback: (config: GameRoom['config'] | null) => void): void {
    const configRef = ref(rtdb, `games/${this.gameId}/config`);
    onValue(configRef, (snap) => {
      callback(snap.val());
    });
    this.unsubscribers.push(() => off(configRef));
  }

  // Listen for game status
  listenToStatus(callback: (status: string | null) => void): void {
    const statusRef = ref(rtdb, `games/${this.gameId}/status`);
    onValue(statusRef, (snap) => {
      callback(snap.val());
    });
    this.unsubscribers.push(() => off(statusRef));
  }

  // Set up disconnect handler
  setupDisconnect(): void {
    const presRef = ref(rtdb, `games/${this.gameId}/presence/${this.uid}`);
    set(presRef, true);
    onDisconnect(presRef).set(false);
    this.unsubscribers.push(() => {
      set(presRef, false);
    });
  }

  // Listen for opponent presence
  listenToPresence(opponentUid: string, callback: (online: boolean) => void): void {
    const presRef = ref(rtdb, `games/${this.gameId}/presence/${opponentUid}`);
    onValue(presRef, (snap) => {
      callback(snap.val() === true);
    });
    this.unsubscribers.push(() => off(presRef));
  }

  // Mark game as finished
  finishGame(): void {
    const statusRef = ref(rtdb, `games/${this.gameId}/status`);
    set(statusRef, 'finished');
  }

  // Cleanup all listeners
  cleanup(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}
