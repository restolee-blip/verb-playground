"use strict";
const rows=[
["밀다","생활 행동","상자를 밀어요.","상자가 어느 쪽으로 움직였나요?"],
["당기다","생활 행동","수레를 당겨요.","손을 몸 쪽으로 움직이면 어떻게 되나요?"],
["열다","생활 행동","문을 열어요.","문을 옆으로 밀면 무엇이 보이나요?"],
["닫다","생활 행동","문을 닫아요.","문을 닫으면 무엇이 가려지나요?"],
["닦다","생활 행동","책상을 닦아요.","얼룩이 있던 곳이 어떻게 달라졌나요?"],
["쌓다","놀이와 만들기","블록을 쌓아요.","블록을 어디에 놓았나요?"],
["넣다","생활 행동","공을 상자에 넣어요.","공이 어디로 갔나요?"],
["꺼내다","생활 행동","공을 상자에서 꺼내요.","공이 처음에는 어디에 있었나요?"],
["주다","관계","친구에게 사과를 줘요.","사과를 가지고 있던 사람은 누구였나요?"],
["받다","관계","친구에게 책을 받아요.","책을 받아 든 사람은 누구인가요?"],
["걷다","몸의 움직임","길을 걸어요.","걸을 때 발이 어떻게 움직이나요?"],
["뛰다","몸의 움직임","놀이터에서 뛰어요.","걸을 때와 어떤 점이 다른가요?"],
["앉다","몸의 움직임","의자에 앉아요.","몸이 어느 쪽으로 움직이나요?"],
["일어나다","몸의 움직임","의자에서 일어나요.","앉았을 때보다 몸이 어떻게 달라졌나요?"],
["던지다","몸의 움직임","공을 던져요.","공이 손을 떠나 어디로 가나요?"],
["굴리다","놀이와 만들기","공을 굴려요.","공이 바닥에서 어떻게 움직이나요?"],
["심다","자연과 변화","씨앗을 심어요.","씨앗을 어디에 놓았나요?"],
["물을 주다","자연과 변화","화분에 물을 줘요.","물이 어디로 떨어지나요?"],
["자라다","자연과 변화","새싹이 자라요.","어제보다 어떤 점이 달라졌나요?"],
["피다","자연과 변화","꽃이 피어요.","꽃봉오리가 어떻게 변했나요?"],
["먹다","생활 행동","밥을 먹어요.","숟가락이 어디로 가나요?"],
["마시다","생활 행동","물을 마셔요.","컵에 담긴 것은 무엇인가요?"],
["씻다","생활 행동","손을 씻어요.","손을 깨끗하게 하려면 어떻게 하나요?"],
["그리다","놀이와 만들기","나무를 그려요.","무엇으로 나무를 그리나요?"]
];
const original=rows.map(([word,category,sentence,prompt],id)=>({id:String(id),word,category,sentence,prompt,image:`images/card-${id}.webp`,level:id<16?1:2,hidden:false}));
const base=()=>({cards:structuredClone(original),stories:[],settings:{pin:"",voice:false,reduce:false,unique:true,shuffle:true,words:true,level:2,excluded:[]}});
const app=document.querySelector("#app"),nav=document.querySelector("#nav"),foot=document.querySelector("#foot");
let data=base(),db,page="home",parents=[],unlocked=false,writeQueue=Promise.resolve(),failed=false;
const session={magic:{id:"0",progress:0},secret:{seen:[],reveal:false},detect:{},pair:{},sentence:{actor:0,object:0,verb:null},train:{ids:[],note:""},place:{index:0},cards:{size:4,offset:0,category:"",words:null,print:4,printWords:true}};
const title={home:"움직여라! 동사 놀이터",move:"움직여 봐!",find:"찾아 봐!",talk:"이야기해 봐!",magic:"동사 마법",secret:"몸짓 비밀카드",detect:"움직임 탐정",pair:"동사 짝꿍 찾기",place:"우리 교실 동사 찾기",sentence:"누가? 무엇을? 어떻게?",train:"동사 이야기 기차",cards:"동사 그림카드",teacher:"선생님 설정"};
const byId=id=>data.cards.find(c=>c.id===id);
const visible=()=>data.cards.filter(c=>!c.hidden);
const playable=()=>visible().filter(c=>c.level<=data.settings.level&&!data.settings.excluded.includes(c.id));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const controlIcons={
 back:"next",home:"home","go:cards":"cards","go:teacher":"settings",
 detectSpeak:"listen",sentenceSpeak:"listen",detectRepeat:"retry",pairRepeat:"retry",magicReset:"retry",sentenceReset:"retry",placeReset:"retry",
 detectNext:"next",pairNext:"next",magicNext:"next",secretNext:"next",placeNext:"next",cardNext:"next",cardPrev:"next"
};
const button=(label,action,attrs="")=>{
 const icon=controlIcons[action];
 const mark=icon?`<img class="control-icon" src="images/ui-${icon}.webp" alt="" width="24" height="24" draggable="false">`:"";
 return `<button type="button" data-do="${action}" ${attrs}>${mark}<span>${esc(label)}</span></button>`;
};
const pic=(c,cls="picture",alt=c.word)=>`<img class="${cls}" src="${esc(c.image)}" alt="${esc(alt)}" draggable="false">`;
const card=(c,label=c.word,action="pick",attrs="")=>`<button type="button" class="card" data-do="${action}" data-id="${esc(c.id)}" ${attrs}>${pic(c,"","")}<span>${esc(label)}</span></button>`;
const grid=html=>`<div class="grid">${html}</div>`;
const alertLine=()=>'<p class="notice caption" id="notice" role="status"></p>';
const tell=s=>{const n=document.querySelector("#notice");if(n)n.textContent=s;};
const newId=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
const random=xs=>xs[Math.floor(Math.random()*xs.length)];
const shuffled=xs=>{const arr=[...xs];if(data.settings.shuffle)for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
const speak=s=>{if(data.settings.voice&&"speechSynthesis" in window&&"SpeechSynthesisUtterance" in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(s);u.lang="ko-KR";speechSynthesis.speak(u);}};
function save(){
  const snapshot=structuredClone(data);
  writeQueue=writeQueue.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{
    if(!db){try{localStorage.setItem("verb-playground",JSON.stringify(snapshot));resolve();}catch(e){reject(e);}return;}
    const tx=db.transaction("state","readwrite");tx.objectStore("state").put(snapshot,"current");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  })).then(()=>{failed=false;const label=document.querySelector("#storage");if(label)label.textContent="이 기기에 저장했어요.";}).catch(()=>{failed=true;const label=document.querySelector("#storage");if(label)label.textContent="저장하지 못했어요. JSON 백업으로 보관해 주세요.";});
  return writeQueue;
}
async function load(){
  try{db=await new Promise((res,rej)=>{const req=indexedDB.open("verb-playground",1);req.onupgradeneeded=()=>req.result.createObjectStore("state");req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});const stored=await new Promise((res,rej)=>{const req=db.transaction("state").objectStore("state").get("current");req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});if(stored)data=stored;}
  catch{db=null;try{const s=localStorage.getItem("verb-playground");if(s)data=JSON.parse(s);}catch{failed=true;}}
  render();
}
function go(next){if(page===next)return;if(page==="teacher")unlocked=false;parents.push(page);page=next;render(true);}
function back(){if(page==="teacher")unlocked=false;page=parents.pop()||"home";render(true);}
function home(){unlocked=false;parents=[];page="home";render(true);}
const launch={home:[["move",5],["find",14],["talk",8]],move:[["magic",2],["secret",11]],find:[["detect",22],["pair",9],["place",23]],talk:[["sentence",15],["train",19]]};
const menuCard=(key,id)=>`<button type="button" class="menu-card" data-do="go:${key}">${pic(original[id],"menu-picture","")}<span>${esc(title[key])}</span><img class="menu-arrow" src="images/ui-next.webp" alt="" width="24" height="24" draggable="false"></button>`;
const intro={home:"그림을 보고, 손과 몸으로 움직여요.",move:"손끝으로 움직이거나 몸으로 표현해요.",find:"그림 속 움직임을 찾아요.",talk:"그림을 골라 문장과 이야기를 만들어요."};
function render(focus=false){
  nav.innerHTML=page==="home"?"":button("이전으로","back")+button("처음으로","home");
  foot.innerHTML='<span id="storage" class="small" role="status">'+(failed?"저장이 어려워요. JSON 백업으로 보관해 주세요.":"")+"</span>";
  let content;
  app.classList.toggle("menu-page",Boolean(launch[page]));
  app.classList.toggle("home-page",page==="home");
  if(launch[page])content=`<p class="menu-intro">${intro[page]}</p><div class="menu-grid" style="--menu-count:${launch[page].length}">${launch[page].map(([key,id])=>menuCard(key,id)).join("")}</div>`;
  else content=views[page]();
  app.innerHTML=`<h1 tabindex="-1">${title[page]}</h1>${content}`;
  if(page==="magic")setupMagic();
  if(focus){window.scrollTo(0,0);app.querySelector("h1").focus({preventScroll:true});}
}
const blank=()=>'<p class="panel">이 놀이에서 사용할 그림카드가 없어요.</p>';
const showPicture=(c,word=true)=>`<div class="featured panel">${pic(c)}${word?`<div class="word">${esc(c.word)}</div>`:""}</div>`;
const options=(xs,value)=>xs.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?"selected":""}>${esc(t)}</option>`).join("");
const select=(key,xs,value,label)=>`<label class="label">${label}<select data-field="${key}">${options(xs,value)}</select></label>`;
const pairIds=[["2","3"],["0","1"],["6","7"],["8","9"],["12","13"]];
const magicSpecs=[
{prop:"crate",bg:0,start:[17,52],end:[69,52],size:[27,35],hint:"상자를 오른쪽으로 밀어 봐요.",act:"상자 밀기"},
{prop:"wagon",bg:0,start:[66,52],end:[15,52],size:[35,34],hint:"수레를 왼쪽으로 당겨 봐요.",act:"수레 당기기"},
{prop:"door",bg:1,start:[7,10],end:[51,10],size:[39,80],hint:"문을 오른쪽으로 밀어 열어 봐요.",act:"문 열기"},
{prop:"door",bg:1,start:[51,10],end:[7,10],size:[39,80],hint:"문을 왼쪽으로 밀어 닫아 봐요.",act:"문 닫기"},
{prop:"cloth",bg:2,start:[12,48],end:[69,48],size:[24,25],hint:"얼룩 위를 천으로 문질러 봐요.",act:"책상 닦기"},
{prop:"cube",bg:3,start:[11,61],end:[57,37],size:[23,27],hint:"블록을 다른 블록 위에 놓아 봐요.",act:"블록 쌓기"},
{prop:"ball",bg:3,start:[38,14],end:[38,56],size:[20,24],hint:"공을 상자 안으로 내려 봐요.",act:"공 넣기"},
{prop:"ball",bg:3,start:[38,56],end:[38,14],size:[20,24],hint:"공을 잡고 위로 꺼내 봐요.",act:"공 꺼내기"}
];
const magicCards=()=>playable().filter(c=>magicSpecs[Number(c.id)]&&/^\d+$/.test(c.id));
const places=[["교실",["23","5","4"]],["놀이터",["10","14","11"]],["공원",["17","16","10"]],["우리 집",["20","21","6"]]];
const actors=["아이가","친구가","선생님이"],objects=[["공을",["14","15"]],["블록을",["5"]],["문을",["2","3"]],["책상을",["4"]],["씨앗을",["16"]]];
const ending={"14":"던져요","15":"굴려요","5":"쌓아요","2":"열어요","3":"닫아요","4":"닦아요","16":"심어요"};
const getByList=(id,list)=>list.find(c=>c.id===id);
const motionCounts={"10":4,"11":4,"12":4,"13":4,"14":4,"18":2,"19":2};
const wordOn=()=>data.settings.words;
const playControls=(...buttons)=>`<div class="play-controls" data-count="${buttons.length}" role="group" aria-label="놀이 조작">${buttons.join("")}</div>`;
const repeatNav=(repeat,next,hint="")=>playControls(...(hint?[hint]:[]),button("다시 해 보기",repeat),button("다음 카드",next,'class="primary"'));
function newDetect(){
 const pool=playable();
 if(!pool.length){session.detect={};return;}
 const prior=session.detect.id;
 const ordered=shuffled(pool);
 const target=data.settings.shuffle?ordered.find(c=>c.id!==prior)||ordered[0]:ordered[(ordered.findIndex(c=>c.id===prior)+1)%ordered.length];
 const neighbors=pairIds.find(p=>p.includes(target.id))||[];
 const others=ordered.filter(c=>c.id!==target.id);
 const similar=others.find(c=>neighbors.includes(c.id))||others.find(c=>c.category===target.category);
 const choices=similar?[target,similar,...others.filter(c=>c!==similar).slice(0,1)]:[target,...others.slice(0,2)];
 session.detect={id:target.id,choices:data.settings.shuffle?shuffled(choices).map(c=>c.id):choices.sort((a,b)=>a.word.localeCompare(b.word,"ko")).map(c=>c.id),selected:null};
}
function newSecret(){
 const s=session.secret,pool=playable();if(!pool.length){s.id=null;return;}
 let eligible=pool.filter(c=>!data.settings.unique||!s.seen.includes(c.id));
 if(!eligible.length){s.seen=[];eligible=pool;}
 const candidates=eligible.length>1?eligible.filter(c=>c.id!==s.id):eligible;
 const picked=data.settings.shuffle?random(candidates):candidates.find(c=>pool.indexOf(c)>pool.findIndex(v=>v.id===s.id))||candidates[0];
 s.id=picked.id;s.seen.push(s.id);s.reveal=false;
}
function newPair(){
 const enabled=new Set(playable().map(c=>c.id));
 const pool=pairIds.filter(p=>p.every(id=>enabled.has(id)));
 if(!pool.length){session.pair={};return;}
 const current=pool.findIndex(p=>p[0]===session.pair.id);
 const pair=pool[(current+1)%pool.length];
 const distractors=shuffled([...enabled].filter(id=>!pair.includes(id))).slice(0,2);
 session.pair={id:pair[0],answer:pair[1],choices:shuffled([pair[1],...distractors]),selected:null};
}
function setMagic(id){session.magic={id,progress:0};}
const views={
 magic(){
  const pool=magicCards();if(!pool.length)return blank();
  if(!getByList(session.magic.id,pool))setMagic(pool[0].id);
  const c=byId(session.magic.id),s=magicSpecs[Number(c.id)];
  return `<p class="caption">${s.hint}</p><div class="featured"><div class="board" id="board"><img src="images/board-${s.bg}.webp" alt="" style="inset:0;width:100%;height:100%;object-fit:fill"><div id="layers"></div><button class="drag" type="button" id="piece" aria-label="${s.act}" data-do="magicStep"><img src="images/${s.prop}.webp" alt=""></button></div><div class="word" id="magicWord" aria-live="polite"></div></div>
  ${playControls(button(s.act,"magicStep",'class="primary"'),button("시범 보기","demo"),button("다시 해 보기","magicReset"),button("다음 카드","magicNext"))}${select("magic",pool.map(x=>[x.id,x.word]),c.id,"다른 동사 고르기")}`;
 },
 secret(){
  const pool=playable();if(!pool.length)return blank();
  const s=session.secret;if(!getByList(s.id,pool))newSecret();
  const c=byId(s.id);
  return '<p class="caption">그림을 보고 몸으로 보여 줘요.</p>'+showPicture(c,s.reveal).replace('alt="'+esc(c.word)+'"','alt="'+(s.reveal?esc(c.word):"몸짓 비밀 그림")+'"')+playControls(button(s.reveal?"낱말 숨기기":"낱말 보기","reveal",'class="primary"'),button("다음 카드","secretNext"));
 },
 detect(){
  const pool=playable();if(!pool.length)return blank();
  const s=session.detect;if(!getByList(s.id,pool)||s.choices.some(id=>!getByList(id,pool)))newDetect();
  const d=session.detect,c=byId(d.id),selected=byId(d.selected);
  return `<p class="caption">어떤 그림일까요? <strong>${esc(c.sentence||c.word)}</strong></p>${grid(d.choices.map(id=>card(byId(id),"이 그림","detectPick",`aria-pressed="${d.selected===id}"`)).join(""))}${selected?showPicture(selected,wordOn())+(motionCounts[selected.id]?playControls(button("움직임 보기","motion",`data-id="${selected.id}"`)):""):""}${alertLine()}${repeatNav("detectRepeat","detectNext",button("힌트 듣기","detectSpeak"))}`;
 },
 pair(){
  const s=session.pair;
  if(!s.id||[s.id,...s.choices].some(id=>!getByList(id,playable())))newPair();
  const p=session.pair;if(!p.id)return blank();
  const source=byId(p.id);
  const hint=p.id==="8"?"한 사람이 건네면, 다른 사람은 어떻게 할까요?":"이 행동과 짝이 되는 그림을 골라요.";
  return `<p class="caption">${hint}</p>${showPicture(source,wordOn())}${grid(p.choices.map(id=>card(byId(id),wordOn()?byId(id).word:"이 그림","pairPick",`aria-pressed="${p.selected===id}"`)).join(""))}${alertLine()}${repeatNav("pairRepeat","pairNext")}`;
 },
 sentence(){
  const s=session.sentence;
  const pool=objects[s.object][1].map(id=>getByList(id,playable())).filter(Boolean);
  if(!pool.some(c=>c.id===s.verb))s.verb=pool[0]?.id??null;
  const c=byId(s.verb);
  const line=c?`${actors[s.actor]} ${objects[s.object][0]} ${ending[c.id]}.`:"다른 물건을 골라 봐요.";
  return `<p class="caption">그림을 고르고 문장을 말해 봐요.</p><div class="row center">${select("actor",actors.map((v,i)=>[i,v]),s.actor,"누가?")}${select("object",objects.map(([v],i)=>[i,v]),s.object,"무엇을?")}</div>
  <p class="caption">어떻게?</p>${pool.length?grid(pool.map(v=>card(v,v.word,"sentencePick",`aria-pressed="${v.id===s.verb}"`)).join("")):""}${c?showPicture(c,false):""}
  <p class="caption" id="sentenceLine">${line}</p>${playControls(button("문장 듣기","sentenceSpeak"),button("다시 해 보기","sentenceReset"))}`;
 },
 train(){
  const t=session.train;
  const list=storyList();
  const pool=playable(), offset=Math.min(t.offset||0,Math.max(0,Math.floor((pool.length-1)/4)*4));
  t.offset=offset;
  return `<p class="caption">그림을 두 장에서 네 장까지 골라요.</p><div class="panel">${list.length?grid(list.map((c,i)=>`<section>${pic(c)}<p>${i+1}. ${esc(c.word)}</p><div class="row">${button("앞으로","trainUp",`data-id="${i}" ${i===0?"disabled":""}`)}${button("빼기","trainRemove",`data-id="${i}"`)}</div></section>`).join("")):"<p>첫 장면을 골라요.</p>"}
  ${list.length<4?`<p>어떤 장면을 넣을까요?</p>${grid(pool.slice(offset,offset+4).map(c=>card(c,c.word,"trainPick",t.ids.includes(c.id)?"disabled":"")).join(""))}${pool.length>4?playControls(button("앞 그림","trainPrev",offset===0?"disabled":""),button("다른 그림","trainNext",offset+4>=pool.length?"disabled":"")):""}`:""}
  <label class="label">우리 이야기<textarea id="storyNote" maxlength="500" placeholder="말한 이야기를 적어요.">${esc(t.note)}</textarea></label>
  ${playControls(button("이야기 저장","trainSave",'class="primary"'),button("PNG 저장","trainPng"),button("새 이야기","trainReset"))}
  ${alertLine()}</div>${data.stories.length?`<details class="panel"><summary>저장한 이야기 보기</summary>${data.stories.map(s=>button(s.cards.map(c=>c.word).join(" → "),"storyLoad",`data-id="${esc(s.id)}"`)).join(" ")}</details>`:""}`;
 },
 place(){
  const s=session.place,[name,ids]=places[s.index];
  const available=ids.map(id=>getByList(id,playable()));
  const c=available[s.selected];
  return `<p class="caption">${name}에서 무엇을 하고 있나요?</p><div class="featured place"><img class="picture" src="images/place-${s.index}.webp" alt="${name}에서 행동하는 아이 세 명"><div class="hotspots">${available.map((v,i)=>v?`<button data-do="placePick" data-id="${i}" aria-pressed="${i===s.selected}"><span>${["왼쪽","가운데","오른쪽"][i]}</span></button>`:"<span></span>").join("")}</div></div>${c?showPicture(c,wordOn())+'<p class="caption">우리 주변에서도 이 행동을 찾아봐요.</p>':""}${playControls(button("다시 찾아보기","placeReset"),button("다음 장소","placeNext"))}`;
 },
 cards(){
  const s=session.cards,cats=[...new Set(visible().map(c=>c.category))];
  const pool=gallery();
  if(s.offset>=pool.length)s.offset=0;
  const cards=pool.slice(s.offset,s.size===0?undefined:s.offset+s.size);
  const show=s.words??wordOn();
  return `<div class="row">${select("category",[["","모든 분류"],...cats.map(v=>[v,v])],s.category,"동사 분류")}${select("size",[[1,"한 장 크게"],[2,"두 장 비교"],[4,"네 장"],[6,"여섯 장"],[0,"전체"]],s.size,"한 화면에")}</div>
  ${playControls(button(show?"낱말 숨기기":"낱말 보이기","cardWords"),button("무작위 카드","cardRandom"),button("크게 보기","fullscreen"))}
  <div class="${s.size===1?"featured":"tiles"}" style="--cols:${s.size===6?3:s.size===1?1:s.size===0?4:2}">${cards.map(c=>card(c,show?c.word:"그림 보기","cardFocus")).join("")}</div>
  ${playControls(button("이전 카드","cardPrev"),button("다음 카드","cardNext"))}
  <details class="panel"><summary>인쇄 및 저장</summary><div class="row">${select("print",[[2,"2장"],[4,"4장"],[6,"6장"],[9,"9장"]],s.print,"A4 한 장에")}${select("printWords",[[1,"그림과 낱말"],[0,"그림만"]],Number(s.printWords),"출력 내용")}${button("A4 인쇄","print")}${button("보이는 카드 PNG","galleryPng")}</div></details>${alertLine()}`;
 },
 teacher(){return teacherView();}
};
function gallery(){const {category}=session.cards;return visible().filter(c=>!category||c.category===category);}
function setupMagic(){
 const c=byId(session.magic.id);if(!c)return;
 const spec=magicSpecs[Number(c.id)],board=document.querySelector("#board"),piece=document.querySelector("#piece");
 if(!board)return;
 const state=session.magic;
 if(spec.prop==="door")piece.querySelector("img").style.objectFit="fill";
 const layers=document.querySelector("#layers");
 const layer=(prop,x,y,w,h,id="")=>`<img id="${id}" src="images/${prop}.webp" alt="" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%">`;
 if(spec.prop==="cloth")layers.innerHTML=layer("stain",39,45,26,24,"stain");
 if(Number(c.id)===5)layers.innerHTML=layer("cube",57,63,23,27);
 if(Number(c.id)===6||Number(c.id)===7)layers.innerHTML=layer("box",26,53,44,42);
 piece.style.width=spec.size[0]+"%";piece.style.height=spec.size[1]+"%";
 let drag=null;
 const moving=(x,y)=>{piece.style.left=x+"%";piece.style.top=y+"%";};
 function paint(){
  const p=state.progress;
  moving(spec.start[0]+(spec.end[0]-spec.start[0])*p,spec.start[1]+(spec.end[1]-spec.start[1])*p);
  if(spec.prop==="cloth")document.querySelector("#stain").style.opacity=1-p;
  if(spec.prop==="ball")piece.style.clipPath=`inset(0 0 ${(Number(c.id)===6?p:1-p)*43}% 0)`;
  document.querySelector("#magicWord").textContent=p>=.99&&wordOn()?c.word:"";
 }
 board.advance=(n)=>{const was=state.progress;state.progress=Math.max(0,Math.min(1,n));paint();if(was<.99&&state.progress>=.99)speak(c.word);};
 piece.addEventListener("pointerdown",event=>{
  if(drag||event.button!==0)return;
  board.demo=null;piece.setPointerCapture(event.pointerId);
  const bounds=board.getBoundingClientRect();
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,p:state.progress,bounds,moved:false};
 });
 piece.addEventListener("pointermove",event=>{
  if(drag?.id!==event.pointerId)return;
  const dx=(event.clientX-drag.x)/drag.bounds.width*100;
  const dy=(event.clientY-drag.y)/drag.bounds.height*100;
  const vx=spec.end[0]-spec.start[0],vy=spec.end[1]-spec.start[1];
  if(Math.hypot(dx,dy)>1)drag.moved=true;
  if(spec.prop==="cloth"){
   const x=Math.max(0,Math.min(76,spec.start[0]+drag.p*57+dx)),y=Math.max(2,Math.min(73,48+dy));
   const distance=Math.hypot((event.clientX-drag.lastX)/drag.bounds.width,(event.clientY-drag.lastY)/drag.bounds.height);
   if(x>20&&x<66&&y>24&&y<65)board.advance(state.progress+distance*3.5);
   moving(x,y);drag.lastX=event.clientX;drag.lastY=event.clientY;
  }else if(Number(c.id)===5){
   const x=Math.max(0,Math.min(77,spec.start[0]+vx*drag.p+dx)),y=Math.max(0,Math.min(73,spec.start[1]+vy*drag.p+dy));
   drag.onTarget=Math.abs(x-spec.end[0])<9&&Math.abs(y-spec.end[1])<10;moving(x,y);
  }else{
   const progress=drag.p+(dx*vx+dy*vy)/(vx*vx+vy*vy);
   board.advance(progress>.95?1:progress);
  }
 });
 const finish=event=>{
  if(drag?.id!==event.pointerId)return;
  if(drag.moved){piece.suppressClick=true;setTimeout(()=>piece.suppressClick=false,320);}
  if(Number(c.id)===5&&drag.moved)board.advance(event.type==="pointerup"&&drag.onTarget?1:drag.p);
  if(spec.prop==="cloth")paint();
  drag=null;
 };
 piece.addEventListener("pointerup",finish);piece.addEventListener("pointercancel",finish);piece.addEventListener("lostpointercapture",finish);
 paint();
}
let editing="", restoreCandidate=null;
function teacherView(){
 if(!unlocked)return `<section class="panel teacher"><p>${data.settings.pin?"선생님 PIN을 입력해 주세요.":"선생님 설정에 사용할 PIN을 정해 주세요."}</p><form id="pinForm"><label class="label">숫자 네 자리<input type="password" name="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required></label>${'<button class="primary">확인</button>'}</form>${alertLine()}</section>`;
 const s=data.settings,c=byId(editing);
 const field=(name,label,value,max=150)=>`<label class="label">${label}<input name="${name}" value="${esc(value)}" maxlength="${max}"></label>`;
 const toggles=[["voice","음성 안내"],["reduce","움직임 줄이기"],["unique","비밀카드 중복 방지"],["shuffle","무작위 출제"],["words","기본 낱말 표시"]];
 return `<div class="teacher"><section class="panel"><h2>놀이 설정</h2><div class="row">${toggles.map(([k,v])=>`<label><input type="checkbox" data-setting="${k}" ${s[k]?"checked":""}> ${v}</label>`).join("")}${select("level",[[1,"쉬운 동사"],[2,"전체 수준"]],s.level,"놀이 난이도")}</div>
 <details><summary>놀이에서 사용할 동사</summary><div class="grid">${data.cards.map(c=>`<label><input type="checkbox" data-use="${esc(c.id)}" ${s.excluded.includes(c.id)?"":"checked"}> ${esc(c.word)}</label>`).join("")}</div></details></section>
 <section class="panel"><h2>동사 카드</h2><div class="row">${select("edit",[["","새 카드"],...data.cards.map(c=>[c.id,c.word+(c.hidden?" (숨김)":"")])],editing,"카드 선택")}${c?button("위로","editUp")+button("아래로","editDown")+button("삭제","editDelete"):""}</div>
 <form id="cardForm">${field("word","동사",c?.word,24)}${field("category","분류",c?.category||"생활 행동",30)}${field("sentence","예시 문장",c?.sentence)}${field("prompt","교사용 발문",c?.prompt)}<label class="label">수준<select name="level">${options([[1,"쉬움"],[2,"확장"]],c?.level||1)}</select></label>
 <label class="label">그림 파일<input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/heic,image/heif"></label><label><input type="checkbox" name="hidden" ${c?.hidden?"checked":""}> 카드 숨기기</label>
 <div class="row"><button class="primary">카드 저장</button></div></form>${c?'<div class="featured">'+pic(c)+'</div>':""}</section>
 <section class="panel"><h2>자료 관리</h2><div class="row">${button("JSON 백업","backup")}${button("기본 설정 복원","defaults")}${button("그림카드 인쇄·PNG","go:cards")}</div>
 <label class="label">백업 파일 선택<input type="file" id="restore" accept=".json,application/json"></label><p class="small" id="backupSummary"></p>${button("선택한 백업 복원","restore",'id="restoreButton" disabled')}</section>${alertLine()}</div>`;
}
const validImage=s=>typeof s==="string"&&(/^images\/card-(?:[0-9]|1[0-9]|2[0-3])\.webp$/.test(s)||/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*$/.test(s));
function validBackup(b){
 const d=b?.data;
 const cardValid=c=>c&&["id","word","category","sentence","prompt"].every(k=>typeof c[k]==="string")&&c.id.length>0&&c.word.trim().length>0&&[1,2].includes(c.level)&&typeof c.hidden==="boolean"&&validImage(c.image);
 return b?.version===1&&d&&Array.isArray(d.cards)&&d.cards.length<=1000&&d.cards.every(cardValid)&&new Set(d.cards.map(c=>c.id)).size===d.cards.length&&Array.isArray(d.stories)&&d.stories.every(s=>typeof s.id==="string"&&typeof s.note==="string"&&Array.isArray(s.cards)&&s.cards.length>=2&&s.cards.length<=4&&s.cards.every(cardValid))&&d.settings&&/^(?:\d{4})?$/.test(d.settings.pin)&&[1,2].includes(d.settings.level)&&["voice","reduce","unique","shuffle","words"].every(k=>typeof d.settings[k]==="boolean")&&Array.isArray(d.settings.excluded)&&d.settings.excluded.every(id=>typeof id==="string");
}
const loadImage=src=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});
async function processImage(file){
 if(/svg/i.test(file.type)||/\.svgz?$/i.test(file.name))throw Error("래스터 사진을 골라 주세요.");
 if(file.size>24*1024*1024)throw Error("24MB보다 작은 사진을 골라 주세요.");
 const src=URL.createObjectURL(file);
 try{
  const im=await loadImage(src),scale=Math.min(1,1200/Math.max(im.width,im.height));
  const canvas=document.createElement("canvas");canvas.width=Math.round(im.width*scale);canvas.height=Math.round(im.height*scale);
  canvas.getContext("2d").drawImage(im,0,0,canvas.width,canvas.height);
  const result=canvas.toDataURL("image/webp",.88);
  if(!validImage(result))throw Error("사진을 다시 골라 주세요.");
  return result;
 }finally{URL.revokeObjectURL(src);}
}
function download(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function backup(){download(new Blob([JSON.stringify({version:1,created:new Date().toISOString(),data},null,2)],{type:"application/json"}),"verb-playground-backup.json");}
function storyList(){return session.train.ids.map(id=>session.train.snapshot?.find(c=>c.id===id)||byId(id)).filter(Boolean);}
function wrap(ctx,text,width){
 const lines=[];let line="";
 for(const ch of text){
  if(ch==="\n"||ctx.measureText(line+ch).width>width){lines.push(line);line=ch==="\n"?"":ch;}
  else line+=ch;
 }
 if(line)lines.push(line);
 return lines;
}
async function png(cards,words,note="",name="verb-cards.png"){
 if(!cards.length){tell("먼저 그림을 골라 주세요.");return;}
 const batch=cards.slice(0,100);
 try{
  await document.fonts.ready;
  const cols=Math.min(batch.length,batch.length>4?3:2),cell=batch.length>30?Math.max(84,Math.floor(3940/Math.ceil(batch.length/3)-45)):batch.length>12?435:740,rows=Math.ceil(batch.length/cols),gap=batch.length>30?10:28;
  const c=document.createElement("canvas"),ctx=c.getContext("2d");
  const labelH=batch.length>30?35:75;
  const w=cols*cell+(cols+1)*gap,h=Math.round(cell*.72)+(words?labelH:20);
  ctx.font="600 34px "+getComputedStyle(document.body).fontFamily;
  const lines=note?wrap(ctx,note,w-2*gap):[];
  c.width=w;c.height=rows*h+(rows+1)*gap+(lines.length?lines.length*49+20:0);
  ctx.fillStyle="#fff8ed";ctx.fillRect(0,0,c.width,c.height);
  const images=await Promise.all(batch.map(card=>loadImage(globalThis.exportImages?.[card.image]||card.image)));
  ctx.font="700 "+(batch.length>30?34:50)+"px "+getComputedStyle(document.body).fontFamily;
  images.forEach((im,i)=>{
   const x=gap+(i%cols)*(cell+gap),y=gap+Math.floor(i/cols)*(h+gap),ih=h-(words?labelH:20);
   ctx.fillStyle="#fff";ctx.fillRect(x,y,cell,h);
   const scale=Math.min(cell/im.width,ih/im.height),iw=im.width*scale,drawH=im.height*scale;
   ctx.drawImage(im,x+(cell-iw)/2,y+(ih-drawH)/2,iw,drawH);
   if(words){ctx.textAlign="center";ctx.fillStyle="#192e40";ctx.fillText(batch[i].word,x+cell/2,y+ih+labelH*.74,cell-18);}
  });
  ctx.font="600 34px "+getComputedStyle(document.body).fontFamily;ctx.textAlign="left";ctx.fillStyle="#192e40";
  lines.forEach((line,i)=>ctx.fillText(line,gap,rows*(h+gap)+gap+32+i*49));
  const blob=await new Promise(resolve=>c.toBlob(resolve,"image/png"));if(!blob)throw Error();
  download(blob,name);
  const n=document.querySelector("#notice");
  if(n){const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.target="_blank";link.rel="noopener";link.textContent="PNG 열기";n.replaceChildren("PNG를 만들었어요. ",link);setTimeout(()=>URL.revokeObjectURL(link.href),300000);}
 }catch{tell("그림을 저장하지 못했어요. 다시 한번 눌러 주세요.");}
}
async function printCards(){
 const list=gallery(),s=session.cards;if(!list.length){tell("먼저 출력할 그림을 골라 주세요.");return;}
 const box=document.querySelector("#printing"),cols=s.print===9?3:s.print===2?1:2;
 const height={2:109,4:106,6:68,9:65}[s.print];let content="";
 for(let i=0;i<list.length;i+=s.print)content+=`<section class="sheet" style="--print-cols:${cols};--print-h:${height}mm">${list.slice(i,i+s.print).map(c=>`<figure>${pic(c,"")}${s.printWords?`<figcaption>${esc(c.word)}</figcaption>`:""}</figure>`).join("")}</section>`;
 box.innerHTML=content;
 await Promise.all([...box.querySelectorAll("img")].map(im=>im.decode().catch(()=>{})));
 window.print();
}
function selectNext(list,id){
 const idx=list.findIndex(c=>c.id===id);
 return list[(idx+1)%list.length];
}
function action(key,id,el){
 if(key.startsWith("go:")){go(key.slice(3));return;}
 if(key==="home"){home();return;}if(key==="back"){back();return;}
 const t=session.train,s=session.cards,m=session.magic,b=document.querySelector("#board");
 switch(key){
  case "magicStep":if(!el.suppressClick&&b){b.demo=null;b.advance(m.progress+.34);}return;
  case "magicReset":setMagic(m.id);break;
  case "magicNext":setMagic(selectNext(magicCards(),m.id).id);break;
  case "demo":{
   if(!b)return;
   if(data.settings.reduce||matchMedia("(prefers-reduced-motion: reduce)").matches){b.advance(1);return;}
   const token={};b.demo=token;const start=performance.now();b.advance(0);
   function step(now){if(!b.isConnected||b.demo!==token)return;b.advance((now-start)/900);if(now-start<900)requestAnimationFrame(step);}
   requestAnimationFrame(step);return;
  }
  case "reveal":session.secret.reveal=!session.secret.reveal;if(session.secret.reveal)speak(byId(session.secret.id).word);break;
  case "secretNext":newSecret();break;
  case "detectSpeak":speak(byId(session.detect.id).sentence);if(!data.settings.voice)tell("선생님 설정에서 음성 안내를 켤 수 있어요.");return;
  case "motion":{
   const im=app.querySelector(".featured img"),count=motionCounts[id],reverse=id==="13";
   const src=i=>`images/motion-${reverse?"12":id}-${reverse?count-1-i:i}.webp`;
   if(!im||im.dataset.playing)return;im.dataset.playing="yes";
   if(data.settings.reduce||matchMedia("(prefers-reduced-motion: reduce)").matches){im.src=src(count-1);delete im.dataset.playing;return;}
   Promise.all(Array.from({length:count},(_,i)=>loadImage(src(i)))).then(()=>{
    if(!im.isConnected)return;
    for(let i=0;i<count;i++)setTimeout(()=>{if(im.isConnected)im.src=src(i);if(i===count-1)delete im.dataset.playing;},i*270);
   }).catch(()=>{delete im.dataset.playing;tell("그림을 다시 열어 주세요.");});return;
  }
  case "detectRepeat":session.detect.selected=null;break;
  case "detectNext":newDetect();break;
  case "pairRepeat":session.pair.selected=null;break;
  case "pairNext":newPair();break;
  case "detectPick":case "pairPick":{
   const isDetect=key==="detectPick",current=isDetect?session.detect:session.pair;
   current.selected=id;const correct=id===(isDetect?current.id:current.answer);
   render();tell(correct?(isDetect?"이 움직임을 찾았어요.":"짝이 되는 그림을 찾았어요."):"그림을 한번 더 살펴봐요.");
   if(isDetect&&correct&&motionCounts[id])action("motion",id,el);
   if(!isDetect&&correct&&current.id==="8")tell("사과를 건넨 친구는 줬어요. 사과를 건네받은 친구는 받았어요.");
   if(correct)speak(byId(id).word);
   app.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
   return;
  }
  case "sentencePick":session.sentence.verb=id;break;
  case "sentenceSpeak":speak(document.querySelector("#sentenceLine").textContent);return;
  case "sentenceReset":session.sentence={actor:0,object:0,verb:null};break;
  case "placePick":session.place.selected=Number(id);break;
  case "placeReset":session.place.selected=null;break;
  case "placeNext":session.place={index:(session.place.index+1)%places.length};break;
  case "trainPick":if(t.ids.length<4&&!t.ids.includes(id))t.ids.push(id);break;
  case "trainPrev":t.offset=Math.max(0,(t.offset||0)-4);break;
  case "trainNext":t.offset=(t.offset||0)+4;break;
  case "trainRemove":t.ids.splice(Number(id),1);break;
  case "trainUp":{const i=Number(id);if(i>0)[t.ids[i-1],t.ids[i]]=[t.ids[i],t.ids[i-1]];break;}
  case "trainReset":if(t.ids.length&&!confirm("지금 만드는 이야기를 비울까요?"))return;session.train={ids:[],note:""};break;
  case "trainSave":{
   const cards=storyList();if(cards.length<2){tell("그림을 두 장 이상 골라 주세요.");return;}
   const item={id:t.savedId||newId(),cards:structuredClone(cards),note:t.note,date:new Date().toISOString()};
   const idx=data.stories.findIndex(v=>v.id===item.id);if(idx===-1)data.stories.unshift(item);else data.stories[idx]=item;t.savedId=item.id;
   save().then(()=>tell(failed?"저장하지 못했어요.":"이야기를 저장했어요."));return;
  }
  case "storyLoad":{const item=data.stories.find(v=>v.id===id);if(item)session.train={ids:item.cards.map(c=>c.id),note:item.note,snapshot:item.cards,savedId:id};break;}
  case "trainPng":{const cards=storyList();if(cards.length<2)tell("그림을 두 장 이상 골라 주세요.");else png(cards,true,t.note,"verb-story.png");return;}
  case "cardWords":s.words=!(s.words??wordOn());break;
  case "cardFocus":s.offset=gallery().findIndex(c=>c.id===id);s.size=1;break;
  case "cardRandom":{const pool=gallery();if(pool.length){s.size=1;s.offset=Math.floor(Math.random()*pool.length);}break;}
  case "cardPrev":s.offset=Math.max(0,s.offset-s.size);break;
  case "cardNext":s.offset=(s.offset+s.size)%Math.max(1,gallery().length);break;
  case "fullscreen":if(document.fullscreenElement)document.exitFullscreen?.();else if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>tell("기기에서 전체 화면을 열 수 없어요."));else{s.size=1;render();}return;
  case "print":printCards();return;
  case "galleryPng":png(gallery().slice(s.offset,s.size?s.offset+s.size:undefined),s.printWords);return;
  case "backup":backup();return;
  case "defaults":if(!confirm("놀이 설정을 기본값으로 되돌릴까요?"))return;data.settings={...base().settings,pin:data.settings.pin};save();break;
  case "editUp":case "editDown":{
   const i=data.cards.findIndex(c=>c.id===editing),j=i+(key==="editUp"?-1:1);
   if(i>=0&&j>=0&&j<data.cards.length){[data.cards[i],data.cards[j]]=[data.cards[j],data.cards[i]];save();}break;
  }
  case "editDelete":if(!byId(editing)||!confirm("이 동사카드를 삭제할까요?"))return;data.cards=data.cards.filter(c=>c.id!==editing);editing="";save();break;
  case "restore":if(!restoreCandidate||!confirm("현재 카드, 이야기, 설정을 백업 내용으로 바꿀까요?"))return;data=restoreCandidate;restoreCandidate=null;editing="";unlocked=false;save();break;
  default:return;
 }
 render();
 const replacement=[...app.querySelectorAll("button[data-do]")].find(b=>b.dataset.do===key&&b.dataset.id===id);
 replacement?.focus({preventScroll:true});
}
document.addEventListener("click",e=>{const el=e.target.closest("button[data-do]");if(el&&!el.disabled)action(el.dataset.do,el.dataset.id,el);});
app.addEventListener("input",e=>{if(e.target.id==="storyNote")session.train.note=e.target.value;});
app.addEventListener("change",async e=>{
 const el=e.target,v=el.value,key=el.dataset.field;
 if(el.dataset.setting){data.settings[el.dataset.setting]=el.checked;save();return;}
 if(el.dataset.use){const xs=new Set(data.settings.excluded);if(el.checked)xs.delete(el.dataset.use);else xs.add(el.dataset.use);data.settings.excluded=[...xs];save();return;}
 if(el.id==="restore"){
  restoreCandidate=null;const summary=document.querySelector("#backupSummary"),btn=document.querySelector("#restoreButton");btn.disabled=true;
  if(!el.files[0]){summary.textContent="";return;}
  try{const file=el.files[0];if(file.size>150*1024*1024)throw Error();const b=JSON.parse(await file.text());if(!validBackup(b))throw Error();if(!el.isConnected||el.files[0]!==file)return;restoreCandidate=b.data;btn.disabled=false;summary.textContent=`카드 ${b.data.cards.length}장, 이야기 ${b.data.stories.length}개. 현재 자료가 필요하면 먼저 JSON 백업을 눌러 주세요.`;}
  catch{summary.textContent="이 앱의 올바른 백업 파일을 골라 주세요.";}return;
 }
 if(key==="magic")setMagic(v);
 if(key==="actor")session.sentence.actor=Number(v);
 if(key==="object")session.sentence.object=Number(v);
 if(key==="category"||key==="size"){session.cards[key]=key==="size"?Number(v):v;session.cards.offset=0;}
 if(key==="print"||key==="printWords"){session.cards[key]=key==="print"?Number(v):v==="1";return;}
 if(key==="edit")editing=v;
 if(key==="level"){data.settings.level=Number(v);save();return;}
 if(key){render();app.querySelector(`select[data-field="${key}"]`)?.focus({preventScroll:true});}
});
app.addEventListener("submit",async e=>{
 e.preventDefault();const form=e.target,f=new FormData(form);
 if(form.id==="pinForm"){
  const pin=String(f.get("pin"));if(!/^\d{4}$/.test(pin))return;
  if(data.settings.pin&&pin!==data.settings.pin){tell("PIN을 다시 확인해 주세요.");return;}
  if(!data.settings.pin){data.settings.pin=pin;save();}
  unlocked=true;restoreCandidate=null;render();return;
 }
 if(form.id!=="cardForm"||!unlocked)return;
 const submit=form.querySelector("button");if(submit.disabled)return;
 submit.disabled=true;const old=byId(editing);
 try{
  const word=String(f.get("word")).trim(),category=String(f.get("category")).trim();
  if(!word||!category)throw Error("동사와 분류를 적어 주세요.");
  const file=f.get("image");
  let image=old?.image;
  if(file?.size){try{image=await processImage(file);}catch{throw Error("사진을 열 수 없어요. PNG, JPG 또는 WebP 사진을 골라 주세요.");}}
  if(!form.isConnected||!unlocked)return;
  if(!image)throw Error("동사 그림을 골라 주세요.");
  const c={id:old?.id||newId(),word,category,sentence:String(f.get("sentence")).trim(),prompt:String(f.get("prompt")).trim(),level:Number(f.get("level")),hidden:f.has("hidden"),image};
  if(old)data.cards[data.cards.indexOf(old)]=c;else data.cards.push(c);
  editing=c.id;render();await save();if(page==="teacher")tell(failed?"저장하지 못했어요.":"카드를 저장했어요.");
 }catch(err){tell(err.message);}finally{submit.disabled=false;}
});
load();
