import { ref, set, onValue, off, remove, push } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { ChallengeData } from '../types/firebase';

export function sendChallenge(
  fromUid: string,
  fromName: string,
  toUid: string,
  toName: string,
  arenaIndex: number = 0,
): string {
  const challengeRef = ref(rtdb, `challenges/${toUid}`);
  const challenge: ChallengeData = {
    from: fromUid,
    fromName,
    to: toUid,
    toName,
    status: 'pending',
    arenaIndex,
    timestamp: Date.now(),
  };
  set(challengeRef, challenge);
  return toUid;
}

export function listenToChallenge(
  uid: string,
  callback: (challenge: ChallengeData | null) => void,
): () => void {
  const challengeRef = ref(rtdb, `challenges/${uid}`);
  onValue(challengeRef, (snap) => {
    callback(snap.val());
  });
  return () => off(challengeRef);
}

export async function acceptChallenge(uid: string, challenge: ChallengeData): Promise<string> {
  const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Create game room — write config and status separately so each
  // targets a path with its own .write rule
  const configRef = ref(rtdb, `games/${gameId}/config`);
  await set(configRef, {
    arenaIndex: challenge.arenaIndex,
    roundsToWin: 2,
    hostUid: challenge.from,
    guestUid: challenge.to,
    hostName: challenge.fromName,
    guestName: challenge.toName,
    createdAt: Date.now(),
  });

  const statusRef = ref(rtdb, `games/${gameId}/status`);
  await set(statusRef, 'active');

  // Update challenge with gameId and status
  const challengeRef = ref(rtdb, `challenges/${uid}`);
  set(challengeRef, {
    ...challenge,
    status: 'accepted',
    gameId,
  });

  // Also notify challenger
  const challengerNotif = ref(rtdb, `challenges/${challenge.from}`);
  set(challengerNotif, {
    ...challenge,
    status: 'accepted',
    gameId,
    to: challenge.from,
    from: challenge.to,
  });

  return gameId;
}

export function rejectChallenge(uid: string): void {
  const challengeRef = ref(rtdb, `challenges/${uid}`);
  remove(challengeRef);
}

export function clearChallenge(uid: string): void {
  const challengeRef = ref(rtdb, `challenges/${uid}`);
  remove(challengeRef);
}

export function listenToOutgoingChallenge(
  targetUid: string,
  callback: (challenge: ChallengeData | null) => void,
): () => void {
  const challengeRef = ref(rtdb, `challenges/${targetUid}`);
  onValue(challengeRef, (snap) => {
    callback(snap.val());
  });
  return () => off(challengeRef);
}
