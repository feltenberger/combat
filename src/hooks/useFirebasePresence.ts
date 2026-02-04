import { useEffect, useState, useRef } from 'react';
import { setupPresence, listenToPresence } from '../firebase/presence';
import { PresenceData } from '../types/firebase';

export function useFirebasePresence(uid: string | null, name: string) {
  const [players, setPlayers] = useState<Record<string, PresenceData>>({});
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!uid || !name) return;

    // Set up own presence
    cleanupRef.current = setupPresence(uid, name);

    // Listen to all presence
    const unsubPresence = listenToPresence((data) => {
      setPlayers(data);
    });

    return () => {
      cleanupRef.current?.();
      unsubPresence();
    };
  }, [uid, name]);

  const onlinePlayers = Object.entries(players)
    .filter(([id, p]) => p.online && id !== uid)
    .map(([id, p]) => ({ uid: id, name: p.name }));

  return { players, onlinePlayers };
}
