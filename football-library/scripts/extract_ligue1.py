"""Official Ligue 1 2026/27 participant-name evidence, awaiting source IDs and rosters."""
import datetime,hashlib,json,sys
from pathlib import Path
from bs4 import BeautifulSoup
SOURCE='https://ligue1.com/fr/articles/l1_article_5293-les-dates-de-reprise-des-clubs-de-l1-2627'
def extract(html):
 s=BeautifulSoup(html,'html.parser');title=s.find('h1');article=s.select_one('div.article')
 if not title or title.get_text(' ',strip=True)!="Quand reprennent les clubs de Ligue 1 McDonald's ?" or '2026/2027' not in s.get_text(' ',strip=True) or article is None:raise ValueError('Incorrect official Ligue 1 source or season')
 heading=article.find(['p','h2','h3'],string=lambda x:x and 'Les dates de reprise des clubs' in x)
 if heading is None:raise ValueError('Missing complete club listing heading')
 names=heading.find_next_sibling('p')
 if names is None:raise ValueError('Missing club listing')
 clubs=[{'nameAsPublished':e.get_text(' ',strip=True),'sourceClubId':None,'canonicalClubId':None,'verification':'official season article; source-identifier reconciliation pending'} for e in names.find_all('strong')]
 if len(clubs)!=18 or len({c['nameAsPublished'] for c in clubs})!=18:raise ValueError('Incomplete or duplicate Ligue 1 participant names')
 return {'season':'2026-2027','scope':'club-first-team-only','source':SOURCE,'sourceSha256':hashlib.sha256(html.encode()).hexdigest(),'verifiedAt':datetime.date.today().isoformat(),'clubs':clubs,'missing':['source club identifiers','all first-team rosters','coaches','contextual portraits','emblems and detailed statistics'],'releaseReady':False}
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit('Usage: extract_ligue1.py source.html output.json')
 raw=Path(sys.argv[1]).read_bytes();r=extract(raw.decode());r['sourceSha256']=hashlib.sha256(raw).hexdigest();Path(sys.argv[2]).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'clubs':len(r['clubs'])}))
