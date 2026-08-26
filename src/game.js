"use strict";
const fmt = n => Math.round(n).toLocaleString("en-US");
let RNG = Math.random;                       // 每日挑戰時會換成種子化亂數
const gauss = () => (RNG()+RNG()+RNG()+RNG()-2)/2;
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(RNG()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }

const ROUTES = {
  etf:        {name:"ETF",     feat:"穩定・成長慢"},
  realestate: {name:"房地產",  feat:"高槓桿・高風險"},
  business:   {name:"創業",    feat:"爆發力最高・容易破產"},
  crypto:     {name:"加密貨幣",feat:"超高波動"},
};

/* ===== 職業（不同投資屬性） ===== */
/* ===== 職業（Monte Carlo 平衡後，v1.1） ===== */
const PROFS=[
 {id:"fnb",name:"👨‍🍳 餐飲店員",salary:32000,cash:25000,living:{"房租":10000,"生活費":8000,"交通":3000,"娛樂雜支":3000},
  routeBonus:{business:0.002},costCut:{business:0.1},diff:"困難",
  perk:"時間換錢的起點。突破口在技能進修 → 微型副業，先讓薪水跳一級再配高股息。預期通關率 25%，但每一分都是你自己賺來的。"},
 {id:"clerk",name:"👨‍💼 行政基層",salary:38000,cash:35000,living:{"房租":12000,"生活費":9000,"交通":3500,"娛樂雜支":3500},
  routeBonus:{etf:0.0008},costCut:{},diff:"普通",
  perk:"穩健型起點。適合定期定額 ETF 複利慢滾，避開高波動路線。管住娛樂支出，28 回合內有 41% 機率自由。"},
 {id:"gig",name:"🚚 外送自僱",salary:52000,cash:45000,living:{"房租":12000,"生活費":10000,"交通":6000,"娛樂雜支":6000},
  routeBonus:{business:0.0015},costCut:{},diff:"普通",
  perk:"時間彈性最大。積極配置微型副業與現金流資產，預期通關率高達 84%。但交通成本高——別讓油錢吃掉你的本金。"},
 {id:"engineer",name:"👨‍💻 軟體工程師",salary:85000,cash:90000,living:{"房租":18000,"生活費":16000,"交通":5000,"娛樂雜支":16000},
  routeBonus:{crypto:0.0015,business:0.001},costCut:{},diff:"普通",
  perk:"高薪，但高消費是陷阱。避免豪車分期與精緻窮，股房雙核配置。預期通關率 99.9%——但不代表你能無腦贏：負債陷阱破產率仍達 59%。"},
 {id:"doctor",name:"👨‍⚕️ 執業醫師",salary:160000,cash:160000,living:{"房租":32000,"生活費":28000,"交通":12000,"娛樂雜支":48000},
  routeBonus:{realestate:0.0005},costCut:{},diff:"困難",
  perk:"精緻窮代表：收入頂尖，負債也頂尖。豪車、豪宅、名錶把你困住。槓桿房產是出路——但先拒絕誘惑。盲目消費破產率高達 71%。"},
];

let AID=1;
function freshState(profId){
  AID=1;
  const p=PROFS.find(x=>x.id===profId)||PROFS[0];
  return {
    month:1, cash:p.cash, salary:p.salary,
    living:Object.assign({},p.living),
    assets:[], liabilities:[],
    ownsHome:false, loanCount:0, raisedTimes:0, over:false, tempCut:0,
    driftBias:0, volBias:0,
    prof:{id:p.id,name:p.name,routeBonus:p.routeBonus,costCut:p.costCut},
    stats:{trapsSeen:0,trapsTaken:0,spentAssets:0,spentConsumption:0,trades:0,realizedPL:0,crashes:0,booms:0,activeEarned:0,passiveEarned:0,peakNW:p.cash},
  };
}
let chosenProf="office";
let S=freshState(chosenProf);
let curCard=null, curResolved=true;
let cardBlob=null, cardURL=null, lastWin=true;
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
    this.moveTo(x+r,y); this.arcTo(x+w,y,x+w,y+h,r); this.arcTo(x+w,y+h,x,y+h,r);
    this.arcTo(x,y+h,x,y,r); this.arcTo(x,y,x+w,y,r); this.closePath(); return this; };
}

/* derived */
const livingTotal=()=>Object.values(S.living).reduce((a,b)=>a+b,0);
const liabTotal=()=>S.liabilities.reduce((a,b)=>a+b.payment,0);
const passive=()=>S.assets.reduce((a,b)=>a+(b.income||0),0);
const expenses=()=>livingTotal()+liabTotal();
const income=()=>S.salary+passive();
const surplus=()=>income()-expenses();
const equity=a=>a.value-(a.loan||0);
const netWorth=()=>S.cash+S.assets.reduce((s,a)=>s+equity(a),0);
function payFor(c){ const base=c.buy.down||c.buy.cost; const cut=(S.prof.costCut&&S.prof.costCut[c.route])||0; return Math.round(base*(1-cut)); }

/* ===== 30 張投資機會卡（四路線） ===== */
const OPPS=[
 // ---- ETF 路線：穩定、成長慢 ----
 {id:"e1",route:"etf",ttl:"0050 大盤 ETF（累計）",desc:"市值型大盤，長期向上、波動中等。增值靠賣出實現。",
  buy:{cost:100000,mk:{label:"累計",income:0,value:100000,basis:100000,drift:0.0075,vol:0.034,acc:true}},
  coach:"累計型不配息，<b>不算被動現金流、不會推進自由進度</b>。它養大淨資產，得在高點止盈換成會配息的資產。"},
 {id:"e2",route:"etf",ttl:"0050 定期定額（小額）",desc:"門檻低，先上車。複利需要時間。",
  buy:{cost:30000,mk:{label:"累計",income:0,value:30000,basis:30000,drift:0.0075,vol:0.036,acc:true}}},
 {id:"e3",route:"etf",ttl:"0056 高股息 ETF（配息）",desc:"每月配息進你口袋，這種現金流才幫你跨過自由線。價格成長慢。",
  buy:{cost:100000,mk:{label:"配息",income:520,value:100000,basis:100000,drift:0.0022,vol:0.018}},
  coach:"<b>第一個會配息的資產。</b>方向對了：它每月把現金放進口袋，直接推進自由進度條。"},
 {id:"e4",route:"etf",ttl:"00878 高股息（配息）",desc:"季配改月領的代表，殖利率穩。",
  buy:{cost:60000,mk:{label:"配息",income:320,value:60000,basis:60000,drift:0.002,vol:0.017}}},
 {id:"e5",route:"etf",ttl:"美債 ETF（累計）",desc:"利率敏感、波動低，淨資產的壓艙石。不配息。",
  buy:{cost:60000,mk:{label:"累計",income:0,value:60000,basis:60000,drift:0.0035,vol:0.011,acc:true}}},
 {id:"e6",route:"etf",ttl:"投資級公司債（配息）",desc:"穩定領息，比股票溫和。",
  buy:{cost:60000,mk:{label:"配息",income:260,value:60000,basis:60000,drift:0.0012,vol:0.012}}},
 {id:"e7",route:"etf",ttl:"REITs 不動產信託（配息）",desc:"用股票的方式買房地產收租，門檻低、可分散。隨房市波動。",
  buy:{cost:80000,mk:{label:"配息",income:430,value:80000,basis:80000,drift:0.0025,vol:0.02,reroute:"realestate"}},
  coach:"REITs 讓你不用幾百萬頭期就能當包租公，但它跟著<b>房市</b>漲跌，不是無風險。"},
 {id:"e8",route:"etf",ttl:"0050 正2 槓桿 ETF（累計）",desc:"兩倍槓桿，漲很爽、跌更痛，長期有耗損。",
  buy:{cost:100000,mk:{label:"累計",income:0,value:100000,basis:100000,drift:0.013,vol:0.07,acc:true}},
  buy:{down:200000,mortgage:0,liabName:"預售屋付款",mk:{label:"房產",income:0,value:1500000,loan:1300000,basis:200000,drift:0.005,vol:0.022}},
  coach:"預售屋不生租金、不算現金流。頭期 20 萬撐 150 萬＝<b>7.5 倍槓桿</b>，房市一修正，你的淨值可能直接歸零。"},
 {id:"r6",route:"realestate",ttl:"土地",desc:"不生租金，純粹賭增值。流動性差、波動大，但翻倍也最猛。",leverage:true,
  buy:{down:300000,mortgage:0,liabName:"土地貸款",mk:{label:"房產",income:0,value:1500000,loan:1200000,basis:300000,drift:0.0045,vol:0.024}},
  coach:"土地是房地產裡最硬的賭注：<b>零現金流</b>、全壓增值。對了翻好幾倍，錯了套牢好幾年。"},
 // ---- 創業路線：爆發力最高、容易破產 ----
 {id:"b1",route:"business",ttl:"電商品牌",desc:"自有品牌、團隊代營運。淨利不錯，但競爭與流量風險高。",
  buy:{cost:300000,mk:{label:"生意",income:5500,value:300000,basis:300000,drift:0.002,vol:0.045}}},
 {id:"b2",route:"business",ttl:"蝦皮賣場（小本）",desc:"低成本起步，毛利薄、靠量。",
  buy:{cost:120000,mk:{label:"生意",income:2200,value:120000,basis:120000,drift:0.0015,vol:0.05}}},
 {id:"b3",route:"business",ttl:"SaaS 訂閱產品",desc:"月費訂閱、邊際成本低，成長性最強。也最燒、最易死。",
  buy:{cost:400000,mk:{label:"生意",income:9000,value:400000,basis:400000,drift:0.006,vol:0.05}},
  coach:"SaaS 的爆發力來自<b>複利式訂閱成長</b>，但留不住用戶（churn）就是慢性失血。高報酬配高風險。"},
 {id:"b4",route:"business",ttl:"SaaS 早期（pre-seed）",desc:"還在找 PMF，幾乎全賭。要嘛十倍、要嘛歸零。",
  buy:{cost:150000,mk:{label:"生意",income:1500,value:150000,basis:150000,drift:0.012,vol:0.075}},
  coach:"早期新創就是<b>選擇權</b>：大部分歸零，少數扛起整個報酬。別押超過你能輸的。"},
 {id:"b6",route:"business",ttl:"手搖飲加盟",desc:"請店長顧店、你收淨利。展店爆發、踩雷也快。",
  buy:{cost:500000,mk:{label:"生意",income:6800,value:500000,basis:500000,drift:0.0015,vol:0.03}}},
 {id:"b7",route:"business",ttl:"餐酒館",desc:"翻桌率好就賺，食安或地點一錯就燒錢。",
  buy:{cost:600000,mk:{label:"生意",income:7500,value:600000,basis:600000,drift:0.001,vol:0.045}}},
 {id:"b8",route:"business",ttl:"自媒體／內容品牌",desc:"低成本、靠流量變現，極度看運氣與演算法。",
  buy:{cost:60000,mk:{label:"生意",income:1800,value:60000,basis:60000,drift:0.003,vol:0.055}}},
 {id:"b9",route:"business",ttl:"早餐店",desc:"小本起家、現金流穩，但起早貪黑、毛利薄。",
  buy:{cost:150000,mk:{label:"餐飲",income:3000,value:150000,basis:150000,drift:0.0015,vol:0.032}}},
 {id:"b10",route:"business",ttl:"便當店",desc:"客源穩定，但食材成本與人力是命門。",
  buy:{cost:250000,mk:{label:"餐飲",income:4200,value:250000,basis:250000,drift:0.0015,vol:0.035}}},
 // ---- 加密貨幣路線：超高波動 ----
 {id:"c1",route:"crypto",ttl:"比特幣 BTC",desc:"加密龍頭，波動仍遠大於股票。不配息，純賭增值。",
  buy:{cost:80000,mk:{label:"幣",income:0,value:80000,basis:80000,drift:0.01,vol:0.12,acc:true}},
  coach:"加密是<b>超高波動</b>資產：可能讓你翻倍，也可能腰斬。部位控制比進場點更重要。"},
 {id:"c2",route:"crypto",ttl:"以太幣 ETH",desc:"第二大幣，波動更猛。",
  buy:{cost:60000,mk:{label:"幣",income:0,value:60000,basis:60000,drift:0.011,vol:0.14,acc:true}}},
 {id:"c3",route:"crypto",ttl:"主流幣定投（小額）",desc:"小額分批進場，降低單次風險。",
  buy:{cost:30000,mk:{label:"幣",income:0,value:30000,basis:30000,drift:0.009,vol:0.11,acc:true}}},
 {id:"c4",route:"crypto",ttl:"迷因幣",desc:"純情緒驅動，可能十倍、也可能一夜歸零。",
  buy:{cost:20000,mk:{label:"幣",income:0,value:20000,basis:20000,drift:0.0,vol:0.26,acc:true}},
  coach:"迷因幣不是投資、是賭場籌碼。<b>只放你輸得起的錢</b>，別把它當資產配置。"},
 {id:"c5",route:"crypto",ttl:"NFT",desc:"流動性差、多數歸零，少數爆紅。",
  buy:{cost:40000,mk:{label:"幣",income:0,value:40000,basis:40000,drift:-0.002,vol:0.22,acc:true}}},
 {id:"c6",route:"crypto",ttl:"穩定幣質押生息（配息）",desc:"看起來像定存的鏈上收益。但平台可能跑路。",
  buy:{cost:100000,mk:{label:"幣息",income:900,value:100000,basis:100000,drift:0.0,vol:0.03}},
  coach:"高於市場的「穩定」收益通常藏著對手方風險——平台一倒，本金跟著沒。便宜沒好貨。"},
 {id:"r7",route:"realestate",ttl:"透天厝（整棟出租）",desc:"整棟收租、規模最大，槓桿與報酬都更猛，門檻也最高。",leverage:true,
  buy:{down:450000,mortgage:16000,liabName:"透天房貸",mk:{label:"房產",income:22000,value:1800000,loan:1350000,basis:450000,drift:0.0035,vol:0.015}}},
 {id:"c7",route:"crypto",ttl:"新公鏈代幣（ICO）",desc:"早期項目代幣，題材熱時十倍、退潮時歸零。",
  buy:{cost:25000,mk:{label:"幣",income:0,value:25000,basis:25000,drift:0.005,vol:0.21,acc:true}},
  coach:"ICO／新代幣是加密裡最投機的一角，大多數最後歸零。當賭注，不要當資產配置。"},
  // ===== 新增：Section 4 四張資產卡 =====
  {id:"new_etf_div",route:"etf",ttl:"高股息指數 ETF 組合",desc:"一籃高股息 ETF 組合，穩定月月配息，低門檻入場。最適合薪水族的第一步。",
   buy:{cost:20000,mk:{label:"配息",income:900,value:20000,basis:20000,drift:0.002,vol:0.016}},
   coach:"<b>第一桶現金流。</b>20,000 換來每月 900——年化 5.4%。它替你工作，而你的薪水是你自己工作。"},
  {id:"new_side_hustle",route:"business",ttl:"微型無人副業",desc:"數位產品、自動化流程、無人機台——一次建立，持續收租。時間成本低，現金流穩。",
   buy:{cost:50000,mk:{label:"生意",income:3500,value:50000,basis:50000,drift:0.003,vol:0.04}},
   coach:"副業的精髓：<b>建立一次，重複收益。</b>3,500/月和你其他資產一起滾，會是最有力的複利引擎。"},
  {id:"new_realestate",route:"realestate",ttl:"收租小套房（急售）",desc:"屋主急售、低於市價入手。小套房出租，租金扣貸款後還有正現金流。門檻比大套房低。",leverage:true,
   buy:{down:120000,mortgage:5800,liabName:"小套房房貸",mk:{label:"房產",income:8500,value:600000,loan:480000,basis:120000,drift:0.004,vol:0.014}},
   coach:"毛租金 8,500 扣房貸 5,800，<b>淨現金流 +2,700</b>。5 倍槓桿讓頭期款吃到整棟增值——但房市修正時也是 5 倍往下。"},
  {id:"new_skill_upgrade",route:"etf",ttl:"專業技能進修（薪資加速）",desc:"花時間與金錢提升核心技能——轉職、考照、進修課程。不配息，但讓你的薪水跳一級。",
   buy:{cost:15000,mk:{label:"技能",income:0,value:15000,basis:15000,drift:0,vol:0,acc:true}},
   skillSalaryBoost:12000,
   coach:"<b>薪資是你最大的資產，技能決定薪資的天花板。</b>進修 15,000 換來每月多 12,000——9 週回本，然後每月都在賺。"},
];

/* ===== 誘惑卡（負債偽裝成資產） ===== */
const TRAPS=[
 {id:"car",trap:true,kind:"⚠ 誘惑",ttl:"夢想新車（48 期分期）",desc:"開出去超有面子。每月只要 16,000，輕鬆負擔——對吧？",
  payment:16000,liab:"車貸",coach:"車子<b>不帶來任何收入</b>，只每月把 16,000 拿走、還持續貶值。現金流上它是<b>負債</b>。"},
 {id:"home",trap:true,home:true,kind:"⚠ 重大決定",ttl:"換一間夢想自住屋",desc:"終於不用租房！房貸 22,000 取代房租 14,000。「買房是最好的投資」，大家都這麼說。",
  down:600000,newRent:22000,liab:"自住房貸",coach:"自住房每月把錢<b>拿走</b>（多噴 8,000、頭期 60 萬卡死）。<b>它是負債；能收租金的才是資產。</b>"},
 {id:"doodad",trap:true,doodad:true,kind:"⚠ 衝動",ttl:"最新旗艦手機＋名牌包",desc:"限量配色，犒賞辛苦的自己。現金一次扣。",
  cashHit:45000,coach:"Kiyosaki 叫這些『doodads』——小消費把存款吃光，讓你永遠湊不出買資產的本金。"},
 {id:"raise",trap:true,raise:true,kind:"看似好消息",ttl:"恭喜你！升職加薪",desc:"薪水每月多 12,000！你值得對自己好：生活品質升級。",
  salaryUp:12000,livingUp:{"生活費":4000,"娛樂雜支":3000},coach:"加薪 12,000、支出卻漲 7,000——<b>老鼠賽跑</b>：收入一漲支出就追上。富人用資產的收入買奢侈品，不是用薪水。"},
];

/* ===== 100 張事件卡（自動結算） =====
   欄位：t 標題, d 描述, 任一效果：cash / bonus(幾個月薪水) / sal / exp{key:delta}
   / mult{route:倍數} / cut('rent' 或數字), stat('crashes'|'booms'), c 教練(可省) */
const EV=[
 // --- 生活 / 個人 ---
 {t:"年終獎金入帳",d:"公司發了一個月薪水的年終。",bonus:1},
 {t:"季度績效獎金",d:"表現不錯，半個月薪水入袋。",bonus:0.5},
 {t:"接了個外快",d:"假日接案賺了一筆。",cash:25000},
 {t:"發票中獎",d:"小確幸。",cash:1000},
 {t:"統一發票特別獎",d:"運氣爆棚！",cash:200000,c:"天上掉下來的錢，是拿去買資產，還是又變成 doodad？"},
 {t:"加班費",d:"這個月爆肝換來的。",cash:8000},
 {t:"長輩贈與",d:"家人給了一筆。",cash:120000},
 {t:"轉職加薪",d:"跳槽談到更好的待遇。",sal:6000},
 {t:"被降薪",d:"公司營運不佳，全體減薪。",sal:-8000,c:"主動收入從來不保險——這就是為什麼要建立被動現金流。"},
 {t:"留職停薪",d:"被迫休無薪假一個月。",cash:-48000,c:"薪水一斷，沒有資產的人立刻見底。"},
 {t:"結婚",d:"人生大事，喜事但花錢。",cash:-150000},
 {t:"迎接新生兒",d:"恭喜！但每月多一筆育兒開銷。",exp:{"育兒費":8000}},
 {t:"父母醫療費",d:"家人住院，自付額不少。",cash:-60000,c:"沒有緊急預備金，一個意外就打亂全盤。"},
 {t:"車禍修車",d:"小擦撞，荷包失血。",cash:-25000},
 {t:"手機摔壞",d:"螢幕全碎，只能換新。",cash:-18000},
 {t:"寵物醫療",d:"毛小孩生病了。",cash:-12000},
 {t:"健康檢查紅字",d:"得做進一步檢查與調理。",cash:-15000},
 {t:"搬家",d:"押金、搬運、添購，一次噴掉。",cash:-20000},
 {t:"朋友借錢不還",d:"借出去的錢回不來了。",cash:-30000,c:"理財第一課之外的一課：別借超過你願意送出去的金額。"},
 {t:"撿到錢包歸還",d:"失主給了謝禮。",cash:3000},
 {t:"中了小樂透",d:"運氣不錯。",cash:50000},
 {t:"比賽獲獎",d:"參賽拿了獎金。",cash:30000},
 {t:"退稅",d:"報稅退了一筆回來。",cash:12000},
 {t:"補繳稅款",d:"算錯了，要補稅。",cash:-18000},
 {t:"投資詐騙",d:"被「保證高報酬」的話術騙了。",cash:-40000,c:"詐騙專挑想快速致富的人。記住：保證高報酬本身就是最大的警訊。"},
 {t:"信用卡被盜刷",d:"處理後仍有部分損失。",cash:-9000},
 {t:"訂閱費黑洞",d:"一堆忘了取消的訂閱默默扣款。",exp:{"娛樂雜支":900},c:"小額月扣最會偷錢——定期檢查你的『doodad 訂閱』。"},
 {t:"換季血拼",d:"忍不住又買了一波。",cash:-15000},
 {t:"旅遊基金",d:"出國玩了一趟，回憶無價、錢有價。",cash:-35000},
 {t:"考取證照",d:"進修花錢，但有望加薪。",cash:-12000,sal:2000},
 {t:"通勤改開車",d:"油錢、停車費讓交通支出上升。",exp:{"交通":1500}},
 {t:"租屋處漲租",d:"房東調漲房租。",exp:{"房租":2000},c:"當房客，你的居住成本由別人決定；當房東，那是別人付給你的現金流。"},
 {t:"健保費調漲",d:"政策調整，每月多扣一點。",exp:{"生活費":600}},
 {t:"加薪後生活升級",d:"不知不覺把生活水準墊高了。",exp:{"娛樂雜支":1500},c:"生活方式膨脹（lifestyle creep）：最安靜的財富殺手。"},
 {t:"戒掉一個壞習慣",d:"省下一筆固定開銷。",exp:{"娛樂雜支":-1200}},
 {t:"自己下廚",d:"開始帶便當，伙食費下降。",exp:{"生活費":-1500}},
 {t:"換到便宜租屋",d:"搬到 CP 值更高的地方。",exp:{"房租":-2500}},
 {t:"兼差收入",d:"晚上接了個固定兼職。",cash:18000},
 {t:"年資調薪",d:"年度例行小調薪。",sal:1500},
 {t:"公司分紅",d:"年度獲利分紅。",cash:40000},
 // --- 總體經濟 / 政策 ---
 {t:"央行升息",d:"利率走高，股債與房市同步承壓。",mult:{etf:0.96,realestate:0.95},c:"升息抬高借錢成本，對高槓桿的房地產殺傷最大。"},
 {t:"央行降息",d:"資金成本下降，風險性資產受惠。",mult:{etf:1.06,realestate:1.05,crypto:1.1},stat:"booms"},
 {t:"通貨膨脹升溫",d:"什麼都變貴，生活費永久上漲。",exp:{"生活費":1800},c:"通膨侵蝕現金；資產（租金、生意）通常能跟著漲價，現金存款只會貶值。"},
 {t:"經濟衰退",d:"景氣急凍，各類資產一起下跌。",mult:{etf:0.9,business:0.85,crypto:0.7,realestate:0.93},stat:"crashes",c:"系統性風險：壞起來大家一起跌。這時才看得出『分散』與『現金流』的價值。"},
 {t:"景氣強勁復甦",d:"擴張期來臨，風險資產普漲。",mult:{etf:1.08,business:1.15,crypto:1.2},stat:"booms"},
 {t:"匯率劇烈波動",d:"新台幣大幅波動，影響進出口與資產。",mult:{etf:0.98,crypto:0.95}},
 {t:"政府發消費券",d:"短期刺激內需，零售與餐飲受惠。",mult:{business:1.06},cash:6000},
 {t:"缺工潮",d:"勞動力短缺，薪資普遍上調。",sal:3000},
 // --- ETF / 股市 ---
 {t:"大盤多頭",d:"資金行情帶動股市上揚。",mult:{etf:1.12},stat:"booms",c:"漲的時候人人是天才。累計型的帳面獲利<b>賣出才算數</b>。"},
 {t:"指數創新高",d:"市場樂觀，ETF 普遍走高。",mult:{etf:1.08},stat:"booms"},
 {t:"股市修正",d:"獲利了結賣壓，回檔一波。",mult:{etf:0.9},stat:"crashes",c:"有設止損的早就出場了。沒設的：認賠，還是相信它會回來？"},
 {t:"全球股災",d:"系統性恐慌，股票型重挫。",mult:{etf:0.82},stat:"crashes"},
 {t:"配息旺季",d:"持有的配息 ETF 多領一次。",cash:3000},
 {t:"債券殖利率彈升",d:"債券價格走低。",mult:{etf:0.97}},
 {t:"科技股財報亮眼",d:"權值股帶動指數。",mult:{etf:1.05},stat:"booms"},
 {t:"黑色星期一重演",d:"單日崩跌，市場血流成河。",mult:{etf:0.85},stat:"crashes",c:"歷史會重演。長期投資人撐過去、賣在底部的人受傷最重。"},
 // --- 房地產 ---
 {t:"房市熱潮",d:"低利率＋題材帶動，房價走揚。",mult:{realestate:1.13},stat:"booms",c:"槓桿正面：房價漲 13%，你頭期只押兩成，淨值跳升遠大於此。"},
 {t:"重劃區題材",d:"利多消息，區域房價噴出。",mult:{realestate:1.18},stat:"booms"},
 {t:"都更通過",d:"持有物件搭上都更，價值大漲。",mult:{realestate:1.25},stat:"booms"},
 {t:"房市修正",d:"升息＋打房，房價回檔。",mult:{realestate:0.88},stat:"crashes",c:"槓桿反面：房價跌 12%，頭期只兩成，你的淨值可能蒸發一半以上。"},
 {t:"升息打房",d:"政策出手，買氣急凍。",mult:{realestate:0.85},stat:"crashes"},
 {t:"房市泡沫破裂",d:"恐慌性拋售，房價崩跌。",mult:{realestate:0.78},stat:"crashes",c:"高槓桿在崩盤時最致命——這就是房地產『高風險』的真面目。"},
 {t:"房客退租",d:"出租物件空了一個月，房貸照繳。",cut:"rent"},
 {t:"惡房客欠租",d:"處理糾紛，本月租金落空。",cut:"rent"},
 {t:"房屋稅單到",d:"持有成本，現金扣一筆。",cash:-12000},
 {t:"地震受損",d:"房屋需要修繕，價值受影響。",mult:{realestate:0.92},cash:-20000},
 {t:"囤房稅上路",d:"多屋持有成本上升。",exp:{"生活費":1000}},
 {t:"租金行情上漲",d:"區域租金看漲，房產更搶手。",mult:{realestate:1.06}},
 // --- 創業 ---
 {t:"訂單爆量",d:"旺季來臨，生意營收大增。",mult:{business:1.3},stat:"booms"},
 {t:"病毒式爆紅",d:"一支內容讓品牌一夜爆紅。",mult:{business:1.6},stat:"booms",c:"爆發力最高的代價，是它同樣可能一夜消失。"},
 {t:"獲創投青睞",d:"募資成功，估值跳升。",mult:{business:1.4},stat:"booms"},
 {t:"被大公司收購",d:"出場大賺一筆！",mult:{business:1.8},stat:"booms"},
 {t:"產品上熱搜",d:"曝光暴增，轉單明顯。",mult:{business:1.25},stat:"booms"},
 {t:"競品殺價",d:"對手流血競爭，毛利被壓縮。",mult:{business:0.8},stat:"crashes"},
 {t:"核心員工出走",d:"關鍵人才離職，營運受挫。",mult:{business:0.85}},
 {t:"大客戶流失",d:"營收最大來源跑了。",mult:{business:0.7},stat:"crashes",c:"營收過度集中是創業的隱形地雷。"},
 {t:"供應鏈斷鏈",d:"缺料停工，成本飆升。",mult:{business:0.82}},
 {t:"食安／品質風波",d:"負面新聞重創信任。",mult:{business:0.6},stat:"crashes"},
 {t:"被告侵權",d:"官司纏身，賠了一筆。",mult:{business:0.9},cash:-30000},
 {t:"公司倒閉",d:"撐不下去，資產歸零。",mult:{business:0},stat:"crashes",c:"創業的真相：爆發力最高，也最容易歸零。這就是為什麼別把全部身家壓進去。"},
 {t:"政府新創補助",d:"申請到一筆補助款。",cash:50000},
 {t:"打進新通路",d:"上架大型平台，業績成長。",mult:{business:1.18}},
 {t:"觀光客回流",d:"人潮回來了，餐飲與店面生意興隆。",mult:{business:1.12},stat:"booms"},
 {t:"排隊名店爆紅",d:"被網紅推爆，天天大排長龍。",mult:{business:1.3},stat:"booms",c:"餐飲爆紅來得快去得也快——趁熱拓點，還是先穩住品質？"},
 {t:"食材成本飆漲",d:"進貨成本大漲，毛利被吃掉。",mult:{business:0.92}},
 {t:"外送平台抽成調漲",d:"平台抽更多，淨利縮水。",mult:{business:0.95},c:"通路抽成是餐飲的隱形房東：營收漂亮，淨利卻被一層層抽走。"},
 // --- 加密貨幣（超高波動） ---
 {t:"加密牛市啟動",d:"資金湧入，幣價全面噴出。",mult:{crypto:1.6},stat:"booms",c:"漲的時候最考驗止盈紀律：沒賣，就只是紙上富貴。"},
 {t:"史詩級大牛市",d:"FOMO 全開，散戶瘋狂進場。",mult:{crypto:1.95},stat:"booms",c:"當所有人都在賺錢、計程車司機都在報明牌——通常離頂不遠了。"},
 {t:"減半行情",d:"供給減少的敘事推升幣價。",mult:{crypto:1.4},stat:"booms"},
 {t:"現貨 ETF 通過",d:"機構資金入場的大利多。",mult:{crypto:1.5},stat:"booms"},
 {t:"加密熊市",d:"資金退潮，幣價大跌。",mult:{crypto:0.6},stat:"crashes"},
 {t:"幣圈寒冬",d:"長期下行，量縮人散。",mult:{crypto:0.5},stat:"crashes",c:"超高波動的另一面：跌起來也比任何資產都狠。"},
 {t:"監管利空",d:"主要國家祭出打壓政策。",mult:{crypto:0.75},stat:"crashes"},
 {t:"交易所暴雷",d:"平台無預警倒閉（FTX 式黑天鵝）。",mult:{crypto:0.2},stat:"crashes",c:"把幣放在交易所＝把錢交給別人保管。平台倒了，你的幣跟著歸零。Not your keys, not your coins。"},
 {t:"穩定幣脫鉤",d:"號稱穩定的幣崩了（LUNA／UST 式）。",mult:{crypto:0.45},stat:"crashes",c:"連名字叫『穩定』的都會崩。高收益的鏈上產品，風險從不為零。"},
 {t:"迷因幣崩盤",d:"情緒退潮，迷因幣幾乎歸零。",mult:{crypto:0.3},stat:"crashes"},
 {t:"駭客盜幣",d:"協議遭駭，資產受損。",mult:{crypto:0.7},stat:"crashes"},
 {t:"鯨魚拋售",d:"大戶倒貨，瞬間插針。",mult:{crypto:0.78},stat:"crashes"},
 {t:"主流採用利多",d:"大企業宣布支援加密支付。",mult:{crypto:1.3},stat:"booms"},
 {t:"質押收益到帳",d:"鏈上生息入帳一筆。",cash:4000},
 {t:"員工分紅配股",d:"公司年度分紅入帳。",cash:60000},
 {t:"ETF 成分股調整",d:"指數換股，小幅受惠。",mult:{etf:1.03}},
 {t:"房地合一稅",d:"持有與交易成本，現金扣一筆。",cash:-25000},
 {t:"創業國際參展",d:"參展接到海外訂單，業績成長。",mult:{business:1.1}},
];

/* ===== deck ===== */
let bagO=[],bagT=[],bagE=[];
function drawCard(){
  // Hook F: 5% chance of flash sale card
  if(RNG()<0.05 && !S._flashUsed){
    S._flashUsed=true;
    return buildFlashSaleCard();
  }
  const r=RNG();
  if(r<0.46){
    if(!bagO.length) bagO=shuffle(OPPS.map((_,i)=>i));
    return Object.assign({}, OPPS[bagO.pop()]);
  } else if(r<0.60){
    if(!bagT.length) bagT=shuffle(TRAPS.map((_,i)=>i));
    const t=TRAPS[bagT.pop()];
    if(t.home&&S.ownsHome) return drawCard();
    if(t.raise&&S.raisedTimes>=2) return drawCard();
    return Object.assign({}, t);
  } else {
    if(!bagE.length) bagE=shuffle(EV.map((_,i)=>i));
    return Object.assign({evt:true}, EV[bagE.pop()]);
  }
}
function buildFlashSaleCard(){
  // Pick a random cashflow opportunity at 20% discount
  const candidates=OPPS.filter(o=>!o.trap&&!o.evt&&!o.leverage&&o.buy&&o.buy.mk&&o.buy.mk.income>0);
  const base=candidates[Math.floor(RNG()*candidates.length)];
  const orig=Object.assign({},base);
  const discountedCost=Math.round((orig.buy.cost||orig.buy.down)*0.8);
  const flashCard=JSON.parse(JSON.stringify(orig));
  if(flashCard.buy.cost) flashCard.buy.cost=discountedCost;
  flashCard.ttl="🔥 限時特賣："+orig.ttl;
  flashCard.desc=`屋主急售！比市價便宜 20%，<b>僅限本回合</b>。錯過就沒了。原價 NT$${fmt(orig.buy.cost||orig.buy.down)}，現在只要 NT$${fmt(discountedCost)}。`;
  flashCard._flash=true;
  flashCard._origTitle=orig.ttl;
  flashCard.kind="🔥 限時特賣";
  flashCard.coach="限時機會：折扣貨的邏輯和正常入市一樣，差別只在<b>時間壓力</b>。冷靜判斷：它帶來的現金流值得嗎？";
  return flashCard;
}

/* ===== event applier ===== */
function applyEvent(ev){
  const notes=[];
  if(ev.bonus){ const v=Math.round(S.salary*ev.bonus); S.cash+=v; notes.push(`現金 +${fmt(v)}`); }
  if(ev.cash){ S.cash+=ev.cash; notes.push(`現金 ${ev.cash>=0?"+":"−"}${fmt(Math.abs(ev.cash))}`); }
  if(ev.sal){ S.salary=Math.max(0,S.salary+ev.sal); notes.push(`薪資 ${ev.sal>=0?"+":"−"}${fmt(Math.abs(ev.sal))}/月`); }
  if(ev.exp){ for(const k in ev.exp){ S.living[k]=Math.max(0,(S.living[k]||0)+ev.exp[k]); } notes.push("每月支出變動"); }
  if(ev.mult){ for(const r in ev.mult){ const f=ev.mult[r]; let hit=0;
      S.assets.forEach(a=>{ if(a.route===r||a.reroute===r){ a.value=Math.max(0,Math.round(a.value*f)); hit++; } });
      notes.push(hit?`${ROUTES[r].name}資產市值 ×${f}`:`你沒有${ROUTES[r].name}部位`); } }
  if(ev.cut==="rent"){ const x=S.assets.find(a=>a.route==="realestate"&&a.income>0); if(x){ S.tempCut+=x.income; notes.push("本月一筆租金歸零"); } else notes.push("你沒有出租物件"); }
  else if(typeof ev.cut==="number"){ S.tempCut+=ev.cut; notes.push(`本月被動收入暫減 ${fmt(ev.cut)}`); }
  // Ch7: crash events trigger screen shake + vignette
  if(ev.stat==="crashes"){
    setTimeout(()=>triggerShake(),120);
    setTimeout(()=>triggerVignette(),80);
  }
  return notes.join("、")||"無事發生";
}

/* ===== render ===== */
const $=id=>document.getElementById(id);
function lineRow(name,amt,dir,tag,tagcls){
  const tg=tag?`<span class="tag ${tagcls||""}">  ${tag}</span>`:"";
  const sign=dir==="in"?"+":dir==="out"?"−":"";
  return `<div class="line"><span>${name}${tg}</span><span class="amt ${dir}">${sign}${fmt(Math.abs(amt))}</span></div>`;
}

/* Ch7: animated number counter */
let _prevCash=0, _prevNW=0;
function animateNumber(el,from,to,dur){
  if(!el||from===to) return;
  const start=performance.now();
  const dir=to>from?"up":"dn";
  el.classList.remove("num-up","num-dn","num-pop");
  void el.offsetWidth;
  el.classList.add("num-pop","num-"+dir);
  function step(now){
    const t=Math.min(1,(now-start)/dur);
    const ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    el.textContent=fmt(Math.round(from+(to-from)*ease));
    if(t<1) requestAnimationFrame(step);
    else el.textContent=fmt(to);
  }
  requestAnimationFrame(step);
}

/* Ch7: screen shake + vignette */
function triggerShake(){
  document.body.classList.remove("shaking");
  void document.body.offsetWidth;
  document.body.classList.add("shaking");
  document.body.addEventListener("animationend",()=>document.body.classList.remove("shaking"),{once:true});
}
function triggerVignette(){
  const v=document.getElementById("vignette");
  v.classList.add("show");
  clearTimeout(v._t);
  v._t=setTimeout(()=>v.classList.remove("show"),900);
}

/* Ch7: win confetti */
function spawnConfetti(){
  const colors=["#c9a24b","#e3c884","#7fd6a6","#f0a09b","#4a90d9","#ff9800"];
  for(let i=0;i<70;i++){
    const el=document.createElement("div");
    el.className="confetti-bit";
    const angle=Math.random()*Math.PI*2;
    const dist=120+Math.random()*260;
    const cx=Math.cos(angle)*dist+"px";
    const cy=(Math.sin(angle)*dist-160)*(0.6+Math.random()*0.8)+"px";
    const cr=(Math.random()*720-360)+"deg";
    const cd=(0.5+Math.random()*0.9)+"s";
    el.style.cssText=`--cx:${cx};--cy:${cy};--cr:${cr};--cd:${cd};background:${colors[i%colors.length]};animation-delay:${Math.random()*0.3}s`;
    document.body.appendChild(el);
    el.addEventListener("animationend",()=>el.remove(),{once:true});
  }
}

/* Ch7: drawer content renderer */
let _drawerTab="assets";
function renderDrawerContent(){
  const body=$("drawerBody");
  if(!body) return;
  if(_drawerTab==="assets"){
    if(!S.assets.length){ body.innerHTML=`<div class="d-empty">— 還沒有任何資產。先買進一個讓錢替你工作。—</div>`; return; }
    body.innerHTML=S.assets.map(a=>{
      const eq=equity(a),pl=eq-a.basis,plSign=pl>=0?"+":"−";
      const incTxt=a.income>0?`+${fmt(a.income)}/月 被動收入`:`累計型 · 不配息`;
      return `<div class="d-card"><div class="d-card-name">${a.name} <span class="tag r-${a.route}">${ROUTES[a.route].name}</span></div><div class="d-card-inc">${incTxt}</div><div class="d-card-sub">淨值 NT$${fmt(eq)} ｜ 未實現 ${plSign}${fmt(Math.abs(pl))}</div></div>`;
    }).join("");
  } else if(_drawerTab==="liabs"){
    if(!S.liabilities.length){ body.innerHTML=`<div class="d-empty">— 目前沒有負債（很好！）—</div>`; return; }
    body.innerHTML=S.liabilities.map(l=>`<div class="d-card liab"><div class="d-card-name">${l.name}</div><div class="d-card-sub" style="color:var(--liab)">每月 −${fmt(l.payment)}</div></div>`).join("");
  } else {
    const hasAssets=S.assets.length>0, hasLiab=S.liabilities.length>0;
    body.innerHTML=`
      <div class="d-card prot">
        <div class="d-card-name">🛡 資產防護狀態</div>
        <div class="d-card-sub" style="margin-top:6px">
          ${hasAssets?`持有 ${S.assets.length} 項資產，被動收入 NT$${fmt(passive())}/月`:"尚未持有任何資產"}
        </div>
      </div>
      <div class="d-card prot">
        <div class="d-card-name">🏦 負債狀況</div>
        <div class="d-card-sub" style="margin-top:6px">
          ${hasLiab?`${S.liabilities.length} 筆負債，每月固定支出 NT$${fmt(S.liabilities.reduce((s,l)=>s+l.payment,0))}`:"無負債 ✅"}
        </div>
      </div>
      <div class="d-card prot">
        <div class="d-card-name">🔒 保險狀態</div>
        <div class="d-card-sub" style="margin-top:6px;color:var(--text-dim)">v1.0 尚無保險機制。v2.0 將加入：醫療險、失業保障、意外險——購買保險可減少黑天鵝事件的損失。</div>
      </div>`;
  }
}

function render(){
  const prevCash=_prevCash, prevNW=_prevNW;
  _prevCash=S.cash; _prevNW=netWorth();

  $("month").textContent=S.month;
  if($("wheelMonth")) $("wheelMonth").textContent=S.month;
  if($("wheelExp")) $("wheelExp").textContent="NT$"+fmt(expenses());

  // 簡化 HUD：移除淨資產欄位，新增月淨現金流
  const cashEl=$("cash"), flowEl=$("monthflow");
  if(S.month>0 && Math.abs(S.cash-prevCash)>10){
    animateNumber(cashEl,prevCash,S.cash,480);
  } else {
    cashEl.textContent=fmt(S.cash);
  }
  // 月淨現金流
  if(flowEl){
    const sp=surplus();
    flowEl.textContent=(sp>=0?"+":"−")+fmt(Math.abs(sp));
    flowEl.className="val "+(sp>=0?"flow-pos":"flow-neg");
  }

  if(S.stats) S.stats.peakNW=Math.max(S.stats.peakNW, netWorth());

  let inc=lineRow("薪資（主動）",S.salary,"in");
  S.assets.filter(a=>a.income>0).forEach(a=>inc+=lineRow(a.name,a.income,"in"));
  if(passive()===0) inc+=`<div class="line empty">— 尚無被動現金流 —</div>`;
  $("incomeList").innerHTML=inc;

  let exp="";
  Object.entries(S.living).forEach(([k,v])=>exp+=lineRow(k,v,"out"));
  S.liabilities.forEach(l=>exp+=lineRow(l.name,l.payment,"out"));
  $("expenseList").innerHTML=exp;

  $("assetList").innerHTML = S.assets.length
    ? S.assets.map(a=>lineRow(a.name, equity(a), "flat", ROUTES[a.route].name, "r-"+a.route)).join("")
    : `<div class="line empty">— 還沒有任何資產 —</div>`;
  $("liabList").innerHTML = S.liabilities.length
    ? S.liabilities.map(l=>lineRow(l.name,l.payment,"out","負債","liab")).join("")
    : `<div class="line empty">— 目前沒有負債（很好）—</div>`;

  const sp=surplus();
  $("surplus").textContent=(sp>=0?"+":"−")+fmt(Math.abs(sp));
  $("surplus").style.color=sp>=0?"var(--asset)":"var(--liab)";
  const nf=$("netflow"); nf.textContent=(sp>=0?"+":"−")+fmt(Math.abs(sp))+" / 月";
  nf.className="net mono "+(sp>=0?"pos":"neg");

  const goal=expenses(), p=passive();
  const ratio=goal>0?Math.min(100,Math.round(p/goal*100)):0;
  $("ratio").textContent=ratio; $("fill").style.width=ratio+"%";
  $("passiveLeg").textContent=fmt(p); $("goalLeg").textContent=fmt(goal);

  // Ch7: sync mobile float bar (hidden now, kept for safety)
  // One-Tap Flow: nextBtn and floatBar permanently hidden
  $("nextBtn")?.classList.add("hide");

  renderHoldings();
}

/* Hook B helpers */
let _lastPassive=0;
function pulseBarIfImproved(){
  const p=passive();
  if(p>_lastPassive && p>0){
    const fill=$("fill");
    fill.classList.remove("pulse");
    void fill.offsetWidth; // reflow to restart animation
    fill.classList.add("pulse");
    fill.addEventListener("animationend",()=>fill.classList.remove("pulse"),{once:true});
    // contextual tip
    const goal=expenses(), ratio=goal>0?Math.round(p/goal*100):0;
    const msgs=[];
    if(ratio>=100) msgs.push("被動收入已全覆蓋！自由就在眼前！");
    else if(ratio>=75) msgs.push(`被動收入覆蓋 ${ratio}%！最後衝刺！`);
    else if(ratio>=50) msgs.push(`過半了！被動收入覆蓋 ${ratio}%`);
    else msgs.push(`被動收入 +${fmt(p-_lastPassive)}/月 — 進度 ${ratio}%`);
    showBarTip(msgs[0]);
  }
  _lastPassive=p;
}
function showBarTip(msg){
  let tip=$("barTip");
  if(!tip){ tip=document.createElement("div"); tip.id="barTip"; tip.className="bar-tip"; $("fill").parentElement.style.position="relative"; $("fill").parentElement.appendChild(tip); }
  tip.textContent=msg;
  const ratio=parseFloat($("fill").style.width)||0;
  tip.style.left=Math.min(Math.max(ratio,10),90)+"%";
  tip.classList.add("show");
  clearTimeout(tip._t); tip._t=setTimeout(()=>tip.classList.remove("show"),2800);
}
function renderHoldings(){
  const el=$("holdList");
  if(!S.assets.length){ el.innerHTML=`<div class="empty">— 還沒有任何資產。先買進一個讓錢替你工作。 —</div>`; return; }
  el.innerHTML=S.assets.map(a=>{
    const eq=equity(a), pl=eq-a.basis, plpct=(pl/a.basis*100), plcls=pl>=0?"up":"down";
    const sub=a.loan?`市值 ${fmt(a.value)} − 貸款 ${fmt(a.loan)} = 淨值 ${fmt(eq)}`:`市值 ${fmt(a.value)} · 成本 ${fmt(a.basis)}`;
    const incTxt=a.income>0?`配息 +${fmt(a.income)}/月`:`累計型 · 不配息`;
    return `<div class="hold" data-aid="${a.aid}">
      <div>
        <div class="h-name">${a.name} <span class="tag r-${a.route}">${ROUTES[a.route].name}</span></div>
        <div class="h-sub">${sub}</div>
        <div class="h-sub">${incTxt} · 未實現 <span class="h-pl ${plcls}">${pl>=0?"+":"−"}${fmt(Math.abs(pl))}（${plpct>=0?"+":""}${plpct.toFixed(1)}%）</span></div>
      </div>
      <div class="h-orders">
        <label>止損價<input type="number" placeholder="${fmt(Math.round(a.value*0.85))}" value="${a.sl||""}" data-k="sl"></label>
        <label>止盈價<input type="number" placeholder="${fmt(Math.round(a.value*1.3))}" value="${a.tp||""}" data-k="tp"></label>
      </div>
      <button class="sellbtn" data-sell="${a.aid}">賣出（拿回 ${fmt(eq)}）</button>
    </div>`;
  }).join("");
  el.querySelectorAll("input[data-k]").forEach(inp=>{ inp.onchange=e=>{
      const aid=+e.target.closest(".hold").dataset.aid, a=S.assets.find(x=>x.aid===aid); if(!a)return;
      const v=parseFloat(e.target.value); a[e.target.dataset.k]=isNaN(v)||v<=0?null:v; }; });
  el.querySelectorAll("button[data-sell]").forEach(b=>{ b.onclick=()=>{ const a=S.assets.find(x=>x.aid===+b.dataset.sell); if(a) manualSell(a); }; });
}

/* ===== card UI ===== */
function showCard(c){
  if(!c) return showCard(drawCard());
  const slot=$("cardSlot");
  const cls=c.trap?"trap":c.evt?"evt":"opp";
  let stats="", feat="", affordable=true, reason="";

  if(c.evt){
    stats=`<div class="s"><span>類型</span><span class="v">隨機事件</span></div>`;
  } else if(c.trap){
    if(c.payment) stats+=`<div class="s"><span>每月支出</span><span class="v out">−${fmt(c.payment)}</span></div>`;
    if(c.cashHit){ stats+=`<div class="s"><span>一次現金</span><span class="v out">−${fmt(c.cashHit)}</span></div>`; if(S.cash<c.cashHit){affordable=false;reason="現金不足";} }
    if(c.home){ stats+=`<div class="s"><span>頭期款</span><span class="v out">−${fmt(c.down)}</span></div><div class="s"><span>每月房貸</span><span class="v out">−${fmt(c.newRent)}（取代房租 14,000）</span></div>`; if(S.cash<c.down){affordable=false;reason="現金不足以付頭期款";} }
    if(c.raise) stats+=`<div class="s"><span>每月薪資</span><span class="v in">+${fmt(c.salaryUp)}</span></div>`;
    stats+=`<div class="s"><span>帶來被動現金流？</span><span class="v out">${c.raise?"否（是主動收入）":"0 元"}</span></div>`;
  } else {
    const b=c.buy, mk=b.mk, pay=payFor(c), disc=(b.down||b.cost)-pay;
    feat=`<div class="feat r-${c.route}">路線：${ROUTES[c.route].name} · ${ROUTES[c.route].feat}</div>`;
    if(c.leverage){
      stats+=`<div class="s"><span>頭期款</span><span class="v cash">−${fmt(pay)}</span></div>`;
      if(mk.income>0){ stats+=`<div class="s"><span>租金收入</span><span class="v in">+${fmt(mk.income)} / 月</span></div><div class="s"><span>房貸＋雜費</span><span class="v out">−${fmt(b.mortgage)} / 月</span></div><div class="s"><span><b>淨現金流</b></span><span class="v in"><b>+${fmt(mk.income-b.mortgage)} / 月</b></span></div>`; }
      else { stats+=`<div class="s"><span>每月現金流</span><span class="v out">0（純賭增值）</span></div>`; if(b.mortgage>0) stats+=`<div class="s"><span>每月還款</span><span class="v out">−${fmt(b.mortgage)}</span></div>`; }
      stats+=`<div class="s"><span>標的市值 / 槓桿</span><span class="v">${fmt(mk.value)} · ${(mk.value/pay).toFixed(1)}x</span></div>`;
      if(disc>0) stats+=`<div class="s"><span>職業折扣</span><span class="v in">−${fmt(disc)}</span></div>`;
      if(S.cash<pay){affordable=false;reason="現金不足以付頭期款";}
    } else if(mk.acc){
      stats+=`<div class="s"><span>投入成本</span><span class="v cash">−${fmt(pay)}</span></div>`;
      stats+=`<div class="s"><span>每月配息</span><span class="v out">0（累計／純增值）</span></div>`;
      stats+=`<div class="s"><span>波動度</span><span class="v">${mk.vol>=0.1?"極高":mk.vol>=0.04?"高":"中低"}</span></div>`;
      if(disc>0) stats+=`<div class="s"><span>職業折扣</span><span class="v in">−${fmt(disc)}</span></div>`;
      if(S.cash<pay){affordable=false;reason="現金不足";}
    } else {
      stats+=`<div class="s"><span>投入成本</span><span class="v cash">−${fmt(pay)}</span></div>`;
      stats+=`<div class="s"><span>被動現金流</span><span class="v in">+${fmt(mk.income)} / 月</span></div>`;
      stats+=`<div class="s"><span>年化現金回報</span><span class="v">${(mk.income*12/pay*100).toFixed(1)}%</span></div>`;
      if(disc>0) stats+=`<div class="s"><span>職業折扣</span><span class="v in">−${fmt(disc)}</span></div>`;
      if(S.cash<pay){affordable=false;reason="現金不足";}
    }
  }
  // 改良 3: 無法負擔時顯示正向引導
  let affordHint="";
  if(!c.evt && !affordable){
    const cost=c.trap?(c.cashHit||c.down||0):(()=>{try{return payFor(c);}catch{return 0;}})();
    const gap=cost-S.cash;
    const monthlySave=surplus(); // 目前每月結餘
    let hintTxt="";
    if(gap>0 && monthlySave>0){
      const months=Math.ceil(gap/monthlySave);
      hintTxt=months<=6
        ?`💡 還差 NT$${fmt(gap)}，照目前存錢速度約 <b>${months} 個月後</b>即可購買！`
        :`💡 還差 NT$${fmt(gap)}。先積累現金流或賣出資產增加存款吧。`;
    } else if(gap>0 && monthlySave<=0){
      hintTxt=`⚠️ 每月又入不敷出，就算存錢也買不了。需要先提升被動收入或削減支出。`;
    }
    if(hintTxt) affordHint=`<div class="afford-hint">${hintTxt}</div>`;
  }

  let acts;
  if(c.evt){ acts=`<div class="acts"><button class="primary" data-act="accept">知道了，繼續</button></div>`; }
  else{ const lbl=c.trap?(c.raise?"接受加薪":"買下去"):"買進";
    acts=`<div class="acts"><button data-act="skip">⤵️ 本月略過</button><button class="primary" data-act="accept" ${affordable?"":"disabled"}>${affordable?`💰 ${lbl}（−NT$${fmt((()=>{try{if(c.trap)return c.cashHit||c.down||0;return payFor(c);}catch{return 0;}})())}）`:'無法負擔'}</button></div>`; }
  const warn=(!c.evt&&!affordable)?`<div class="warn">${reason}</div>`:"";
  const kind=c.kind||(c.evt?"事件":"投資機會");
  slot.innerHTML=`<div class="card ${cls}"><div class="kind">${kind}</div><div class="ttl">${c.ttl}</div>${feat}<div class="desc">${c.desc||c.d||""}</div><div class="stats">${stats}</div>${warn}${affordHint}${acts}</div>`;
  slot.querySelectorAll("button[data-act]").forEach(b=>b.onclick=()=>resolveCard(c,b.dataset.act));
  curCard=c; curResolved=false;
  $("nextBtn").classList.add("hide");
}

function resolveCard(c,act){
  let coachMsg=null;
  if(c.trap) S.stats.trapsSeen++;
  if(c.evt){
    const note=applyEvent(c);
    if(c.stat) S.stats[c.stat]++;
    coachMsg=c.c?`<b>${note}。</b> ${c.c}`:`${note}。`;
  } else if(act==="accept"){
    if(c.trap){
      if(c.payment) S.liabilities.push({name:c.liab,payment:c.payment});
      if(c.cashHit) S.cash-=c.cashHit;
      if(c.home){ S.cash-=c.down; delete S.living["房租"]; S.liabilities.push({name:c.liab,payment:c.newRent}); S.ownsHome=true; }
      if(c.raise){ S.salary+=c.salaryUp; Object.entries(c.livingUp).forEach(([k,v])=>S.living[k]+=v); S.raisedTimes++; }
      S.stats.trapsTaken++;
      if(c.cashHit) S.stats.spentConsumption+=c.cashHit;
      if(c.home) S.stats.spentConsumption+=c.down;
      coachMsg=c.coach;
    } else {
      const b=c.buy, mk=b.mk, pay=payFor(c);
      const wasFirstIncome=(passive()===0 && mk.income>0);
      S.cash-=pay;
      S.stats.spentAssets+=pay;
      const a=Object.assign({aid:AID++, name:c.ttl, route:c.route, sl:null, tp:null}, mk);
      a.basis=pay;
      S.assets.push(a);
      if(c.leverage && b.liabName && b.mortgage>0){ const ln=b.liabName+" #"+a.aid; S.liabilities.push({name:ln,payment:b.mortgage}); a.liabName=ln; }
      // Hook: skill upgrade card boosts salary instead of passive income
      if(c.skillSalaryBoost){ S.salary+=c.skillSalaryBoost; flashCoach(`技能進修完成！每月薪資 <b>+${fmt(c.skillSalaryBoost)}</b>，存錢速度提升。`); }
      coachMsg=c.coach||(wasFirstIncome?"你買進了第一個會配息的資產。讓它替你工作。":null);
      // Hook B: trigger gold pulse if passive income improved
      pulseBarIfImproved();
    }
  } else { if(c.trap) coachMsg="聰明。<b>略過誘惑，把現金留給能生錢的資產。</b>"; }

  if(coachMsg) setCoach(c,coachMsg);
  render();
  curResolved=true;
  // 禁用卡片按鈕（防止重複點擊）
  $("cardSlot").querySelectorAll(".card button[data-act]").forEach(b=>b.disabled=true);
  if(S.over) return; // 遊戲結束則不自動推進
  // 改良 1: One-Tap Flow — 600ms 延遲後自動执行月結算
  $("nextBtn").classList.add("hide");
  const _card=document.querySelector("#cardSlot .card");
  if(_card){ _card.style.transition="opacity .4s .15s, transform .4s .15s"; _card.style.opacity="0.4"; _card.style.transform="translateY(-6px) scale(.98)"; }
  setTimeout(()=>{ if(!S.over) nextMonth(); }, 650);
  checkEnd();
}
function setCoach(c,msg){
  const who=c.evt?"事件":c.trap?"富爸爸 · 別被騙了":"富爸爸";
  $("coach").innerHTML=`<span class="who">${who}</span>${msg}`;
}

/* ===== sell ===== */
function doSell(a){
  const eq=equity(a), pl=eq-a.basis;
  S.cash+=eq;
  if(a.liabName){ const i=S.liabilities.findIndex(l=>l.name===a.liabName); if(i>=0) S.liabilities.splice(i,1); }
  S.assets=S.assets.filter(x=>x.aid!==a.aid);
  S.stats.trades++; S.stats.realizedPL+=pl;
  return pl;
}
function manualSell(a){
  const pl=doSell(a);
  const word=pl>=0?"獲利了結":"認賠殺出";
  setCoach({}, `<span class="who">富爸爸 · 賣出</span>你${word}了「${a.name}」，實現損益 <b>${pl>=0?"+":"−"}${fmt(Math.abs(pl))}</b>。${a.income>0?"提醒：你也放掉了它的每月現金流，自由進度會往回退。":"累計型本來就靠賣出才算數，這步是對的。"}`);
  render(); checkEnd();
  if(!S.over && curCard && !curResolved) showCard(curCard);
}

/* ===== monthly ===== */
function markToMarket(){
  S.assets.forEach(a=>{ if(a.drift!==undefined){
    const rb=(S.prof.routeBonus&&S.prof.routeBonus[a.route])||0;
    const shock=(a.drift+S.driftBias+rb)+gauss()*(a.vol+S.volBias);
    a.value=Math.max(0,Math.round(a.value*(1+shock))); } });
}
function runAutoOrders(){
  S.assets.slice().forEach(a=>{
    if(a.tp && a.value>=a.tp){ const pl=doSell(a); flashCoach(`止盈觸發：「${a.name}」漲到 ${fmt(a.value)} 自動賣出，實現 ${pl>=0?"+":"−"}${fmt(Math.abs(pl))}。紀律勝過情緒。`); }
    else if(a.sl && a.value<=a.sl){ const pl=doSell(a); flashCoach(`止損觸發：「${a.name}」跌到 ${fmt(a.value)} 自動賣出，認賠 ${fmt(Math.abs(pl))}。止損就是把損失關在門外。`); }
  });
}
let pendingCoach=null;
function flashCoach(m){ pendingCoach=(pendingCoach?pendingCoach+"<br><br>":"")+m; }

function nextMonth(){
  const expBefore=expenses();
  let flow=income()-expBefore;
  if(S.tempCut){ flow-=S.tempCut; S.tempCut=0; }
  S.cash+=flow;
  S.stats.activeEarned+=S.salary; S.stats.passiveEarned+=passive();
  S.month++;
  markToMarket();
  runAutoOrders();
  // Hook C: bleed animation for expense deduction
  spawnBleedAnim(expBefore);
  if(S.cash<0){
    S.loanCount++;
    if(S.loanCount>=3){ render(); return endGame(false); }
    S.cash+=80000;
    S.liabilities.push({name:`緊急信貸 ${S.loanCount}`,payment:3500});
    flashCoach(`<b>現金見底，被迫借了第 ${S.loanCount} 次高利貸</b>（+80,000 現金，每月多 3,500 支出）。再借第三次就破產。`);
  }
  if(pendingCoach){ $("coach").innerHTML=`<span class="who">富爸爸 · 本月</span>${pendingCoach}`; pendingCoach=null; }
  render();
  if(checkEnd()) return;
  showCard(drawCard());
}
function spawnBleedAnim(expAmt){
  const el=document.createElement("div");
  el.className="bleed-anim";
  el.textContent="−"+fmt(expAmt);
  // position near the expense section of the ledger
  const ledger=document.querySelector(".ledger");
  if(ledger){
    const rect=ledger.getBoundingClientRect();
    el.style.left=(rect.left+rect.width*0.7)+"px";
    el.style.top=(rect.top+rect.height*0.3+window.scrollY)+"px";
  } else {
    el.style.left="60%"; el.style.top="40%";
  }
  document.body.appendChild(el);
  el.addEventListener("animationend",()=>el.remove(),{once:true});
}
function checkEnd(){
  if(S.over) return true;
  if(passive()>=expenses() && passive()>0){ endGame(true); return true; }
  return false;
}

/* ===== route helpers ===== */
function dominantRoute(){
  const m={}; S.assets.forEach(a=>{ m[a.route]=(m[a.route]||0)+a.basis; });
  let best=null,bv=-1; for(const r in m){ if(m[r]>bv){bv=m[r];best=r;} }
  return best?ROUTES[best].name:"—";
}

/* ===== end + stats ===== */
function renderEndStats(win){
  const s=S.stats, seen=s.trapsSeen, avoided=seen-s.trapsTaken, rate=seen?Math.round(avoided/seen*100):0;
  const cell=(l,v,cls="")=>`<div class="cell"><div class="l">${l}</div><div class="v ${cls}">${v}</div></div>`;
  const pm=n=>(n>=0?"+":"−")+fmt(Math.abs(n));
  let h="";
  h+=cell("主力路線", dominantRoute(),"gold");
  h+=cell("巔峰淨資產","NT$"+fmt(s.peakNW),"gold");
  h+=cell("投入資產（累計）","NT$"+fmt(s.spentAssets),"good");
  h+=cell("花在負債／享受","NT$"+fmt(s.spentConsumption),"bad");
  h+=cell("投資交易",s.trades+" 筆");
  h+=cell("交易已實現損益","NT$"+pm(s.realizedPL), s.realizedPL>=0?"good":"bad");
  h+=cell("誘惑避坑",`${avoided}/${seen}　${rate}%`);
  h+=cell("被迫借貸",S.loanCount+" 次", S.loanCount?"bad":"");
  h+=cell("主動收入（累計）","NT$"+fmt(s.activeEarned));
  h+=cell("被動收入（累計）","NT$"+fmt(s.passiveEarned),"gold");
  h+=cell("市場洗禮",`崩盤 ${s.crashes}　多頭 ${s.booms}`);
  const punch=win
    ? `你把 <b>NT$${fmt(s.spentAssets)}</b> 投入會生錢的資產，只花 NT$${fmt(s.spentConsumption)} 在會吸錢的東西——這個比例，就是你能自由的原因。`
    : `你花了 <b>NT$${fmt(s.spentConsumption)}</b> 在負債與享受，卻只投入 NT$${fmt(s.spentAssets)} 在資產——錢往外流得比流進來快。`;
  h+=`<div class="cell full"><div class="l">一句話結論</div><div class="punch">${punch}</div></div>`;
  $("endStats").innerHTML=h;
}
/* Hook E: determine archetype badge */
function getArchetype(win){
  const dom=dominantRoute();
  if(win){
    if(S.month<=18) return {badge:"👑 天生資本家",flavor:`在台灣當${S.prof.name.replace(/[👨‍🍳👨‍💼🚚👨‍💻👨‍⚕️]/u,"").trim()}，${S.month} 個月達成被動收入全覆蓋，超越全台 92% 的社畜！🐭`};
    if(dom==="房地產") return {badge:"🏠 全自動包租公",flavor:"只要槓桿用得好，房客幫我打到老。已跳出老鼠賽跑！"};
    return {badge:"💰 穩健自由人",flavor:`用 ${S.month} 個月讓被動收入超過支出。不快，但是真的自由。`};
  } else {
    if(S.loanCount>=2 || S.stats.spentConsumption>S.stats.spentAssets*1.5) return {badge:"💸 精緻窮苦主",flavor:`${S.prof.name.includes("醫")|| S.prof.name.includes("工程")?"高薪卻":"好不容易存的錢，"}最後被負債與消費拖垮... 現實太扎心了 😭`};
    if(S.assets.length===0 && S.month>20) return {badge:"🐢 佛系苦行僧",flavor:`只存不投，打工到頭。在倉鼠輪上跑了 ${S.month} 個月依然在上班。`};
    const covPct=Math.round(passive()/Math.max(1,expenses())*100);
    return {badge:`🌱 覺醒中（${covPct}%）`,flavor:`你已達成 ${covPct}% 的財務自由！只差最後一哩路。`};
  }
}
function endGame(win){
  S.over=true; lastWin=win;
  const arch=getArchetype(win);
  const m=$("endModal"); m.className="modal "+(win?"win":"lose");
  const assetLines=S.assets.length?S.assets.map(a=>`  ${a.name}　淨值 ${fmt(equity(a))}${a.income>0?` · 配息 +${fmt(a.income)}`:""}`).join("\n"):"  （沒有任何資產）";
  const recap=`${win?"用時":"撐了"}：${S.month} 個月\n職業：${S.prof.name}\n主力路線：${dominantRoute()}\n被動現金流：NT$${fmt(passive())} / 月\n總支出：　　NT$${fmt(expenses())} / 月\n淨資產：　　NT$${fmt(netWorth())}\n`+(win?"":`借高利貸：${S.loanCount} 次\n`)+`————————————\n你的資產：\n${assetLines}`;
  // Hook D: badge + near-miss block
  $("endBadge").textContent=arch.badge;
  if(win){
    $("endTitle").textContent="跳出了老鼠賽跑";
    $("endLesson").innerHTML=`<b>${arch.flavor}</b><br><br>你做到了核心：<b>讓被動現金流覆蓋全部支出</b>。你贏的關鍵不是薪水高、也不是淨資產大，而是把錢換成了<b>會配息的資產</b>。`;
    $("nearMissBlock").classList.add("hide");
    $("retryGlowBtn").classList.add("hide");
    // Ch7: win confetti
    setTimeout(()=>spawnConfetti(),300);
  } else {
    const covPct=Math.min(99,Math.round(passive()/Math.max(1,expenses())*100));
    const gap=Math.max(0,expenses()-passive());
    $("endTitle").textContent="差一點就自由了！";
    $("nearMissPct").textContent=covPct+"%";
    $("nearMissBar").style.width=covPct+"%";
    $("nearMissGap").textContent=gap>0?`還差 NT$${fmt(gap)} / 月 的被動收入，就能跳出老鼠賽跑`:`被動收入覆蓋率幾乎達標！`;
    $("nearMissBlock").classList.remove("hide");
    $("endLesson").innerHTML=`<b>${arch.flavor}</b><br><br>現金見底、被每月的負債支出拖垮。你的錢有多少變成<b>會生錢的資產</b>，又有多少變成<b>每月把錢拿走的負債</b>？`;
    const retryBtn=$("retryGlowBtn");
    retryBtn.textContent="🔘 不服氣！換個策略再挑戰一次 ➔";
    retryBtn.classList.remove("hide");
    retryBtn.onclick=()=>{ $("endScreen").classList.add("hide"); $("cardPreview").classList.add("hide"); cardBlob=null; cardURL=null; $("intro").classList.remove("hide"); };
    // Ch7: shake on loss
    setTimeout(()=>triggerShake(),200);
    setTimeout(()=>triggerVignette(),150);
  }
  $("endRecap").textContent=recap;
  renderEndStats(win);
  $("cardPreview").classList.add("hide");
  $("endScreen").classList.remove("hide");
  // Ch7: share card ripple on tap
  const prev=$("cardPreview");
  prev.onclick=()=>onShare();
  makeCard(win);
}

/* ===== share card ===== */
function trackText(x,text,font,sx,sy,tr,fill){ x.font=font; x.fillStyle=fill; let cx=sx; for(const ch of text){ x.fillText(ch,cx,sy); cx+=x.measureText(ch).width+tr; } }
async function buildCard(win){
  try{ await document.fonts.ready; }catch(e){}
  const arch=getArchetype(win);
  const W=1080,H=1080, cv=document.createElement("canvas"); cv.width=W; cv.height=H; const x=cv.getContext("2d");
  const INK="#16302b",INK2="#1f4039",PAPER="#f3efe2",GOLD="#c9a24b",GOLDS="#e3c884",LIAB="#c25b56",DIM="#96aa9e",TRACK="#0f241f",ASSET="#2f7d5b";
  // Hook E: archetype-specific accent colour
  let accent=win?GOLD:LIAB;
  if(arch.badge.includes("包租公")) accent=ASSET;
  if(arch.badge.includes("苦行僧")) accent="#8b7355";
  x.textBaseline="top"; x.fillStyle=INK; x.fillRect(0,0,W,H);
  const g=x.createRadialGradient(W-240,30,30,W-240,30,760); g.addColorStop(0,"rgba(42,91,82,0.55)"); g.addColorStop(1,"rgba(42,91,82,0)"); x.fillStyle=g; x.fillRect(0,0,W,H);
  x.strokeStyle=accent; x.lineWidth=3; x.beginPath(); x.roundRect(30,30,W-60,H-60,28); x.stroke();
  const MX=84;
  trackText(x,"現金流人生",'700 26px "Noto Sans TC"',MX,62,7,GOLD);
  trackText(x,"CASHFLOW",'900 20px "Noto Sans TC"',MX+260,66,9,GOLD);
  // Hook E: archetype badge on card
  x.font='900 24px "Noto Sans TC"'; const bt=arch.badge, bw=x.measureText(bt).width, bx0=W/2-(bw+56)/2;
  x.fillStyle=accent; x.beginPath(); x.roundRect(bx0,140,bw+56,56,28); x.fill();
  x.fillStyle=win?INK:PAPER; x.fillText(bt,bx0+28,152);
  // Month number
  const num=String(S.month);
  x.font='900 210px "Noto Serif TC"'; const nw=x.measureText(num).width; x.font='900 72px "Noto Serif TC"'; const uw=x.measureText("個月").width; const gx=W/2-(nw+18+uw)/2;
  x.fillStyle=PAPER; x.font='900 210px "Noto Serif TC"'; x.fillText(num,gx,240);
  x.fillStyle=GOLDS; x.font='900 72px "Noto Serif TC"'; x.fillText("個月",gx+nw+18,358);
  // Flavor text (archetype)
  const flavorFull=arch.flavor;
  const flavorShort=flavorFull.length>28?flavorFull.substring(0,26)+"…":flavorFull;
  x.fillStyle=GOLDS; x.font='700 34px "Noto Sans TC"'; x.fillText(flavorShort,W/2-x.measureText(flavorShort).width/2,472);
  // Freedom progress bar
  const mx0=MX,mx1=W-84,my=570,mh=46,rad=13,ww=mx1-mx0; const ratio=win?1:Math.max(0,Math.min(1,passive()/Math.max(1,expenses())));
  x.fillStyle=GOLDS; x.font='900 24px "Noto Sans TC"'; x.fillText("自由進度 · 主力："+dominantRoute(),mx0,my-40);
  const rt=Math.round(ratio*100)+"%"; x.font='900 32px "Noto Sans TC"'; x.fillStyle=accent; x.fillText(rt,mx1-x.measureText(rt).width,my-44);
  x.fillStyle=TRACK; x.beginPath(); x.roundRect(mx0,my,ww,mh,rad); x.fill();
  x.save(); x.shadowColor=accent; x.shadowBlur=22; x.fillStyle=accent; x.beginPath(); x.roundRect(mx0,my,Math.max(rad*2,ww*ratio),mh,rad); x.fill(); x.restore();
  if(win){ x.fillStyle=GOLDS; x.beginPath(); x.roundRect(mx0+3,my+3,ww-6,12,7); x.fill(); }
  // Stats grid
  const st=[["被動現金流 / 月","NT$"+fmt(passive()),GOLD],["總支出 / 月","NT$"+fmt(expenses()),PAPER],["淨資產","NT$"+fmt(netWorth()),netWorth()>=0?GOLD:LIAB],["持有資產",S.assets.length+" 項",PAPER]];
  const cols=[MX,W/2+10], rows=[690,835];
  st.forEach((s,i)=>{ const cx=cols[i%2],cy=rows[(i/2)|0]; x.fillStyle=DIM; x.font='700 24px "Noto Sans TC"'; x.fillText(s[0],cx,cy); x.fillStyle=s[2]; x.font='900 46px "Noto Sans TC"'; x.fillText(s[1],cx,cy+34); });
  x.strokeStyle=INK2; x.lineWidth=2; x.beginPath(); x.moveTo(MX,990); x.lineTo(W-84,990); x.stroke();
  x.fillStyle=GOLD; x.font='900 28px "Noto Serif TC"'; x.fillText("WAKE STUDIO",MX,1006);
  const ut="mice-runner.vercel.app"; x.fillStyle=DIM; x.font='700 22px "Noto Sans TC"'; x.fillText(ut,W-84-x.measureText(ut).width,1012);
  return cv;
}
async function makeCard(win){
  try{ const cv=await buildCard(win); cardURL=cv.toDataURL("image/png");
    await new Promise(res=>cv.toBlob(b=>{cardBlob=b;res();},"image/png"));
    const img=$("cardPreview"); img.src=cardURL; img.classList.remove("hide");
  }catch(e){ console.error("card build failed",e); }
}
function shareText(){
  return lastWin
    ? `我用 ${S.month} 個月跳出了老鼠賽跑（主力：${dominantRoute()}）——被動現金流 NT$${fmt(passive())}／月，超過了全部支出。\n\n換你試試能不能讓錢替你工作：\nhttps://mice-runner.vercel.app/\n\n#富爸爸窮爸爸 #財務自由 #現金流`
    : `我撐了 ${S.month} 個月，還是被老鼠賽跑拖垮了。你能撐多久？\n\nhttps://mice-runner.vercel.app/\n\n#富爸爸窮爸爸 #現金流`;
}
function openThreads(){ window.open("https://www.threads.net/intent/post?text="+encodeURIComponent(shareText()),"_blank","noopener"); }
function downloadCard(){ if(!cardURL) return; const a=document.createElement("a"); a.href=cardURL; a.download="cashflow-result.png"; document.body.appendChild(a); a.click(); a.remove(); }
async function onShare(){
  if(!cardBlob){ downloadCard(); openThreads(); return; }
  const file=new File([cardBlob],"cashflow-result.png",{type:"image/png"});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file], text:shareText(), title:"跳出老鼠賽跑"}); return; }catch(e){ if(e&&e.name==="AbortError") return; }
  }
  downloadCard(); openThreads();
}

/* ===== wiring ===== */
function buildProfGrid(){
  $("profGrid").innerHTML=PROFS.map(p=>{
    const exp=Object.values(p.living).reduce((a,b)=>a+b,0);
    return `<button class="profcard" data-prof="${p.id}">
      <div class="pc-top"><span class="pc-name">${p.name}</span><span class="pc-diff d-${p.diff}">${p.diff}</span></div>
      <div class="pc-stats">月薪 NT$${fmt(p.salary)} · 支出 NT$${fmt(exp)} · 現金 NT$${fmt(p.cash)}</div>
      <div class="pc-perk">${p.perk}</div>
    </button>`;
  }).join("");
  $("profGrid").querySelectorAll("button[data-prof]").forEach(b=>b.onclick=()=>{ $("intro").classList.add("hide"); startGame(b.dataset.prof); });
}
function startGame(profId){
  chosenProf=profId||chosenProf;
  S=freshState(chosenProf); bagO=[];bagT=[];bagE=[]; _lastPassive=0;
  const p=PROFS.find(x=>x.id===S.prof.id)||PROFS[0];
  $("coach").innerHTML=`<span class="who">職業 · ${p.name}</span>${p.perk}<br><br><b>目標：</b>累積會配息的資產，讓被動現金流覆蓋全部支出，跳出老鼠賽跑。`;
  render(); showCard(drawCard());
}

/* Hook A: Soul question wiring */
(function initSoulScreen(){
  const avgMonthlyExp=33000; // avg TW household
  const savingsOptions=[50000,100000,200000,500000];
  const s=savingsOptions[Math.floor(Math.random()*savingsOptions.length)];
  const days=Math.round(s/avgMonthlyExp*30);
  $("soulDays").textContent=days+" 天";
  $("soulSub").textContent=`假設你的存款約 NT$${fmt(s)}，以台灣平均月支出 NT$${fmt(avgMonthlyExp)} 計算`;
  $("soulCta").onclick=()=>{ $("soulScreen").classList.add("hide"); $("intro").classList.remove("hide"); };
})();

buildProfGrid();
$("nextBtn").onclick=nextMonth;
$("shareBtn").onclick=onShare;
$("dlBtn").onclick=downloadCard;
$("thBtn").onclick=openThreads;
$("restartBtn").onclick=()=>{ $("endScreen").classList.add("hide"); $("cardPreview").classList.add("hide"); cardBlob=null; cardURL=null; $("soulScreen").classList.remove("hide"); };

/* Ch7: Mobile float bar sync */
$("floatBarBtn").onclick=nextMonth;

/* Ch7: Bottom sheet drawer wiring */
$("drawerToggle").onclick=()=>{ $("drawer").classList.add("open"); renderDrawerContent(); };
$("drawerClose").onclick=()=>$("drawer").classList.remove("open");
$("drawer").onclick=e=>{ if(e.target===$("drawer")) $("drawer").classList.remove("open"); };
document.querySelectorAll(".drawer-tab").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".drawer-tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    _drawerTab=btn.dataset.tab;
    renderDrawerContent();
  };
});

/* Ch7: keep nextBtn + floatBarBtn in sync (hide/show) */
const _origNextBtnShow=Object.getOwnPropertyDescriptor(HTMLElement.prototype,"className");
(function patchNextBtn(){
  const nb=$("nextBtn"), fb=$("floatBarBtn");
  const obs=new MutationObserver(()=>{
    const hidden=nb.classList.contains("hide")||nb.hasAttribute("disabled");
    fb.disabled=hidden;
  });
  obs.observe(nb,{attributes:true,attributeFilter:["class","disabled"]});
})();

render();