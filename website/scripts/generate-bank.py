"""Build Arabic questions from checked historical match data, with provenance.
No runtime generation: the server seeds this reviewed output into SQLite.
"""
from pathlib import Path
import csv, re, json, hashlib, collections
ROOT=Path(__file__).resolve().parent.parent
RAW=ROOT/'seed/raw'
names={}
def aliases(ar,*values):
 for v in values:names[v]=ar
aliases('بورنموث','AFC Bournemouth');aliases('آرسنال','Arsenal FC');aliases('أستون فيلا','Aston Villa FC');aliases('برايتون','Brighton & Hove Albion FC');aliases('بيرنلي','Burnley FC');aliases('تشيلسي','Chelsea FC');aliases('كريستال بالاس','Crystal Palace FC');aliases('إيفرتون','Everton FC');aliases('ليستر سيتي','Leicester City FC');aliases('ليفربول','Liverpool FC');aliases('مانشستر سيتي','Manchester City FC','Manchester City');aliases('مانشستر يونايتد','Manchester United FC','Manchester United');aliases('نيوكاسل يونايتد','Newcastle United FC');aliases('نورويتش سيتي','Norwich City FC');aliases('شيفيلد يونايتد','Sheffield United FC');aliases('ساوثهامبتون','Southampton FC');aliases('توتنهام','Tottenham Hotspur FC','Tottenham Hotspur');aliases('واتفورد','Watford FC');aliases('وست هام','West Ham United FC');aliases('وولفرهامبتون','Wolverhampton Wanderers FC')
aliases('كولن','1. FC Köln');aliases('يونيون برلين','1. FC Union Berlin');aliases('ماينز','1. FSV Mainz 05');aliases('باير ليفركوزن','Bayer 04 Leverkusen');aliases('بايرن ميونخ','Bayern München');aliases('بوروسيا مونشنغلادباخ','Bor. Mönchengladbach');aliases('بوروسيا دورتموند','Borussia Dortmund');aliases('آينتراخت فرانكفورت','Eintracht Frankfurt');aliases('أوغسبورغ','FC Augsburg');aliases('شالكه','FC Schalke 04');aliases('فورتونا دوسلدورف','Fortuna Düsseldorf');aliases('هيرتا برلين','Hertha BSC');aliases('لايبزيغ','RB Leipzig');aliases('فرايبورغ','SC Freiburg');aliases('بادربورن','SC Paderborn 07');aliases('هوفنهايم','TSG 1899 Hoffenheim','1899 Hoffenheim');aliases('فولفسبورغ','VfL Wolfsburg');aliases('فيردر بريمن','Werder Bremen')
aliases('أتلتيك بيلباو','Athletic Club Bilbao');aliases('أتلتيكو مدريد','Atlético Madrid');aliases('أوساسونا','CA Osasuna');aliases('ليغانيس','CD Leganés');aliases('ديبورتيفو ألافيس','Deportivo Alavés');aliases('برشلونة','FC Barcelona');aliases('خيتافي','Getafe CF');aliases('غرناطة','Granada CF');aliases('ليفانتي','Levante UD');aliases('سيلتا فيغو','RC Celta Vigo');aliases('إسبانيول','RCD Espanyol');aliases('مايوركا','RCD Mallorca');aliases('ريال بيتيس','Real Betis');aliases('ريال مدريد','Real Madrid');aliases('ريال سوسيداد','Real Sociedad');aliases('ريال بلد الوليد','Real Valladolid CF');aliases('إيبار','SD Eibar');aliases('إشبيلية','Sevilla FC');aliases('فالنسيا','Valencia CF');aliases('فياريال','Villarreal CF')
aliases('ميلان','AC Milan');aliases('فيورنتينا','ACF Fiorentina');aliases('روما','AS Roma');aliases('أتالانتا','Atalanta');aliases('بولونيا','Bologna FC');aliases('بريشيا','Brescia Calcio');aliases('كالياري','Cagliari Calcio');aliases('جنوى','Genoa CFC');aliases('هيلاس فيرونا','Hellas Verona');aliases('إنتر ميلان','Inter');aliases('يوفنتوس','Juventus');aliases('لاتسيو','Lazio Roma');aliases('بارما','Parma Calcio 1913');aliases('سبال','SPAL 2013 Ferrara');aliases('نابولي','SSC Napoli');aliases('سامبدوريا','Sampdoria');aliases('ساسولو','Sassuolo Calcio');aliases('تورينو','Torino FC');aliases('ليتشي','US Lecce');aliases('أودينيزي','Udinese Calcio')
aliases('موناكو','AS Monaco');aliases('سانت إيتيان','AS Saint-Étienne');aliases('أميان','Amiens SC');aliases('أنجيه','Angers SCO');aliases('ديجون','Dijon FCO');aliases('ميتز','FC Metz');aliases('نانت','FC Nantes');aliases('بوردو','Girondins Bordeaux');aliases('ليل','Lille OSC');aliases('مونبلييه','Montpellier HSC');aliases('نيم','Nîmes Olympique');aliases('نيس','OGC Nice');aliases('ليون','Olympique Lyonnais');aliases('مارسيليا','Olympique Marseille');aliases('باريس سان جيرمان','Paris Saint-Germain');aliases('ستراسبورغ','RC Strasbourg');aliases('بريست','Stade Brestois 29');aliases('رين','Stade Rennais');aliases('ريمس','Stade de Reims');aliases('تولوز','Toulouse FC')
aliases('أيك أثينا','AEK Athen');aliases('أياكس','AFC Ajax');aliases('يونغ بويز','BSC Young Boys');aliases('سيسكا موسكو','CSKA Moskva');aliases('كلوب بروج','Club Brugge KV');aliases('النجم الأحمر','Crvena Zvezda');aliases('بورتو','FC Porto');aliases('غلطة سراي','Galatasaray');aliases('لوكوموتيف موسكو','Lokomotiv Moskva');aliases('آيندهوفن','PSV Eindhoven');aliases('بنفيكا','SL Benfica');aliases('شاختار دونيتسك','Shakhtar Donetsk');aliases('فيكتوريا بلزن','Viktoria Plzeň')
for en,ar in [('Al-Hilal','الهلال'),('Al-Nassr','النصر'),('Al-Ittihad','الاتحاد'),('Al-Ahli','الأهلي'),('Al-Fateh','الفتح'),('Al-Shabab','الشباب'),('Al-Ettifaq','الاتفاق'),('Al-Riyadh','الرياض'),('Al-Wehda','الوحدة'),('Al-Taawoun','التعاون'),('Al Taawoun','التعاون'),('Al-Faisaly','الفيصلي'),('Al-Fayha','الفيحاء')]:aliases(ar,en)
for en,ar in [('Al Ain','العين'),('Jeonbuk Hyundai Motors','تشونبوك هيونداي'),('Urawa Red Diamonds','أوراوا ريد دايموندز'),('Gamba Osaka','غامبا أوساكا'),('Pohang Steelers','بوهانغ ستيلرز'),('Seongnam Ilhwa Chunma','سيونغنام إلهوا'),('Al-Sadd','السد'),('Ulsan Hyundai','أولسان هيونداي'),('Guangzhou Evergrande','غوانغجو إيفرغراند'),('Western Sydney Wanderers','وسترن سيدني واندررز'),('Kashima Antlers','كاشيما أنتلرز')]:aliases(ar,en)
for en,ar in [('Qatar','قطر'),('Ecuador','الإكوادور'),('Senegal','السنغال'),('Netherlands','هولندا'),('England','إنجلترا'),('Iran','إيران'),('USA','الولايات المتحدة'),('Wales','ويلز'),('Argentina','الأرجنتين'),('Saudi Arabia','السعودية'),('Mexico','المكسيك'),('Poland','بولندا'),('France','فرنسا'),('Australia','أستراليا'),('Denmark','الدنمارك'),('Tunisia','تونس'),('Spain','إسبانيا'),('Costa Rica','كوستاريكا'),('Germany','ألمانيا'),('Japan','اليابان'),('Belgium','بلجيكا'),('Canada','كندا'),('Morocco','المغرب'),('Croatia','كرواتيا'),('Brazil','البرازيل'),('Serbia','صربيا'),('Switzerland','سويسرا'),('Cameroon','الكاميرون'),('Portugal','البرتغال'),('Ghana','غانا'),('Uruguay','أوروغواي'),('South Korea','كوريا الجنوبية')]:aliases(ar,en)
ids=['saudi','england','spain','france','germany','italy','worldcup','ucl','afc','king','super']
titles=['الدوري السعودي','الدوري الإنجليزي','الدوري الإسباني','الدوري الفرنسي','الدوري الألماني','الدوري الإيطالي','كأس العالم','دوري أبطال أوروبا','دوري أبطال آسيا للنخبة','كأس الملك السعودي','كأس السوبر السعودي']
tournaments=[{'id':i,'name':name,'position':p} for p,(i,name) in enumerate(zip(ids,titles))]
questions=[]
seen=set()
def letter(answer):
 a=re.sub('[\u064B-\u065F\u0670ـ]','',answer.strip());a=re.sub('[أإآٱ]','ا',a)
 if a.startswith('ال'):a=a[2:]
 return a[0]
def add(category,text,answer,source,difficulty='medium',note='',pack=1):
 assert category in ids
 assert text not in seen, text
 assert letter(answer) in 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي',answer
 seen.add(text);entry={'id':'q_'+hashlib.sha256(text.encode()).hexdigest()[:20],'tournament_id':category,'letter':letter(answer),'text':text,'answer':answer,'difficulty':difficulty,'status':'published','source':source,'note':note}
 if pack>1:entry['pack']=pack
 questions.append(entry)
def translate(team):return names[re.sub(r'\s+\([A-Z]{3}\)$','',team.strip())]
months={'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}
def date_string(date):
 m=re.search(r'([A-Z][a-z]{2}) (\d{1,2}) (\d{4})',date)
 return f'{m[2]}/{months[m[1]]}/{m[3]}' if m else date
match_counts=collections.Counter()
def match_question(category,team1,team2,score,date,round_text,source):
 a,b=translate(team1),translate(team2);x,y=map(int,score);league=titles[ids.index(category)]
 context=f'{league} بتاريخ {date}'
 if x>y:
  text=f'أي فريق تغلّب على {b} بنتيجة {x}–{y} في {context}؟';answer=a
 elif y>x:
  text=f'أي فريق فاز على {a} بنتيجة {y}–{x} في {context}؟';answer=b
 else:
  text=f'من تعادل مع {a} بنتيجة {x}–{y} في {context}؟';answer=b
 add(category,text,answer,source,'hard' if x==y or max(x,y)<3 else 'medium',f'{a} {x}–{y} {b}. {round_text}.')
 # Each row supports several direct, unambiguous facts. This grows the bank
 # without inventing trivia or changing the meaning of the source record.
 add(category,f'من واجه {a} في {context} وانتهت المباراة بنتيجة {x}–{y}؟',b,source,'medium',f'{a} {x}–{y} {b}. {round_text}.',2 if category in ('france','ucl') else 3)
 add(category,f'أي فريق كان صاحب الأرض أمام {b} في {context} وانتهت المباراة بنتيجة {x}–{y}؟',a,source,'medium',f'{a} {x}–{y} {b}. {round_text}.',2 if category=='france' else 3)
 goal_words={0:'صفر من الأهداف',1:'هدف واحد',2:'هدفان',3:'ثلاثة أهداف',4:'أربعة أهداف',5:'خمسة أهداف',6:'ستة أهداف',7:'سبعة أهداف',8:'ثمانية أهداف',9:'تسعة أهداف',10:'عشرة أهداف'}
 assert x in goal_words and y in goal_words, score
 add(category,f'كم هدفًا سجّل {a} أمام {b} في {context}؟',goal_words[x],source,'easy',f'النتيجة النهائية المسجلة: {a} {x}–{y} {b}. {round_text}.',3)
 add(category,f'كم هدفًا سجّل {b} أمام {a} في {context}؟',goal_words[y],source,'easy',f'النتيجة النهائية المسجلة: {a} {x}–{y} {b}. {round_text}.',3)
 match_counts[category]+=1
sources={'england':'https://raw.githubusercontent.com/footballcsv/england/master/2010s/2019-20/eng.1.csv','germany':'https://raw.githubusercontent.com/footballcsv/deutschland/master/2010s/2019-20/de.1.csv','spain':'https://raw.githubusercontent.com/footballcsv/espana/master/2010s/2019-20/es.1.csv'}
for category in ['england','germany','spain']:
 for row in list(csv.reader((RAW/f'{category}.csv').open()))[1:]:
  if len(row)!=5 or not re.fullmatch(r'\d+-\d+',row[3]):continue
  match_question(category,row[2],row[4],row[3].split('-'),date_string(row[1]),'الجولة '+row[0]+'، موسم 2019–2020',sources[category])
for category,filename,base_year,source in [('italy','italy_text.txt',2019,'https://raw.githubusercontent.com/openfootball/italy/master/2019-20/1-seriea.txt'),('ucl','ucl_text.txt',2018,'https://raw.githubusercontent.com/openfootball/champions-league/master/2018-19/cl.txt')]:
 current_date=None;stage=''
 for line in (RAW/filename).read_text().splitlines():
  date=re.search(r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun) ([A-Z][a-z]{2}) (\d{1,2})',line)
  if date:
   month=months[date[2]];current_date=f'{date[3]}/{month}/{base_year if month>=8 else base_year+1}'
  if line.startswith('▪'):stage=line[1:].strip().replace('Matchday','الجولة').replace('Group','المجموعة').replace('Round of 16','دور الـ16').replace('Quarter-finals','ربع النهائي').replace('Semi-finals','نصف النهائي').replace('Final','النهائي')
  m=re.search(r'\d{2}:\d{2}\s+(.+?)\s+v\s+(.+?)\s+(\d+)-(\d+)',line)
  if m and current_date:match_question(category,m[1],m[2],m.group(3,4),current_date,stage,source)
for m in json.loads((RAW/'france_matches.json').read_text()):
 match_question('france',m['team1'],m['team2'],m['score']['ft'],'/'.join(reversed(m['date'].split('-'))),m['round'].replace('Matchday','الجولة'),'https://raw.githubusercontent.com/openfootball/football.json/master/2019-20/fr.1.json')
# Tournament records are deliberately bounded to completed historical seasons.
def source_rows(key):
 text=(RAW/f'facts-{key}.txt').read_text();return [r.strip() for r in re.split(r'L\d+: ?',text)]
for category in ['saudi','king']:
 for row in source_rows(category):
  m=re.match(r'\d+\s*\|\s*((?:19|20)\d{2}(?:–\d{2,4})?)\s*\|\s*([^|]+)\|\s*([^|\n]+)',row)
  if not m:continue
  year=int(m[1][:4])
  if year<1976 or year>2023+(category=='king'):continue
  winner,runner=m[2].strip(),m[3].strip()
  if winner not in names or runner not in names:continue
  season=m[1];label=titles[ids.index(category)];source='https://en.wikipedia.org/wiki/'+('Saudi_Pro_League' if category=='saudi' else 'King_Cup')
  add(category,f'من تُوّج بلقب {label} {"موسم" if category=="saudi" else "عام"} {season}؟',translate(winner),source,'easy' if year>=2010 else 'medium')
  add(category,f'من كان وصيف {label} {"موسم" if category=="saudi" else "عام"} {season}؟',translate(runner),source,'medium')
  if category=='saudi':
   add(category,f'أي نادٍ أنهى {label} موسم {season} في المركز الثاني خلف {translate(winner)}؟',translate(runner),source,'medium','',2)
   add(category,f'أي نادٍ تصدر ترتيب {label} موسم {season} متقدمًا على {translate(runner)}؟',translate(winner),source,'medium','',2)
  else:
   add(category,f'أي فريق خسر نهائي كأس الملك السعودي عام {season} أمام {translate(winner)}؟',translate(runner),source,'medium','',2)
   add(category,f'أي نادٍ تغلّب على {translate(runner)} في نهائي كأس الملك السعودي عام {season}؟',translate(winner),source,'medium','',2)
for row in source_rows('super'):
 m=re.match(r'(20\d{2})\s*\|\s*(Al-[^|]+)\|\s*(Al-[^|]+)\|',row)
 if not m or int(m[1])>2024:continue
 edition=m[1];source='https://en.wikipedia.org/wiki/Saudi_Super_Cup'
 add('super',f'أي نادٍ فاز بكأس السوبر السعودي في نسخة {edition}؟',translate(m[2]),source,'easy', 'المقصود اسم النسخة الرسمي، وقد يختلف عن السنة التي أُقيم فيها النهائي.')
 add('super',f'أي نادٍ خسر نهائي كأس السوبر السعودي في نسخة {edition}؟',translate(m[3]),source,'medium','المقصود اسم النسخة الرسمي، وليس بالضرورة سنة إقامة النهائي.')
 add('super',f'أي نادٍ واجه {translate(m[2])} في نهائي كأس السوبر السعودي نسخة {edition}؟',translate(m[3]),source,'medium','المقصود اسم النسخة الرسمي.',2)
 add('super',f'أي نادٍ تجاوز {translate(m[3])} في نهائي كأس السوبر السعودي نسخة {edition}؟',translate(m[2]),source,'medium','المقصود اسم النسخة الرسمي.',2)
for row in source_rows('afc'):
 m=re.match(r'((?:200[2-9]|201\d|202[0-3])(?:–\d{2})?)\s*\|\s*([^|\n]+)',row)
 if not m:continue
 name=re.sub(r'\s*\(\d+\)','',m[2]).strip()
 if name not in names:continue
 add('afc',f'أي نادٍ فاز بدوري أبطال آسيا في نسخة {m[1]}؟',translate(name),'https://en.wikipedia.org/wiki/AFC_Champions_League_Elite','medium','يشمل سجل البطولة قبل تغيير مسماها إلى دوري أبطال آسيا للنخبة.')
# 2022 group matches: match records plus the country represented, no fabricated players.
wc_text=(RAW/'worldcup_text.txt').read_text()
country_pattern='|'.join(sorted(map(re.escape,[n for n in ['Qatar','Ecuador','Senegal','Netherlands','England','Iran','USA','Wales','Argentina','Saudi Arabia','Mexico','Poland','France','Australia','Denmark','Tunisia','Spain','Costa Rica','Germany','Japan','Belgium','Canada','Morocco','Croatia','Brazil','Serbia','Switzerland','Cameroon','Portugal','Ghana','Uruguay','South Korea']]),key=len,reverse=True))
for m in re.finditer(r'('+country_pattern+r')\s+(\d+)-(\d+)\s+(?:\(\d+-\d+\)\s+)?('+country_pattern+r')\s+@',wc_text):
 a,x,y,b=m.group(1,2,3,4);a,b=translate(a),translate(b)
 date_match=list(re.finditer(r'(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Nov|Dec) (\d{1,2})',wc_text[:m.start()]))[-1]
 wc_date=f'{date_match[2]}/{months[date_match[1]]}/2022'
 if x==y:text=f'أي منتخب تعادل مع {a} بنتيجة {x}–{y} في دور مجموعات كأس العالم 2022؟';answer=b
 elif int(x)>int(y):text=f'أي منتخب هزم {b} بنتيجة {x}–{y} في مجموعات كأس العالم 2022؟';answer=a
 else:text=f'أي منتخب هزم {a} بنتيجة {y}–{x} في مجموعات كأس العالم 2022؟';answer=b
 text=text.replace('2022؟',f'2022 بتاريخ {wc_date}؟')
 add('worldcup',text,answer,'https://raw.githubusercontent.com/openfootball/world-cup/master/2022--qatar/cup.txt','medium')
# Hand-authored question packs are kept separate for editorial maintenance.
curated=ROOT/'seed/curated.json'
if curated.exists():
 for q in json.loads(curated.read_text()):add(q['tournament_id'],q['text'],q['answer'],q['source'],q.get('difficulty','easy'),q.get('note',''))
curated_questions=json.loads(curated.read_text())
for year in range(1930,2023,4):
 winners=[q for q in curated_questions if q['tournament_id']=='worldcup' and q['text']==f'أي منتخب تُوّج بكأس العالم {year}؟']
 runners=[q for q in curated_questions if q['tournament_id']=='worldcup' and q['text']==f'أي منتخب احتل المركز الثاني في كأس العالم {year}؟']
 if winners and runners and year!=1950:
  add('worldcup',f'أي منتخب واجه {winners[0]["answer"]} في نهائي كأس العالم {year}؟',runners[0]['answer'],winners[0]['source'],'medium','',2)
for edition,city,stadium in [(q['text'].split('نسخة ')[-1].split('؟')[0],q['answer'],next(s['answer'] for s in curated_questions if s['tournament_id']=='super' and s['text']==f'ما اسم ملعب نهائي السوبر السعودي لنسخة {q["text"].split("نسخة ")[-1].split("؟")[0]}؟')) for q in curated_questions if q['tournament_id']=='super' and q['text'].startswith('في أي مدينة أُقيم نهائي كأس السوبر السعودي لنسخة')]:
 source='https://en.wikipedia.org/wiki/Saudi_Super_Cup'
 add('super',f'في أي مدينة يقع {stadium} الذي استضاف السوبر السعودي في نسخة {edition}؟',city,source,'medium','',2)
 add('super',f'أي ملعب استضاف نهائي السوبر السعودي نسخة {edition} في {city}؟',stadium,source,'hard','',2)
# Finals recorded in the AFC's official roll of honour. These are new opponent facts.
afc_finals=[('2002–03','العين','بي إي سي تيرو ساسانا'),('2004','الاتحاد','سيونغنام إلهوا'),('2005','الاتحاد','العين'),('2006','تشونبوك هيونداي','الكرامة'),('2007','أوراوا ريد دايموندز','سباهان'),('2008','غامبا أوساكا','أديلايد يونايتد'),('2009','بوهانغ ستيلرز','الاتحاد'),('2010','سيونغنام إلهوا','ذوب آهن'),('2023–24','العين','يوكوهاما إف مارينوس')]
for edition,winner,runner in afc_finals:
 source='https://www.the-afc.com/en/club/afc_champions_league.html/news/year-in-review-afc-champions-league%E2%84%A2-202324' if edition=='2023–24' else 'https://www.the-afc.com/en/more/news/roll_of_honour.html'
 add('afc',f'أي نادٍ خسر نهائي دوري أبطال آسيا نسخة {edition} أمام {winner}؟',runner,source,'medium','',2)
 add('afc',f'أي نادٍ فاز على {runner} في نهائي دوري أبطال آسيا نسخة {edition}؟',winner,source,'medium','',2)
for q in curated_questions:
 if q['tournament_id']=='afc' and q['text'].startswith('من تصدّر هدافي دوري أبطال آسيا في نسخة'):
  add('afc',q['text'].replace('من تصدّر هدافي','من حصل على لقب هداف'),q['answer'],q['source'],'medium','',2)

# General football-law fillers do not belong inside named competition sections.
# Keep only facts about the selected tournament, even when that means a rare
# Arabic answer letter is unavailable for that selection.
questions=[q for q in questions if q.get('note')!='قاعدة كروية عامة تنطبق على مباريات هذه البطولة.']
seen={q['text'] for q in questions}
questions.sort(key=lambda q:q.get('pack',1))
output={'version':4,'historical_cutoff':'2024-12-31','created_at':'2026-09-15','letter_rule':'توحيد الهمزة وتجاهل أل التعريف','quality_standard':'سؤال مباشر ذو إجابة واحدة محددة، مرتبط بالبطولة المختارة نفسها، ومصدر HTTPS ظاهر بعد كشف الإجابة.','provenance':'سجلات مباريات تاريخية من OpenFootball وFootballCSV، وحقائق بطولات موثقة بمراجع مستقلة. لا يخلط البنك أسئلة قوانين أو مصطلحات عامة داخل أقسام البطولات. الصياغة العربية أصلية ومبسطة.','tournaments':tournaments,'questions':questions}
(ROOT/'seed/questions.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
report={'total':len(questions),'unique_texts':len(seen),'competitions':dict(collections.Counter(q['tournament_id'] for q in questions)),'letters':dict(collections.Counter(q['letter'] for q in questions)),'difficulties':dict(collections.Counter(q['difficulty'] for q in questions)),'historical_matches':dict(match_counts),'coverage':{i:{'letters':len(set(q['letter'] for q in questions if q['tournament_id']==i)),'minimum_per_letter':min(collections.Counter(q['letter'] for q in questions if q['tournament_id']==i).values())} for i in ids},'sources':len(set(q['source'] for q in questions))}
(ROOT/'seed/bank-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
assert len(questions)>5000, 'More than 5000 distinct questions are required'
assert all(report['competitions'][i]>=100 for i in ids), 'Every competition needs a substantial dedicated question pool'
