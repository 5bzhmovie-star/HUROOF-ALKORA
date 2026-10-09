import type { LucideIcon } from 'lucide-react';
import { Route, Flag, Mic, User, Link2, Briefcase, UserMinus, List, Swords, Target, BarChart3, Trophy, Calendar, Shuffle, Users, Handshake, XCircle, Goal, Shield, Shirt, DollarSign, Landmark, Medal, ArrowUpDown, Bomb, Flame, MousePointer, Brain, Dices } from 'lucide-react';

export type MiniGame = { slug:string; title:string; english:string; description:string; difficulty:'سهل'|'متوسط'|'صعب'|'متنوع'; duration:string; icon:LucideIcon; visual:'journey'|'pitch'|'match'|'identity'|'people'|'card'|'arcade' };

export const miniGames:MiniGame[] = [
  {slug:'player-journey',title:'مسيرة اللاعب',english:'Player Journey',description:'اكتشف اللاعب من شعارات الأندية وتسلسل السنوات.',difficulty:'متوسط',duration:'٣–٥ دقائق',icon:Route,visual:'journey'},
  {slug:'guess-the-team',title:'اعرف الفريق من الجنسيات',english:'Guess The Team',description:'أعلام اللاعبين موزعة على مراكز تشكيلة حقيقية.',difficulty:'صعب',duration:'٣ دقائق',icon:Flag,visual:'pitch'},
  {slug:'iconic-commentary',title:'اعرف المباراة من التعليق',english:'Iconic Commentary',description:'تعليق شهير يقودكم إلى المباراة المقصودة.',difficulty:'متوسط',duration:'دقيقتان',icon:Mic,visual:'match'},
  {slug:'who-am-i',title:'من أنا؟',english:'Who Am I?',description:'تلميحات تتدرج من خمس نقاط حتى كشف اللاعب.',difficulty:'متنوع',duration:'٣ دقائق',icon:User,visual:'identity'},
  {slug:'the-connection',title:'وش الرابط؟',english:'The Connection',description:'أربع صور ورابط كروي واحد يجمعها.',difficulty:'صعب',duration:'٣ دقائق',icon:Link2,visual:'people'},
  {slug:'manager-journey',title:'مسيرة المدرب',english:'Manager Journey',description:'شعارات الأندية والمنتخبات التي دربها.',difficulty:'صعب',duration:'٣–٥ دقائق',icon:Briefcase,visual:'journey'},
  {slug:'missing-player',title:'اللاعب المفقود',english:'Missing Player',description:'تشكيلة حقيقية ينقصها لاعب واحد.',difficulty:'متوسط',duration:'٣ دقائق',icon:UserMinus,visual:'pitch'},
  {slug:'guess-the-lineup',title:'اعرف التشكيلة',english:'Guess The Lineup',description:'صور تشكيلة كاملة بلا اسم الفريق أو شعاره.',difficulty:'صعب',duration:'٣ دقائق',icon:List,visual:'pitch'},
  {slug:'guess-the-match',title:'اعرف المباراة',english:'Guess The Match',description:'أدلة بصرية تظهر تدريجيًا حتى تتضح المباراة.',difficulty:'متنوع',duration:'٣ دقائق',icon:Swords,visual:'match'},
  {slug:'who-scored',title:'صاحب الهدف',english:'Who Scored?',description:'وقت الهدف والبطولة والنتيجة قبل التسجيل.',difficulty:'متوسط',duration:'دقيقتان',icon:Target,visual:'match'},
  {slug:'player-by-numbers',title:'اعرف اللاعب من أرقامه',english:'Player By Numbers',description:'بطاقة إحصائية مرتبطة بموسم محدد.',difficulty:'متوسط',duration:'دقيقتان',icon:BarChart3,visual:'card'},
  {slug:'guess-the-competition',title:'اعرف البطولة',english:'Guess The Competition',description:'سلسلة أبطال عبر السنوات تكشف المسابقة.',difficulty:'متوسط',duration:'دقيقتان',icon:Trophy,visual:'journey'},
  {slug:'which-season',title:'أي موسم؟',english:'Which Season?',description:'انتقال وبطل وهداف ومدرب من موسم واحد.',difficulty:'صعب',duration:'٣ دقائق',icon:Calendar,visual:'card'},
  {slug:'career-order',title:'رتب المسيرة',english:'Career Order',description:'رتّب شعارات الأندية في مسارها الزمني الصحيح.',difficulty:'متوسط',duration:'٣ دقائق',icon:Shuffle,visual:'journey'},
  {slug:'common-club',title:'النادي المشترك',english:'Common Club',description:'أربع صور للاعبين اجتمعوا في نادٍ واحد.',difficulty:'متوسط',duration:'دقيقتان',icon:Users,visual:'people'},
  {slug:'teammates',title:'لعب مع مين؟',english:'Teammates',description:'اختر اللاعب الذي زامل النجم في الفترة الصحيحة.',difficulty:'متوسط',duration:'دقيقتان',icon:Handshake,visual:'people'},
  {slug:'odd-one-out',title:'الدخيل',english:'Odd One Out',description:'ثلاثة يجمعهم رابط والرابع خارج المجموعة.',difficulty:'متوسط',duration:'دقيقتان',icon:XCircle,visual:'people'},
  {slug:'guess-the-nation',title:'اعرف المنتخب',english:'Guess The Nation',description:'طريق منتخب مجهول في بطولة كبرى.',difficulty:'صعب',duration:'٣ دقائق',icon:Flag,visual:'journey'},
  {slug:'guess-the-goalkeeper',title:'من الحارس؟',english:'Guess The Goalkeeper',description:'الموسم والشباك النظيفة والبطولات تكشف الحارس.',difficulty:'متوسط',duration:'دقيقتان',icon:Goal,visual:'identity'},
  {slug:'shirt-number',title:'رقم القميص',english:'Shirt Number',description:'صورة اللاعب والنادي والموسم مع أربعة أرقام.',difficulty:'سهل',duration:'دقيقة',icon:Shirt,visual:'card'},
  {slug:'transfer-fee',title:'سعر الانتقال',english:'Transfer Fee',description:'انتقال بصري بين ناديين مع خيارات للسعر.',difficulty:'متوسط',duration:'دقيقة',icon:DollarSign,visual:'card'},
  {slug:'guess-the-stadium',title:'اعرف الملعب',english:'Guess The Stadium',description:'الصورة نفسها هي السؤال؛ كاملة أو مقصوصة.',difficulty:'متنوع',duration:'دقيقتان',icon:Landmark,visual:'identity'},
  {slug:'guess-the-final',title:'اعرف النهائي',english:'Guess The Final',description:'الكأس والسنة والملعب والنتيجة دون طرفي النهائي.',difficulty:'صعب',duration:'٣ دقائق',icon:Medal,visual:'match'},
  {slug:'higher-or-lower',title:'أعلى أو أقل',english:'Higher or Lower',description:'مقارنة خاطفة ثم عداد يكشف الرقم الحقيقي.',difficulty:'سهل',duration:'دقيقة',icon:ArrowUpDown,visual:'arcade'},
  {slug:'who-won',title:'من فاز؟',english:'Who Won?',description:'شعاران وتاريخ وبطولة، والنتيجة مخفية.',difficulty:'سهل',duration:'دقيقة',icon:Shield,visual:'match'},
  {slug:'five-seconds',title:'خمس ثواني',english:'Five Seconds',description:'تحدٍ مفتوح سريع وأكثر من إجابة صحيحة.',difficulty:'متنوع',duration:'٥ ثوانٍ',icon:Goal,visual:'arcade'},
  {slug:'the-bomb',title:'القنبلة',english:'The Bomb',description:'إجابات متبادلة ومؤقت مخفي حتى الانفجار.',difficulty:'متنوع',duration:'٣ دقائق',icon:Bomb,visual:'arcade'},
  {slug:'streak',title:'السلسلة',english:'Streak',description:'خاطر لمضاعفة النقاط أو ثبّتها قبل الخطأ.',difficulty:'متنوع',duration:'٣ دقائق',icon:Flame,visual:'arcade'},
  {slug:'quick-pick',title:'الاختيار السريع',english:'Quick Pick',description:'أربع بطاقات بصرية والأسرع يحسمها.',difficulty:'سهل',duration:'دقيقة',icon:MousePointer,visual:'people'},
  {slug:'lineup-memory',title:'ذاكرة التشكيلة',english:'Lineup Memory',description:'شاهد ١١ لاعبًا ثم أجب بعد اختفائهم.',difficulty:'صعب',duration:'دقيقتان',icon:Brain,visual:'pitch'},
  {slug:'player-path',title:'طريق اللاعب',english:'Player Path',description:'ابنِ مسارًا من زملاء لعبوا معًا فعلًا.',difficulty:'صعب',duration:'٥ دقائق',icon:Dices,visual:'people'},
];

export const mediaCredits = {
  ronaldo:{src:'/api/media/ronaldo',name:'كريستيانو رونالدو',credit:'Anna Nassy / soccer.ru',license:'CC BY-SA 3.0',source:'https://commons.wikimedia.org/wiki/File:Cristiano_Ronaldo_2018.jpg'},
  messi:{src:'/api/media/messi',name:'ليونيل ميسي',credit:'Hossein Zohrevand / Tasnim News Agency',license:'CC BY 4.0',source:'https://commons.wikimedia.org/wiki/File:Lionel-Messi-Argentina-2022-FIFA-World-Cup_(cropped).jpg'},
  bernabeu:{src:'/api/media/bernabeu',name:'ملعب سانتياغو برنابيو',credit:'uggboy',license:'CC BY 2.0',source:'https://commons.wikimedia.org/wiki/File:The_Santiago_Bernabeu_Stadium_-_U-g-g-B-o-y.jpg'},
};
