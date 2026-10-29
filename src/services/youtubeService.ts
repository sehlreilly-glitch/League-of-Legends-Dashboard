import { getDb } from './firebaseService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function handleYoutubeArchiveRouting(
  user: any, 
  streamMode: 'POV' | 'SCOUT' | 'SCOUT_POV',
  selectedSchool: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      let playlistId = userData.youtubePlaylistId;

      // Conditional Creation
      if ((userData.school === "Basha" || user.school === "Basha" || true) && !playlistId) { // Fallback if school not set
        // Mock YouTube API creation
        console.log(`[YouTube API Mock] Creating playlist for ${userData.displayName || user.displayName} | Basha High School | Career Archive`);
        
        playlistId = `PL_mock_${Math.random().toString(36).substr(2, 9)}`;
        const playlistUrl = `https://youtube.com/playlist?list=${playlistId}`;
        
        await updateDoc(userRef, {
          youtubePlaylistId: playlistId,
          youtubePlaylistUrl: playlistUrl
        });
        console.log(`[YouTube API Mock] Updated Firestore with new playlist: ${playlistId}`);
      }

      // Video Routing
      if (streamMode === 'SCOUT' || streamMode === 'SCOUT_POV') {
        const opponentPlaylistId = `PL_Oppo_${selectedSchool.replace(/[^a-zA-Z0-9]/g, '')}`;
        console.log(`[YouTube API Mock] Bypassing player archive. Adding to opponent playlist: ${opponentPlaylistId} (${selectedSchool})`);
      } else {
        if (playlistId) {
          console.log(`[YouTube API Mock] Adding VOD to player's existing career playlist: ${playlistId}`);
        }
      }
    }
  } catch (error) {
    console.error("YouTube Archive Routing Failed", error);
  }
}
