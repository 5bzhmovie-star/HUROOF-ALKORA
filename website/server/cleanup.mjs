import { many, run, transaction } from './database.mjs';

export function cleanupExpired(at=Date.now()){
  transaction(()=>{
    const regular=many('SELECT id FROM rooms WHERE expires_at<?',at).map(row=>row.id);
    for(const id of regular){
      run('DELETE FROM match_players WHERE match_id IN (SELECT id FROM matches WHERE room_id=?)',id);
      run('DELETE FROM matches WHERE room_id=?',id);
      run('DELETE FROM events WHERE room_id=?',id);
      run('DELETE FROM members WHERE room_id=?',id);
      run('DELETE FROM rooms WHERE id=?',id);
    }
    const mini=many('SELECT id FROM mini_game_rooms WHERE expires_at<?',at).map(row=>row.id);
    for(const id of mini){
      run('DELETE FROM mini_game_events WHERE room_id=?',id);
      run('DELETE FROM mini_game_members WHERE room_id=?',id);
      run('DELETE FROM mini_game_rooms WHERE id=?',id);
    }
  });
}
