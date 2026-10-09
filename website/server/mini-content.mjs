// Portable, server-only content shared by the Node and Sites runtimes.
// Solutions live here so they never have to be bundled into the public client.
const commons=(file,width=720)=>`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=${width}`;
const crest=id=>`https://crests.football-data.org/${id}.png`;
const flag=code=>`https://flagcdn.com/w320/${code}.png`;

export const MINI_MEDIA={
  ronaldo:{type:'player',url:commons('Cristiano_Ronaldo_2018.jpg'),fallback:'كريستيانو رونالدو',source:'https://commons.wikimedia.org/wiki/File:Cristiano_Ronaldo_2018.jpg',license:'CC BY-SA 3.0'},
  messi:{type:'player',url:commons('Lionel-Messi-Argentina-2022-FIFA-World-Cup_(cropped).jpg'),fallback:'ليونيل ميسي',source:'https://commons.wikimedia.org/wiki/File:Lionel-Messi-Argentina-2022-FIFA-World-Cup_(cropped).jpg',license:'CC BY 4.0'},
  salah:{type:'player',url:commons('Mohamed_Salah_2018.jpg'),fallback:'محمد صلاح',source:'https://commons.wikimedia.org/wiki/File:Mohamed_Salah_2018.jpg',license:'CC BY-SA 3.0'},
  debruyne:{type:'player',url:commons('Kevin_De_Bruyne_201807091.jpg'),fallback:'كيفن دي بروين',source:'https://commons.wikimedia.org/wiki/File:Kevin_De_Bruyne_201807091.jpg',license:'CC BY-SA 3.0'},
  bernardo:{type:'player',url:commons('Bernardo_Silva_2018.jpg'),fallback:'برناردو سيلفا',source:'https://commons.wikimedia.org/wiki/File:Bernardo_Silva_2018.jpg',license:'CC BY-SA 4.0'},
  haaland:{type:'player',url:commons('Erling_Haaland_2023_(cropped).jpg'),fallback:'إيرلينغ هالاند',source:'https://commons.wikimedia.org/wiki/File:Erling_Haaland_2023_(cropped).jpg',license:'CC BY-SA 4.0'},
  benzema:{type:'player',url:commons('Karim_Benzema_2021.jpg'),fallback:'كريم بنزيما',source:'https://commons.wikimedia.org/wiki/Category:Karim_Benzema',license:'Wikimedia Commons'},
  courtois:{type:'player',url:commons('Thibaut_Courtois_2018.jpg'),fallback:'تيبو كورتوا',source:'https://commons.wikimedia.org/wiki/Category:Thibaut_Courtois',license:'Wikimedia Commons'},
  rodri:{type:'player',url:commons('Rodri_2023.jpg'),fallback:'رودري',source:'https://commons.wikimedia.org/wiki/Category:Rodri_(footballer,_born_1996)',license:'Wikimedia Commons'},
  aguero:{type:'player',url:commons('Sergio_Aguero_2018.jpg'),fallback:'سيرخيو أغويرو',source:'https://commons.wikimedia.org/wiki/Category:Sergio_Ag%C3%BCero',license:'Wikimedia Commons'},
  iniesta:{type:'player',url:commons('Andres_Iniesta_2018.jpg'),fallback:'أندريس إنييستا',source:'https://commons.wikimedia.org/wiki/Category:Andr%C3%A9s_Iniesta',license:'Wikimedia Commons'},
  neymar:{type:'player',url:commons('Neymar_Jr._with_Al_Hilal,_3_October_2023_-_03.jpg'),fallback:'نيمار',source:'https://commons.wikimedia.org/wiki/File:Neymar_Jr._with_Al_Hilal,_3_October_2023_-_03.jpg',license:'Wikimedia Commons'},
  ancelotti:{type:'manager',url:commons('Carlo_Ancelotti_2016.jpg'),fallback:'كارلو أنشيلوتي',source:'https://commons.wikimedia.org/wiki/Category:Carlo_Ancelotti',license:'Wikimedia Commons'},
  mourinho:{type:'manager',url:commons('Jose_Mourinho_2017.jpg'),fallback:'جوزيه مورينيو',source:'https://commons.wikimedia.org/wiki/Category:Jos%C3%A9_Mourinho',license:'Wikimedia Commons'},
  real:{type:'club',url:crest(86),fallback:'ريال مدريد',source:'https://www.realmadrid.com/',license:'شعار للتعريف'},
  barcelona:{type:'club',url:crest(81),fallback:'برشلونة',source:'https://www.fcbarcelona.com/',license:'شعار للتعريف'},
  manunited:{type:'club',url:crest(66),fallback:'مانشستر يونايتد',source:'https://www.manutd.com/',license:'شعار للتعريف'},
  city:{type:'club',url:crest(65),fallback:'مانشستر سيتي',source:'https://www.mancity.com/',license:'شعار للتعريف'},
  liverpool:{type:'club',url:crest(64),fallback:'ليفربول',source:'https://www.liverpoolfc.com/',license:'شعار للتعريف'},
  chelsea:{type:'club',url:crest(61),fallback:'تشيلسي',source:'https://www.chelseafc.com/',license:'شعار للتعريف'},
  psg:{type:'club',url:crest(524),fallback:'باريس سان جيرمان',source:'https://www.psg.fr/',license:'شعار للتعريف'},
  juventus:{type:'club',url:crest(109),fallback:'يوفنتوس',source:'https://www.juventus.com/',license:'شعار للتعريف'},
  bayern:{type:'club',url:crest(5),fallback:'بايرن ميونخ',source:'https://fcbayern.com/',license:'شعار للتعريف'},
  inter:{type:'club',url:crest(108),fallback:'إنتر ميلان',source:'https://www.inter.it/',license:'شعار للتعريف'},
  argentina:{type:'flag',url:flag('ar'),fallback:'الأرجنتين',source:'https://github.com/lipis/flag-icons',license:'MIT'},
  france:{type:'flag',url:flag('fr'),fallback:'فرنسا',source:'https://github.com/lipis/flag-icons',license:'MIT'},
  brazil:{type:'flag',url:flag('br'),fallback:'البرازيل',source:'https://github.com/lipis/flag-icons',license:'MIT'},
  portugal:{type:'flag',url:flag('pt'),fallback:'البرتغال',source:'https://github.com/lipis/flag-icons',license:'MIT'},
  spain:{type:'flag',url:flag('es'),fallback:'إسبانيا',source:'https://github.com/lipis/flag-icons',license:'MIT'},
  belgium:{type:'flag',url:flag('be'),fallback:'بلجيكا',source:'https://github.com/lipis/flag-icons',license:'MIT'},
  germany:{type:'flag',url:flag('de'),fallback:'ألمانيا',source:'https://github.com/lipis/flag-icons',license:'MIT'},
  morocco:{type:'flag',url:flag('ma'),fallback:'المغرب',source:'https://github.com/lipis/flag-icons',license:'MIT'},
  bernabeu:{type:'stadium',url:commons('The_Santiago_Bernabeu_Stadium_-_U-g-g-B-o-y.jpg',1000),fallback:'سانتياغو برنابيو',source:'https://commons.wikimedia.org/wiki/File:The_Santiago_Bernabeu_Stadium_-_U-g-g-B-o-y.jpg',license:'CC BY 2.0'},
  wembley:{type:'stadium',url:commons('Wembley_Stadium_interior.jpg',1000),fallback:'ويمبلي',source:'https://commons.wikimedia.org/wiki/Category:Interior_of_Wembley_Stadium',license:'Wikimedia Commons'}
};

const game=(slug,title,english,description,difficulty='mixed',duration='٢–٤ دقائق')=>({slug,title,english,description,difficulty,duration});
export const MINI_GAMES=[
  game('player-journey','مسيرة اللاعب','Player Journey','اعرف اللاعب من شعارات أنديته بالترتيب.'),
  game('guess-the-team','اعرف الفريق من الجنسيات','Guess The Team','تشكيلة حقيقية تعرض الجنسيات في مراكزها.'),
  game('iconic-commentary','اعرف المباراة من الوصف','Iconic Commentary','استمع إلى وصف عربي للحظة كروية وحدد المباراة.'),
  game('who-am-i','من أنا؟','Who Am I?','تلميحات متدرجة تكشف اللاعب نقطة بعد نقطة.'),
  game('the-connection','وش الرابط؟','The Connection','صور لاعبين يجمعهم رابط كروي واحد.'),
  game('manager-journey','مسيرة المدرب','Manager Journey','اعرف المدرب من الفرق التي قادها.'),
  game('missing-player','اللاعب المفقود','Missing Player','أكمل اسم اللاعب الناقص من تشكيلة حقيقية.'),
  game('guess-the-lineup','اعرف التشكيلة','Guess The Lineup','اعرف الفريق من لاعبيه ومراكزهم.'),
  game('guess-the-match','اعرف المباراة','Guess The Match','أدلة عن بطولة وملعب ونتيجة تقود للمباراة.'),
  game('who-scored','صاحب الهدف','Who Scored?','اعرف صاحب الهدف من الدقيقة وسياق المباراة.'),
  game('player-by-numbers','اللاعب من أرقامه','Player By Numbers','بطاقة موسم موثقة بلا اسم أو صورة.'),
  game('guess-the-competition','اعرف البطولة','Guess The Competition','سلسلة أبطال تكشف اسم البطولة.'),
  game('which-season','أي موسم؟','Which Season?','أحداث كروية اجتمعت في موسم واحد.'),
  game('career-order','رتب المسيرة','Career Order','رتب شعارات أندية اللاعب زمنيًا.'),
  game('common-club','النادي المشترك','Common Club','حدد النادي الذي مثله اللاعبون جميعًا.'),
  game('teammates','لعب مع مين؟','Teammates','اختر اللاعب الذي زامل النجم فعلًا.'),
  game('odd-one-out','الدخيل','Odd One Out','ثلاثة يجمعهم رابط ولاعب واحد مختلف.'),
  game('guess-the-nation','اعرف المنتخب','Guess The Nation','اعرف المنتخب من طريقه في بطولة.'),
  game('guess-the-goalkeeper','من الحارس؟','Guess The Goalkeeper','أدلة النادي والموسم والبطولة تكشف الحارس.'),
  game('shirt-number','رقم القميص','Shirt Number','اختر رقم اللاعب في النادي والموسم المحددين.'),
  game('transfer-fee','سعر الانتقال','Transfer Fee','اختر القيمة المعلنة لانتقال اللاعب.'),
  game('guess-the-stadium','اعرف الملعب','Guess The Stadium','الصورة هي السؤال؛ اعرف الملعب.'),
  game('guess-the-final','اعرف النهائي','Guess The Final','حدد طرفي النهائي من البطولة والسنة والأدلة.'),
  game('higher-or-lower','أعلى أو أقل','Higher or Lower','هل الرقم الحقيقي أعلى أم أقل من الرقم المعروض؟'),
  game('who-won','من فاز؟','Who Won?','مباراة معلومة ونتيجتها مخفية.'),
  game('five-seconds','خمس ثوانٍ','Five Seconds','اذكر إجابة صحيحة قبل انتهاء خمس ثوانٍ.','mixed','٥ ثوانٍ'),
  game('the-bomb','القنبلة','The Bomb','تبادل الإجابات قبل انفجار المؤقت المخفي.'),
  game('streak','السلسلة','Streak','أسئلة متتابعة مع خيار تثبيت النقاط.'),
  game('quick-pick','الاختيار السريع','Quick Pick','أربع صور وإجابة واحدة؛ الأسرع يكسب.'),
  game('lineup-memory','ذاكرة التشكيلة','Lineup Memory','شاهد التشكيلة ثم أجب بعد إخفائها.'),
  game('player-path','طريق اللاعب','Player Path','أكمل طريق زمالة حقيقي بين لاعبين.')
];

const item=(media,label,extra={})=>({media,label,...extra});
const visual=(template,question,reveal)=>({template,question,reveal});
const make=(id,game_slug,prompt,solution,source,visualData,difficulty='medium',accepted=[solution],explanation='')=>({id,game_slug,difficulty,prompt,solution,accepted,source,visual:visualData,status:'published',explanation:explanation||`الإجابة الصحيحة: ${solution}.`});
const UCL23='https://www.uefa.com/uefachampionsleague/match/2037765--man-city-vs-inter/';
const WC22='https://www.fifa.com/en/tournaments/mens/worldcup/qatar2022';
const PL='https://www.premierleague.com/';
const RM='https://www.realmadrid.com/en-US/the-club/history/football-legends';
const LFC='https://www.liverpoolfc.com/team/mens/player/mohamed-salah';
const UEFA='https://www.uefa.com/uefachampionsleague/history/';

const journeyR=visual('journey',{items:[item('manunited','', {year:'2003'}),item('real','',{year:'2009'}),item('juventus','',{year:'2018'}),item('manunited','',{year:'2021'})],flag:'portugal'},{title:'كريستيانو رونالدو',hero:'ronaldo',items:[item('manunited','مانشستر يونايتد',{year:'2003'}),item('real','ريال مدريد',{year:'2009'}),item('juventus','يوفنتوس',{year:'2018'}),item('manunited','مانشستر يونايتد',{year:'2021'})],flag:'portugal'});
const journeyS=visual('journey',{items:[item('chelsea','',{year:'2014'}),item('liverpool','',{year:'2017'})],flag:'egypt'},{title:'محمد صلاح',hero:'salah',items:[item('chelsea','تشيلسي',{year:'2014'}),item('liverpool','ليفربول',{year:'2017'})],flag:'egypt'});
const orderR=visual('journey',{items:[item('juventus',''),item('manunited',''),item('real',''),item('manunited','')]},{title:'الترتيب الصحيح',items:journeyR.reveal.items});
const orderS=visual('journey',{items:[item('liverpool',''),item('chelsea','')]},{title:'الترتيب الصحيح',items:journeyS.reveal.items});
MINI_MEDIA.egypt={type:'flag',url:flag('eg'),fallback:'مصر',source:'https://github.com/lipis/flag-icons',license:'MIT'};
const cityLineup=[item('portugal','برناردو سيلفا',{position:'RW'}),item('norway','إيرلينغ هالاند',{position:'ST'}),item('belgium','كيفن دي بروين',{position:'AM'}),item('spain','رودري',{position:'DM'}),item('germany','إلكاي غوندوغان',{position:'CM'}),item('england','جون ستونز',{position:'CB'}),item('switzerland','مانويل أكانجي',{position:'CB'}),item('netherlands','ناثان آكي',{position:'LB'}),item('portugal','روبن دياز',{position:'CB'}),item('england','كايل ووكر',{position:'RB'}),item('brazil','إيدرسون',{position:'GK'})];
for(const [key,code,name] of [['norway','no','النرويج'],['england','gb-eng','إنجلترا'],['switzerland','ch','سويسرا'],['netherlands','nl','هولندا']])MINI_MEDIA[key]={type:'flag',url:flag(code),fallback:name,source:'https://github.com/lipis/flag-icons',license:'MIT'};
for(const [key,code,name] of [['austria','at','النمسا'],['croatia','hr','كرواتيا'],['uruguay','uy','الأوروغواي']])MINI_MEDIA[key]={type:'flag',url:flag(code),fallback:name,source:'https://github.com/lipis/flag-icons',license:'MIT'};
const cityPitch=visual('pitch',{formation:'3-4-2-1',items:cityLineup.map(x=>({...x,label:''}))},{title:'مانشستر سيتي — نهائي دوري الأبطال 2023',club:'city',items:cityLineup,season:'2022–23'});
const realLineup=[item('belgium','تيبو كورتوا',{position:'GK'}),item('spain','داني كارفاخال',{position:'RB'}),item('brazil','إيدير ميليتاو',{position:'CB'}),item('austria','دافيد ألابا',{position:'CB'}),item('france','فيرلان ميندي',{position:'LB'}),item('germany','توني كروس',{position:'CM'}),item('brazil','كاسيميرو',{position:'DM'}),item('croatia','لوكا مودريتش',{position:'CM'}),item('uruguay','فيديريكو فالفيردي',{position:'RW'}),item('france','كريم بنزيما',{position:'ST'}),item('brazil','فينيسيوس جونيور',{position:'LW'})];
const realPitch=visual('pitch',{formation:'4-3-3',items:realLineup.map(x=>({...x,label:''}))},{title:'ريال مدريد — نهائي دوري الأبطال 2022',club:'real',items:realLineup,season:'2021–22'});
const argentinaPitch=visual('pitch',{formation:'4-3-3',items:[item('argentina','',{position:'GK'}),item('argentina','',{position:'RB'}),item('argentina','',{position:'CB'}),item('argentina','',{position:'CB'}),item('argentina','',{position:'LB'}),item('argentina','',{position:'CM'}),item('argentina','',{position:'CM'}),item('argentina','',{position:'CM'}),item('argentina','',{position:'RW'}),item('argentina','',{position:'ST'}),item('argentina','',{position:'LW'})]},{title:'منتخب الأرجنتين — نهائي كأس العالم 2022',flag:'argentina',season:'2022'});
const peopleReal=visual('people',{items:['ronaldo','benzema','courtois','ancelotti'].map(media=>item(media,''))},{title:'ريال مدريد',core:'real',items:[item('ronaldo','كريستيانو رونالدو'),item('benzema','كريم بنزيما'),item('courtois','تيبو كورتوا'),item('ancelotti','كارلو أنشيلوتي') ]});
const matchWorld=visual('match',{competition:'كأس العالم',year:'2022',clues:['ملعب لوسيل','نهائي امتد لركلات الترجيح'],audio:'نهائي لا يهدأ؛ تقدم ثم تعادل، وركلات الترجيح تحسم بطل العالم.'},{title:'الأرجنتين × فرنسا',home:'argentina',away:'france',score:'3–3 (4–2 ترجيحًا)',stadium:'لوسيل',date:'18 ديسمبر 2022'});
const matchCity=visual('match',{competition:'الدوري الإنجليزي',year:'2012',clues:['الدقيقة 93:20','الجولة الأخيرة'],audio:'الكرة تعود داخل المنطقة، تسديدة في اللحظة الأخيرة تقلب اللقب كله.'},{title:'مانشستر سيتي × كوينز بارك رينجرز',home:'city',score:'3–2',date:'13 مايو 2012'});
const statsHaaland=visual('stats',{values:[['المباريات','35'],['الأهداف','36'],['الموسم','2022–23']],flag:'norway'},{title:'إيرلينغ هالاند',hero:'haaland',club:'city'});
const statsSalah=visual('stats',{values:[['المباريات','36'],['الأهداف','32'],['الموسم','2017–18']],flag:'egypt'},{title:'محمد صلاح',hero:'salah',club:'liverpool'});
const optionPlayers=visual('options',{items:['messi','benzema','ronaldo','salah'].map(media=>item(media,''))},{title:'ليونيل ميسي',correct:'messi',items:[item('messi','ليونيل ميسي'),item('benzema','كريم بنزيما'),item('ronaldo','كريستيانو رونالدو'),item('salah','محمد صلاح')]});

export const MINI_ROUNDS=[
  make('pj-ronaldo','player-journey','من اللاعب صاحب هذه المحطات؟','كريستيانو رونالدو',RM,journeyR),
  make('pj-salah','player-journey','من اللاعب صاحب هذه المحطات؟','محمد صلاح',LFC,journeyS),
  make('gt-city','guess-the-team','ما الفريق الذي بدأ بهذه الجنسيات في نهائي دوري الأبطال 2023؟','مانشستر سيتي',UCL23,cityPitch,'hard'),
  make('gt-real','guess-the-team','ما النادي صاحب هذه الجنسيات في نهائي دوري الأبطال 2022؟','ريال مدريد',UEFA,realPitch,'medium'),
  make('ic-world','iconic-commentary','استمع للوصف وحدد المباراة.','نهائي كأس العالم 2022: الأرجنتين ضد فرنسا',WC22,matchWorld,'medium',['الأرجنتين وفرنسا','نهائي كأس العالم 2022']),
  make('ic-city','iconic-commentary','استمع للوصف وحدد المباراة.','مانشستر سيتي ضد كوينز بارك رينجرز 2012',PL,matchCity,'medium',['السيتي وكوينز بارك','مانشستر سيتي كوينز بارك']),
  make('wai-messi','who-am-i','اكشف التلميحات: من أنا؟','ليونيل ميسي',WC22,visual('identity',{hints:[['5','الجنسية','argentina'],['4','بطل كأس العالم 2022'],['3','لعب لبرشلونة','barcelona'],['2','لعب لباريس','psg']]},{title:'ليونيل ميسي',hero:'messi',flag:'argentina'}),'easy'),
  make('wai-salah','who-am-i','اكشف التلميحات: من أنا؟','محمد صلاح',LFC,visual('identity',{hints:[['5','الجنسية','egypt'],['4','فاز بدوري الأبطال 2019'],['3','لعب لتشيلسي','chelsea'],['2','نجم ليفربول','liverpool']]},{title:'محمد صلاح',hero:'salah',flag:'egypt'}),'easy'),
  make('con-real','the-connection','ما النادي الذي لعب له الثلاثة ودربه الشخص الرابع؟','ريال مدريد',RM,peopleReal,'hard',['ريال مدريد']),
  make('con-chelsea','the-connection','ما النادي الذي لعب له الثلاثة ودربه الشخص الرابع؟','تشيلسي', 'https://www.chelseafc.com/en/history', visual('people',{items:['salah','debruyne','courtois','mourinho'].map(media=>item(media,''))},{title:'تشيلسي',core:'chelsea',items:[item('salah','محمد صلاح'),item('debruyne','كيفن دي بروين'),item('courtois','تيبو كورتوا'),item('mourinho','جوزيه مورينيو')]}),'hard'),
  make('mj-ancelotti','manager-journey','من المدرب صاحب هذه المحطات؟','كارلو أنشيلوتي',RM,visual('journey',{items:[item('chelsea','',{year:'2009'}),item('psg','',{year:'2011'}),item('real','',{year:'2013'}),item('bayern','',{year:'2016'}),item('real','',{year:'2021'})]},{title:'كارلو أنشيلوتي',hero:'ancelotti'}),'hard'),
  make('mj-mourinho','manager-journey','من المدرب صاحب هذه المحطات؟','جوزيه مورينيو','https://www.uefa.com/uefachampionsleague/history/coaches/93356--jose-mourinho/',visual('journey',{items:[item('chelsea','',{year:'2004'}),item('inter','',{year:'2008'}),item('real','',{year:'2010'}),item('manunited','',{year:'2016'})]},{title:'جوزيه مورينيو',hero:'mourinho'}),'hard'),
  make('mp-rodri','missing-player','من اللاعب الناقص من تشكيلة نهائي دوري الأبطال 2023؟','رودري',UCL23,visual('pitch',{...cityPitch.question,missing:'DM'},{...cityPitch.reveal,title:'رودري هو اللاعب المفقود',hero:'rodri'}),'medium'),
  make('mp-messi','missing-player','من اللاعب الناقص من هجوم الأرجنتين في نهائي 2022؟','ليونيل ميسي',WC22,visual('pitch',{...argentinaPitch.question,missing:'RW'},{...argentinaPitch.reveal,title:'ليونيل ميسي هو اللاعب المفقود',hero:'messi'}),'easy'),
  make('gl-city','guess-the-lineup','لأي فريق تنتمي هذه التشكيلة؟','مانشستر سيتي',UCL23,cityPitch,'medium'),
  make('gl-argentina','guess-the-lineup','لأي منتخب تنتمي هذه التشكيلة؟','الأرجنتين',WC22,argentinaPitch,'easy'),
  make('gm-world','guess-the-match','ما المباراة المقصودة بهذه الأدلة؟','الأرجنتين ضد فرنسا — نهائي كأس العالم 2022',WC22,matchWorld,'medium'),
  make('gm-city','guess-the-match','ما المباراة المقصودة بهذه الأدلة؟','مانشستر سيتي ضد كوينز بارك رينجرز 2012',PL,matchCity,'medium'),
  make('ws-aguero','who-scored','من سجل هدف 93:20 الذي حسم الدوري الإنجليزي 2011–12؟','سيرخيو أغويرو',PL,visual('goal',{minute:'93:20',competition:'الدوري الإنجليزي',scoreBefore:'2–2',club:'city'},{title:'سيرخيو أغويرو',hero:'aguero',score:'3–2'}),'easy'),
  make('ws-iniesta','who-scored','من سجل في الدقيقة 116 من نهائي كأس العالم 2010؟','أندريس إنييستا','https://www.fifa.com/en/tournaments/mens/worldcup/2010south-africa',visual('goal',{minute:'116',competition:'كأس العالم 2010',scoreBefore:'0–0',flag:'spain'},{title:'أندريس إنييستا',hero:'iniesta',score:'1–0'}),'medium'),
  make('pbn-haaland','player-by-numbers','من اللاعب صاحب هذه الأرقام في الدوري الإنجليزي؟','إيرلينغ هالاند',PL,statsHaaland,'easy'),
  make('pbn-salah','player-by-numbers','من اللاعب صاحب هذه الأرقام في الدوري الإنجليزي؟','محمد صلاح',PL,statsSalah,'easy'),
  make('gc-ucl','guess-the-competition','ما البطولة التي فاز بها هؤلاء في السنوات المعروضة؟','دوري أبطال أوروبا',UEFA,visual('journey',{items:[item('real','',{year:'2022'}),item('city','',{year:'2023'}),item('real','',{year:'2024'}),item('psg','',{year:'2025'})]},{title:'دوري أبطال أوروبا'}),'medium'),
  make('gc-world','guess-the-competition','ما البطولة التي فازت بها هذه المنتخبات؟','كأس العالم',WC22,visual('journey',{items:[item('spain','',{year:'2010'}),item('germany','',{year:'2014'}),item('france','',{year:'2018'}),item('argentina','',{year:'2022'})]},{title:'كأس العالم'}),'easy'),
  make('season-city','which-season','في أي موسم حقق مانشستر سيتي الثلاثية؟','موسم 2022–23',UCL23,visual('stats',{club:'city',values:[['الدوري','بطل'],['كأس إنجلترا','بطل'],['دوري الأبطال','بطل']]},{title:'موسم 2022–23'}),'easy'),
  make('season-real','which-season','في أي موسم جمع ريال مدريد الدوري الإسباني ودوري الأبطال؟','موسم 2021–22',RM,visual('stats',{club:'real',values:[['الدوري الإسباني','بطل'],['دوري الأبطال','بطل'],['الهداف','benzema']]},{title:'موسم 2021–22'}),'medium'),
  make('co-ronaldo','career-order','رتب شعارات أندية رونالدو زمنيًا.','مانشستر يونايتد، ريال مدريد، يوفنتوس، مانشستر يونايتد',RM,orderR,'medium'),
  make('co-salah','career-order','رتب هاتين المحطتين لمحمد صلاح.','تشيلسي ثم ليفربول',LFC,orderS,'easy'),
  make('cc-real','common-club','ما النادي المشترك بين اللاعبين؟','ريال مدريد',RM,visual('people',{items:['ronaldo','benzema','courtois','ancelotti'].map(media=>item(media,''))},{title:'ريال مدريد',core:'real'}),'easy'),
  make('cc-chelsea','common-club','ما النادي المشترك بين اللاعبين والمدرب؟','تشيلسي','https://www.chelseafc.com/en/history',visual('people',{items:['salah','debruyne','courtois','mourinho'].map(media=>item(media,''))},{title:'تشيلسي',core:'chelsea'}),'medium'),
  make('tm-ronaldo','teammates','أي لاعب زامل رونالدو في ريال مدريد؟','كريم بنزيما',RM,visual('options',{lead:'ronaldo',items:['benzema','salah','debruyne','haaland'].map(media=>item(media,''))},{title:'كريم بنزيما',correct:'benzema',club:'real'}),'easy'),
  make('tm-salah','teammates','أي لاعب زامل محمد صلاح في تشيلسي؟','كيفن دي بروين','https://www.chelseafc.com/en/history',visual('options',{lead:'salah',items:['debruyne','ronaldo','messi','haaland'].map(media=>item(media,''))},{title:'كيفن دي بروين',correct:'debruyne',club:'chelsea'}),'medium'),
  make('odd-wc','odd-one-out','اختر اللاعب الوحيد الذي لم يلعب لنادي برشلونة.','محمد صلاح','https://www.fcbarcelona.com/en/football/first-team/players',visual('options',{items:['messi','iniesta','neymar','salah'].map(media=>item(media,''))},{title:'محمد صلاح',correct:'salah',reason:'ميسي وإنييستا ونيمار لعبوا لبرشلونة، بينما لم يلعب محمد صلاح للنادي.'}),'easy'),
  make('odd-ucl','odd-one-out','اختر اللاعب الذي لم يفز بدوري أبطال أوروبا.','سيرخيو أغويرو',UEFA,visual('options',{items:['ronaldo','benzema','salah','aguero'].map(media=>item(media,''))},{title:'سيرخيو أغويرو',correct:'aguero',reason:'رونالدو وبنزيما وصلاح فازوا بالبطولة، بينما لم يفز بها أغويرو.'}),'medium'),
  make('gn-argentina','guess-the-nation','ما المنتخب الذي ختم هذا الطريق بالتتويج في 2022؟','الأرجنتين',WC22,visual('path',{stages:[['دور 16','أستراليا','2–1'],['ربع النهائي','هولندا','2–2'],['نصف النهائي','كرواتيا','3–0'],['النهائي','فرنسا','3–3']]},{title:'الأرجنتين',flag:'argentina'}),'medium'),
  make('gn-france','guess-the-nation','ما المنتخب الذي ختم هذا الطريق بالتتويج في 2018؟','فرنسا','https://www.fifa.com/en/tournaments/mens/worldcup/2018russia',visual('path',{stages:[['دور 16','الأرجنتين','4–3'],['ربع النهائي','الأوروغواي','2–0'],['نصف النهائي','بلجيكا','1–0'],['النهائي','كرواتيا','4–2']]},{title:'فرنسا',flag:'france'}),'medium'),
  make('gk-courtois','guess-the-goalkeeper','من حارس ريال مدريد في نهائي دوري الأبطال 2022؟','تيبو كورتوا',UEFA,visual('identity',{club:'real',season:'2021–22',hints:[['4','حافظ على نظافة شباكه في النهائي'],['3','بلجيكي','belgium']]},{title:'تيبو كورتوا',hero:'courtois',flag:'belgium'}),'easy'),
  make('gk-city','guess-the-goalkeeper','من حارس مانشستر سيتي في نهائي دوري الأبطال 2023؟','إيدرسون',UCL23,visual('identity',{club:'city',season:'2022–23',hints:[['4','حقق الثلاثية'],['3','برازيلي','brazil']]},{title:'إيدرسون',flag:'brazil'}),'easy'),
  make('sn-ronaldo','shirt-number','ما رقم رونالدو مع ريال مدريد في موسم 2017–18؟','7',RM,visual('choice',{hero:'ronaldo',club:'real',choices:['7','9','10','11']},{title:'الرقم 7',hero:'ronaldo'}),'easy',['7','٧']),
  make('sn-messi','shirt-number','ما رقم ميسي مع برشلونة في موسم 2014–15؟','10','https://www.fcbarcelona.com/en/football/first-team/players/4974/leo-messi',visual('choice',{hero:'messi',club:'barcelona',choices:['7','9','10','11']},{title:'الرقم 10',hero:'messi'}),'easy',['10','١٠']),
  make('tf-ronaldo','transfer-fee','كم بلغت قيمة انتقال رونالدو من مانشستر يونايتد إلى ريال مدريد في 2009؟','94 مليون يورو',RM,visual('transfer',{from:'manunited',player:'ronaldo',to:'real',choices:['80 مليون €','94 مليون €','110 ملايين €','120 مليون €']},{title:'94 مليون يورو'}),'medium',['94 مليون','94 مليون يورو','٩٤ مليون']),
  make('tf-neymar','transfer-fee','ما قيمة انتقال نيمار من برشلونة إلى باريس في 2017؟','222 مليون يورو','https://www.uefa.com/uefachampionsleague/news/023c-0e97a460294b-7a334f3b090a-1000--neymar-joins-paris-from-barcelona/',visual('transfer',{from:'barcelona',player:'neymar',to:'psg',choices:['180 مليون €','200 مليون €','222 مليون €','250 مليون €']},{title:'222 مليون يورو',hero:'neymar'}),'easy',['222 مليون','222 مليون يورو','٢٢٢ مليون']),
  make('stadium-bernabeu','guess-the-stadium','ما اسم هذا الملعب؟','سانتياغو برنابيو',RM,visual('stadium',{media:'bernabeu'},{title:'سانتياغو برنابيو',club:'real',city:'مدريد'}),'easy'),
  make('stadium-wembley','guess-the-stadium','ما اسم هذا الملعب؟','ويمبلي','https://www.wembleystadium.com/about',visual('stadium',{media:'wembley'},{title:'ويمبلي',city:'لندن'}),'easy'),
  make('gf-world','guess-the-final','حدد طرفي هذا النهائي.','الأرجنتين ضد فرنسا',WC22,matchWorld,'easy',['الأرجنتين وفرنسا','الأرجنتين ضد فرنسا']),
  make('gf-ucl','guess-the-final','حدد طرفي نهائي دوري الأبطال 2023.','مانشستر سيتي ضد إنتر ميلان',UCL23,visual('match',{competition:'دوري أبطال أوروبا',year:'2023',clues:['إسطنبول','انتهى 1–0']},{title:'مانشستر سيتي × إنتر ميلان',home:'city',away:'inter',score:'1–0'}),'easy'),
  make('hl-haaland','higher-or-lower','هل سجل هالاند أعلى أم أقل من 35 هدفًا في الدوري موسم 2022–23؟','أعلى — 36 هدفًا',PL,visual('higher',{hero:'haaland',threshold:35,unit:'هدفًا'},{title:'36 هدفًا',direction:'higher'}),'easy',['أعلى','36']),
  make('hl-salah','higher-or-lower','هل سجل صلاح أعلى أم أقل من 30 هدفًا في الدوري موسم 2017–18؟','أعلى — 32 هدفًا',PL,visual('higher',{hero:'salah',threshold:30,unit:'هدفًا'},{title:'32 هدفًا',direction:'higher'}),'easy',['أعلى','32']),
  make('ww-ucl','who-won','من فاز بنهائي دوري أبطال أوروبا 2023؟','مانشستر سيتي',UCL23,visual('versus',{home:'city',away:'inter',date:'10 يونيو 2023',competition:'دوري أبطال أوروبا'},{title:'مانشستر سيتي',score:'1–0'}),'easy'),
  make('ww-world','who-won','من فاز بنهائي كأس العالم 2022؟','الأرجنتين',WC22,visual('versus',{home:'argentina',away:'france',date:'18 ديسمبر 2022',competition:'كأس العالم'},{title:'الأرجنتين',score:'4–2 بركلات الترجيح'}),'easy'),
  make('fs-real','five-seconds','اذكر لاعبًا برازيليًا لعب لريال مدريد.','مارسيلو أو كاسيميرو أو فينيسيوس جونيور أو رودريغو',RM,visual('timer',{seconds:5,club:'real',flag:'brazil'},{title:'إجابات مقبولة متعددة'}),'mixed',['مارسيلو','كاسيميرو','فينيسيوس','فينيسيوس جونيور','رودريغو']),
  make('fs-ucl','five-seconds','اذكر ناديًا إنجليزيًا فاز بدوري أبطال أوروبا.','ليفربول أو مانشستر يونايتد أو تشيلسي أو مانشستر سيتي أو أستون فيلا أو نوتنغهام فورست',UEFA,visual('timer',{seconds:5,competition:'دوري أبطال أوروبا',flag:'england'},{title:'توجد عدة إجابات صحيحة'}),'mixed',['ليفربول','مانشستر يونايتد','تشيلسي','مانشستر سيتي','أستون فيلا','نوتنغهام فورست']),
  make('bomb-ucl','the-bomb','اذكر بالتناوب لاعبًا فاز بدوري أبطال أوروبا.','أي اسم صحيح موثق',UEFA,visual('bomb',{category:'لاعب فاز بدوري أبطال أوروبا'},{title:'تتحقق الإجابات عند المقدم'}),'mixed',['كريستيانو رونالدو','ليونيل ميسي','محمد صلاح','كريم بنزيما']),
  make('bomb-world','the-bomb','اذكر بالتناوب منتخبًا فاز بكأس العالم.','أي منتخب بطل صحيح',WC22,visual('bomb',{category:'منتخب فاز بكأس العالم'},{title:'تتحقق الإجابات عند المقدم'}),'mixed',['البرازيل','الأرجنتين','فرنسا','إسبانيا','ألمانيا','إيطاليا','إنجلترا','الأوروغواي']),
  make('streak-one','streak','من بطل دوري أبطال أوروبا 2023؟','مانشستر سيتي',UCL23,visual('streak',{multiplier:1,club:'city'},{title:'مانشستر سيتي'}),'easy'),
  make('streak-two','streak','من بطل كأس العالم 2022؟','الأرجنتين',WC22,visual('streak',{multiplier:2,flag:'argentina'},{title:'الأرجنتين'}),'easy'),
  make('qp-ballon','quick-pick','من فاز بالكرة الذهبية 2023؟','ليونيل ميسي','https://www.francefootball.fr/ballon-d-or/',optionPlayers,'easy'),
  make('qp-ucl','quick-pick','من سجل هدف نهائي دوري الأبطال 2023؟','رودري',UCL23,visual('options',{items:['rodri','debruyne','haaland','bernardo'].map(media=>item(media,''))},{title:'رودري',correct:'rodri'}),'easy'),
  make('lm-city','lineup-memory','بعد إخفاء التشكيلة: من كان رأس الحربة؟','إيرلينغ هالاند',UCL23,visual('memory',{seconds:8,pitch:cityPitch.question},{title:'إيرلينغ هالاند',hero:'haaland',answerPosition:'ST'}),'medium'),
  make('lm-argentina','lineup-memory','بعد إخفاء التشكيلة: كم لاعبًا ظهر في التشكيلة؟','11 لاعبًا',WC22,visual('memory',{seconds:8,pitch:argentinaPitch.question},{title:'11 لاعبًا'}),'easy',['11','١١','11 لاعب']),
  make('path-rm','player-path','أكمل الطريق: رونالدو ← ؟ ← ميسي.','أنخيل دي ماريا',RM,visual('path-players',{start:'ronaldo',end:'messi',slots:1},{title:'أنخيل دي ماريا',reason:'زامل رونالدو في ريال مدريد وميسي في منتخب الأرجنتين.'}),'hard',['أنخيل دي ماريا','دي ماريا']),
  make('path-chelsea','player-path','أكمل الطريق: صلاح ← ؟ ← هالاند.','كيفن دي بروين','https://www.chelseafc.com/en/history',visual('path-players',{start:'salah',end:'haaland',slots:1},{title:'كيفن دي بروين',hero:'debruyne',reason:'زامل صلاح في تشيلسي وهالاند في مانشستر سيتي.'}),'hard',['كيفن دي بروين','دي بروين'])
];

export const MINI_CONTENT_VERSION=3;
const hiddenFallback={player:'صورة لاعب',manager:'صورة مدرب',club:'شعار نادٍ',flag:'علم دولة',stadium:'صورة ملعب'};
function mediaIds(value,found=new Set()){
  if(typeof value==='string'&&MINI_MEDIA[value])found.add(value);
  else if(Array.isArray(value))for(const item of value)mediaIds(item,found);
  else if(value&&typeof value==='object')for(const item of Object.values(value))mediaIds(item,found);
  return found;
}
function aliasMedia(value,aliases){
  if(typeof value==='string'&&aliases[value])return aliases[value];
  if(Array.isArray(value))return value.map(item=>aliasMedia(item,aliases));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,aliasMedia(item,aliases)]));
  return value;
}
export function projectMiniRound(round,revealed=false){
  if(!round)return null;
  const visual=revealed?round.visual:{template:round.visual.template,question:round.visual.question},ids=[...mediaIds(visual)],aliases=Object.fromEntries(ids.map((id,index)=>[id,`asset-${index+1}`]));
  const base={gameSlug:round.game_slug,difficulty:round.difficulty,prompt:round.prompt,visual:aliasMedia(visual,aliases)};
  const media=Object.fromEntries(ids.map(id=>{const item=MINI_MEDIA[id],key=aliases[id],cached={...item,url:`/api/media/${id}`};return [key,revealed?cached:{type:item.type,url:cached.url,fallback:hiddenFallback[item.type]||'عنصر كروي'}];}));
  return {round:revealed?{...base,solution:round.solution,explanation:round.explanation,source:round.source,accepted:round.accepted}:base,media};
}
export function publicMiniRound(round,revealed=false){return projectMiniRound(round,revealed)?.round||null;}
