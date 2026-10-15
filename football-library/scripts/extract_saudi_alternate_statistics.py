"""Validate source period and club scope before preserving published metrics."""
import re,math

def extract(payload,season,allowed_teams):
 if not re.fullmatch(r'alahli::Football_Season::[a-f0-9]{32}',season) or payload.get('competition',{}).get('seasonId')!=season:raise ValueError('Source season mismatch')
 players=payload.get('players')
 if not isinstance(players,list):raise ValueError('Missing source player rows')
 result=[];seen=set()
 for player in players:
  pid=player.get('playerId');tid=player.get('team',{}).get('teamId')
  if not isinstance(pid,str) or not re.fullmatch(r'alahli::Football_Player::[a-f0-9]{32}',pid):raise ValueError('Invalid source player identity')
  if tid not in allowed_teams:raise ValueError('Source club outside approved league participants')
  key=(pid,tid)
  if key in seen:raise ValueError('Duplicate source person and club row')
  seen.add(key);stats=player.get('stats')
  if not isinstance(stats,list):raise ValueError('Statistics unavailable')
  kept=[];omitted=[];invalid=[];keys={}
  for stat in stats:
   if not isinstance(stat,dict) or not isinstance(stat.get('statsId'),str):raise ValueError('Invalid statistic record')
   sid=stat['statsId'];label=stat.get('statsLabel') or ''
   if sid.lower().startswith(('xg','xa')) or 'expected' in (sid+' '+label).lower():omitted.append(sid);continue
   value=stat.get('statsValue')
   if value is not None and (isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or value<0):
    invalid.append({'record':stat,'issue':'Invalid or negative source count; excluded from usable statistics, never corrected or replaced with zero'});continue
   if sid in keys and keys[sid]!=stat:raise ValueError('Conflicting metric in source row')
   if sid not in keys:kept.append(stat);keys[sid]=stat
  result.append({'sourcePersonId':pid,'providerId':player.get('providerId'),'sourceClubId':tid,'sourceSeasonId':season,'canonicalPersonId':None,'statisticsAsPublished':kept,'invalidStatisticsAsPublished':invalid,'omittedUnlicensedAdvancedMetrics':omitted,'scope':'Source season totals associated with source club; multi-club splits unverified','releaseReady':False})
 return result
