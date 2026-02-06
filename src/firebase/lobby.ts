import { ref, set, onValue, off, remove, push } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { ChallengeData } from '../types/firebase';
import { CpuPlayerConfig } from '../types/game';
import { TankColor, DEFAULT_FIRE_RATE, ROUNDS_TO_WIN } from '../config/constants';

export function sendChallenge(
  fromUid: string,
  fromName: string,
  toUid: string,
  toName: string,
  arenaIndex: number = 0,
  fromColor: TankColor = 'blue',
  fireRate: number = DEFAULT_FIRE_RATE,
  roundsToWin: number = ROUNDS_TO_WIN,
  livesPerRound?: number,
  cpuPlayers?: CpuPlayerConfig[],
): string {
  const challengeRef = ref(rtdb, `challenges/${toUid}`);
  const challenge: ChallengeData = {
    from: fromUid,
    fromName,
    to: toUid,
    toName,
    status: 'pending',
    arenaIndex,
    fromColor,
    fireRate,
    roundsToWin,
    timestamp: Date.now(),
    ...(livesPerRound !== undefined && { livesPerRound }),
    ...(cpuPlayers && cpuPlayers.length > 0 && { cpuPlayers }),
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

export async function acceptChallenge(
  uid: string,
  challenge: ChallengeData,
  guestColor: TankColor = 'blue',
): Promise<string> {
  const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Create game room — write config and status separately so each
  // targets a path with its own .write rule
  const configRef = ref(rtdb, `games/${gameId}/config`);
  await set(configRef, {
    arenaIndex: challenge.arenaIndex,
    roundsToWin: challenge.roundsToWin ?? ROUNDS_TO_WIN,
    hostUid: challenge.from,
    guestUid: challenge.to,
    hostName: challenge.fromName,
    guestName: challenge.toName,
    hostColor: challenge.fromColor || 'blue',
    guestColor,
    fireRate: challenge.fireRate ?? DEFAULT_FIRE_RATE,
    createdAt: Date.now(),
    ...(challenge.livesPerRound !== undefined && { livesPerRound: challenge.livesPerRound }),
    ...(Array.isArray(challenge.cpuPlayers) && challenge.cpuPlayers.length > 0 && { cpuPlayers: challenge.cpuPlayers }),
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
