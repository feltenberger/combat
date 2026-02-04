import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  query,
  orderBy,
  limit,
  getDocs,
  increment,
} from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { MatchRecord, PlayerStats } from '../types/firebase';

export async function saveMatchResult(match: MatchRecord): Promise<void> {
  try {
    // Save match record
    await addDoc(collection(firestore, 'matches'), match);

    // Update winner stats
    const winnerRef = doc(firestore, 'players', match.winnerUid);
    const winnerSnap = await getDoc(winnerRef);
    if (winnerSnap.exists()) {
      await setDoc(winnerRef, {
        name: match.winnerUid === match.hostUid ? match.hostName : match.guestName,
        wins: increment(1),
        roundsWon: increment(
          match.winnerUid === match.hostUid ? match.hostScore : match.guestScore
        ),
        roundsLost: increment(
          match.winnerUid === match.hostUid ? match.guestScore : match.hostScore
        ),
        lastPlayed: match.completedAt,
      }, { merge: true });
    } else {
      const isHost = match.winnerUid === match.hostUid;
      await setDoc(winnerRef, {
        uid: match.winnerUid,
        name: isHost ? match.hostName : match.guestName,
        wins: 1,
        losses: 0,
        roundsWon: isHost ? match.hostScore : match.guestScore,
        roundsLost: isHost ? match.guestScore : match.hostScore,
        lastPlayed: match.completedAt,
      });
    }

    // Update loser stats
    const loserUid = match.winnerUid === match.hostUid ? match.guestUid : match.hostUid;
    const loserRef = doc(firestore, 'players', loserUid);
    const loserSnap = await getDoc(loserRef);
    if (loserSnap.exists()) {
      await setDoc(loserRef, {
        name: loserUid === match.hostUid ? match.hostName : match.guestName,
        losses: increment(1),
        roundsWon: increment(
          loserUid === match.hostUid ? match.hostScore : match.guestScore
        ),
        roundsLost: increment(
          loserUid === match.hostUid ? match.guestScore : match.hostScore
        ),
        lastPlayed: match.completedAt,
      }, { merge: true });
    } else {
      const isHost = loserUid === match.hostUid;
      await setDoc(loserRef, {
        uid: loserUid,
        name: isHost ? match.hostName : match.guestName,
        wins: 0,
        losses: 1,
        roundsWon: isHost ? match.hostScore : match.guestScore,
        roundsLost: isHost ? match.guestScore : match.hostScore,
        lastPlayed: match.completedAt,
      });
    }
  } catch (err) {
    console.error('Failed to save match result:', err);
  }
}

export async function getRecentMatches(count: number = 50): Promise<MatchRecord[]> {
  try {
    const q = query(
      collection(firestore, 'matches'),
      orderBy('completedAt', 'desc'),
      limit(count),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as MatchRecord);
  } catch (err) {
    console.error('Failed to get matches:', err);
    return [];
  }
}

export async function getPlayerStats(uid: string): Promise<PlayerStats | null> {
  try {
    const docSnap = await getDoc(doc(firestore, 'players', uid));
    if (docSnap.exists()) {
      return docSnap.data() as PlayerStats;
    }
    return null;
  } catch (err) {
    console.error('Failed to get player stats:', err);
    return null;
  }
}
