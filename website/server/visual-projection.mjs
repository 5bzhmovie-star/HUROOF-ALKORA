export function publicVisual(visual, revealAll=false, revealedSlots=[]) {
  if(!visual)return null;
  if(visual.type==='image')return {type:'image',image:visual.image};
  if(['common_link','odd_one_out'].includes(visual.type))return {type:visual.type,cards:(visual.cards||[]).map((p,slot)=>({slot,name:p.name,photo:p.photo})),...(revealAll?{explanation:visual.explanation,...(visual.type==='odd_one_out'?{answerIndex:visual.answerIndex}:{})}:{})};
  if(visual.type==='missing_player')return {type:visual.type,eventDate:visual.eventDate,competition:visual.competition||'',formation:visual.formation,teamName:visual.teamName||'',players:(visual.players||[]).map(p=>{const hidden=p.slot===visual.missingSlot&&!revealAll;return {slot:p.slot,x:p.x,y:p.y,missing:hidden,...(!hidden?{name:p.name,photo:p.photo,position:p.position,number:p.number??null}:{} )};})};
  const slots=new Set(revealedSlots);
  const shared={type:visual.type,eventDate:visual.eventDate,competition:visual.competition||'',formation:visual.formation||null};
  if(['career','coach_career'].includes(visual.type))return {...shared,stations:visual.stations.map(s=>({clubLogo:s.clubLogo,from:s.from,to:s.to,loan:!!s.loan})),...(revealAll?{playerPhoto:visual.playerPhoto,playerName:visual.playerName}: {})};
  return {...shared,players:visual.players.map(p=>{
    const exposed=revealAll||slots.has(p.slot);
    return {slot:p.slot,x:p.x,y:p.y,marker:visual.type==='guess_club_nationalities'?p.flag:p.clubLogo,
      ...(exposed?{photo:p.photo,name:p.name,position:p.position,nationality:p.nationality,clubAtDate:p.clubAtDate,number:p.number??null}: {})};
  }),...(revealAll?{teamName:visual.teamName,teamImage:visual.teamImage,coach:visual.coach||null}: {})};
}
