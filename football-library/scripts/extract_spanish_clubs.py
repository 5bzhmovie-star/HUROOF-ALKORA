"""Extract published senior squad cards, preserving club-specific identities."""
import re
from urllib.parse import urljoin,urlparse
from bs4 import BeautifulSoup

def extract(html,club):
 if club not in ('real-madrid','barcelona'):raise ValueError('Unsupported official club parser')
 madrid=club=='real-madrid';host='www.realmadrid.com' if madrid else 'www.fcbarcelona.com'
 soup=BeautifulSoup(html,'html.parser');result={}
 def text(card,selector):
  node=card.select_one(selector);return node.get_text(' ',strip=True) if node else None
 for card in soup.select('a.profile-card' if madrid else 'a.team-person'):
  href=urljoin('https://'+host,card.get('href',''));parsed=urlparse(href)
  if parsed.hostname!=host or parsed.scheme!='https':continue
  if madrid:
   match=re.fullmatch(r'/en-US/football/first-team/players/([a-z0-9-]+)',parsed.path)
   role=text(card,'.profile-card__role');name=text(card,'.profile-card__name');number=text(card,'.profile-card__number')
   if not match or role not in ('Coach','Goalkeeper','Defender','Midfielder','Forward','Centrocampista'):continue
   pid=match[1];kind='coach' if role=='Coach' else 'player';img=card.select_one('img.profile-card__img');photo=img.get('src') if img else None
  else:
   match=re.fullmatch(r'/en/football/first-team/(players|staff)/(\d+)/[a-z0-9-]+/?',parsed.path)
   if not match:continue
   role=text(card,'.team-person__position-meta');kind='coach' if match[1]=='staff' else 'player'
   if kind=='coach' and role not in ('Coach','Head Coach','Manager'):continue
   pid=match[2];name=' '.join(filter(None,[text(card,'.team-person__first-name'),text(card,'.team-person__last-name')]))
   number=text(card,'.team-person__number');source=card.select_one('source[data-image-src]');photo=None
   if source:
    variants=source['data-image-src'].split(',');photo=variants[-1].strip().split()[0]
  if not name:raise ValueError('Missing published name')
  if photo and (urlparse(photo).scheme!='https' or urlparse(photo).hostname!=('assets.realmadrid.com' if madrid else host)):raise ValueError('Unexpected portrait host')
  row={'sourcePersonId':pid,'sourceIdNamespace':club+'-official','sourceClubSlug':club,'kind':kind,'nameEnAsPublished':name,'roleAsPublished':role,'shirtNumber':int(number) if number and number.isdigit() and kind=='player' else None,'profileUrl':href,'portraitSource':photo,'canonicalPersonId':None,'verification':'pending-registration-identity-period-and-rights-review'}
  if pid in result and result[pid]!=row:raise ValueError('Conflicting responsive squad cards')
  result[pid]=row
 return list(result.values())
