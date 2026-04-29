// ==================== 多選 ====================
function enterMultiSel() {
  multiSelMode=true;selectedIds={};
  g('selectBar').classList.add('open');
  ['dp','fp','ap'].forEach(p=>g(p).classList.remove('open'));
  syncSidePanelState();
  updateSelBar();
  render();
}
function exitMultiSel() { multiSelMode=false;selectedIds={};g('selectBar').classList.remove('open');render(); }
function updateSelBar() { const cnt=Object.keys(selectedIds).length;g('selectCount').textContent=`已選 ${cnt} 筆`;g('selDeleteBtn').disabled=cnt===0;g('selDeleteBtn').style.opacity=cnt===0?'0.4':'1'; }
function toggleCardSelect(id) { selectedIds[id]?delete selectedIds[id]:selectedIds[id]=true;updateSelBar();const c=g('grid').querySelector(`.card[data-id="${id}"]`);if(c){if(selectedIds[id]){c.classList.add('selected');c.querySelector('.sel-check').textContent='✓';}else{c.classList.remove('selected');c.querySelector('.sel-check').textContent='';}} }
function selectAll() {
  const cards=[...g('grid').querySelectorAll('.card')];
  const cardIds=cards.map(c=>parseInt(c.dataset.id));
  const allCurrentPageSelected=cardIds.length>0&&cardIds.every(id=>selectedIds[id]);
  if(allCurrentPageSelected) cardIds.forEach(id=>delete selectedIds[id]);
  else cardIds.forEach(id=>{selectedIds[id]=true;});
  updateSelBar();
  render();
}
async function copySelectedNotes(){
  const ids=Object.keys(selectedIds).map(Number).filter(id=>selectedIds[id]);
  if(!ids.length){showToast('請先選擇筆記');return;}
  const text=ids.map(id=>{
    const n=noteById(id);
    return n?`${n.title}\nQ: ${n.question||''}\nA: ${n.answer||''}\nApplication: ${n.application||''}\n${n.body||''}\n${n.detail||''}`:'';
  }).filter(Boolean).join('\n\n----------------\n\n');
  try{
    await navigator.clipboard.writeText(text);
    showToast(`已複製 ${ids.length} 筆`);
  }catch(e){showToast('複製失敗');}
}
function deleteSelected() {
  const ids=Object.keys(selectedIds);
  if(!ids.length) return;
  if(!confirm(`確定刪除這 ${ids.length} 筆筆記？可到回收區復原（保留 5 天）。`)) return;
  const removed=removeNotesToRecycle(ids.map(Number));
  const recycleId=recycleBin[0]?.id;
  saveData();
  renderArchivePanel();
  exitMultiSel();
  showActionToast(`已移至回收區 ${removed} 筆`,recycleId?()=>restoreRecycleItem(recycleId):null);
}
function bindCardInteractions(card,id){
  const checkBtn=card.querySelector('.sel-check');
  card.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',e=>{
    e.stopPropagation();
    const action=btn.dataset.action;
    if(action==='duplicate') duplicateNote(id);
    else if(action==='copy') copyNoteToClipboard(id);
    else if(action==='delete') deleteNote(id);
  }));
  let pressTimer=null;
  let longPressed=false;
  let startX=0,startY=0,trackingSwipe=false;
  const closeRadialMenu=()=>touchRadialMenu?.classList.remove('open');
  const openRadialMenu=(x,y)=>{
    if(!('ontouchstart' in window)) return;
    if(!touchRadialMenu){
      touchRadialMenu=document.createElement('div');
      touchRadialMenu.className='touch-radial-menu';
      touchRadialMenu.innerHTML='<button data-radial="edit">✏️ 編輯</button><button data-radial="copy">📋 複製</button><button data-radial="duplicate">📄 副本</button><button data-radial="delete">🗑️ 刪除</button><button data-radial="select">☑️ 多選</button>';
      document.body.appendChild(touchRadialMenu);
      touchRadialMenu.querySelectorAll('[data-radial]').forEach(btn=>btn.addEventListener('click',()=>{
        const action=btn.dataset.radial;
        if(action==='edit'){openId=id;openForm(true);}
        if(action==='copy') copyNoteToClipboard(id);
        if(action==='duplicate') duplicateNote(id);
        if(action==='delete') deleteNote(id);
        if(action==='select'){enterMultiSel();selectedIds[id]=true;updateSelBar();render();}
        closeRadialMenu();
      }));
      document.addEventListener('click',closeRadialMenu,{passive:true});
    }
    touchRadialMenu.style.left=`${Math.max(8,Math.min(window.innerWidth-220,x-100))}px`;
    touchRadialMenu.style.top=`${Math.max(8,y-56)}px`;
    touchRadialMenu.classList.add('open');
  };
  const clearPress=()=>{ if(pressTimer){clearTimeout(pressTimer);pressTimer=null;} };
  const triggerLongPress=()=>{
    if(multiSelMode) return;
    longPressed=true;
    openRadialMenu(startX||window.innerWidth/2,startY||120);
  };
  card.addEventListener('mousedown',()=>{longPressed=false;clearPress();pressTimer=setTimeout(triggerLongPress,450);});
  card.addEventListener('touchstart',e=>{
    const t=e.touches&&e.touches[0];
    if(t){startX=t.clientX;startY=t.clientY;trackingSwipe=true;}
    longPressed=false;clearPress();pressTimer=setTimeout(triggerLongPress,420);
  },{passive:true});
  card.addEventListener('touchmove',e=>{
    if(!trackingSwipe) return;
    const t=e.touches&&e.touches[0];if(!t) return;
    const dx=t.clientX-startX,dy=t.clientY-startY;
    if(Math.abs(dy)>26){trackingSwipe=false;card.classList.remove('swipe-left','swipe-right');return;}
    if(Math.abs(dx)>16){
      clearPress();
      card.classList.toggle('swipe-left',dx<-26);
      card.classList.toggle('swipe-right',dx>26);
    }
  },{passive:true});
  card.addEventListener('mouseup',clearPress);
  card.addEventListener('mouseleave',clearPress);
  card.addEventListener('touchend',e=>{
    clearPress();
    const changed=e.changedTouches&&e.changedTouches[0];
    const dx=changed?changed.clientX-startX:0;
    if(card.classList.contains('swipe-left')&&dx<-72){card.classList.remove('swipe-left');card.dataset.touchActionTaken='1';deleteNote(id);return;}
    if(card.classList.contains('swipe-right')&&dx>72){card.classList.remove('swipe-right');card.dataset.touchActionTaken='1';duplicateNote(id);return;}
    card.classList.remove('swipe-left','swipe-right');
    trackingSwipe=false;
  },{passive:true});
  card.addEventListener('touchcancel',clearPress,{passive:true});
  if(checkBtn){
    const stopCardEvent=(e)=>{e.stopPropagation();};
    checkBtn.addEventListener('mousedown',stopCardEvent);
    checkBtn.addEventListener('touchstart',stopCardEvent,{passive:true});
    checkBtn.addEventListener('click',e=>{
      e.stopPropagation();
      if(!multiSelMode) return;
      toggleCardSelect(id);
    });
  }
  card.addEventListener('click',()=>{
    if(card.dataset.touchActionTaken==='1'){card.dataset.touchActionTaken='0';return;}
    if(longPressed) return;
    const now=Date.now();
    if(('ontouchstart' in window)&&lastCardTap.id===id&&(now-lastCardTap.time)<360){
      openId=id;
      openForm(true);
      lastCardTap={id:0,time:0};
      return;
    }
    if('ontouchstart' in window){
      openId=id;
      openNote(id);
      lastCardTap={id,time:now};
      return;
    }
    openId=id;
    openForm(true);
  });
}
