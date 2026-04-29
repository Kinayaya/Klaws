// ==================== 體系圖 ====================
function initNodePos() { const canvas=g('mapCanvas');mapW=canvas.offsetWidth||800;mapH=canvas.offsetHeight||500;const cx=mapW/2,cy=mapH/2,r=Math.min(mapW,mapH)*.44;notes.forEach((n,i)=>{if(!nodePos[n.id]){const angle=(i/notes.length)*2*Math.PI;nodePos[n.id]={x:cx+r*Math.cos(angle),y:cy+r*Math.sin(angle)};}}); }
function getNodeRadius(id){ return MAP_NODE_RADIUS_DEFAULT; }
function clampNodeToCanvas(id){
  if(!nodePos[id])return;
  const box=getMapCardBox(id);
  const pad=12,halfW=box.width/2+pad,halfH=box.height/2+pad;
  nodePos[id].x=Math.max(halfW,Math.min(mapW-halfW,nodePos[id].x));
  if(mapVerticalScrollMode) nodePos[id].y=Math.max(halfH,nodePos[id].y);
  else nodePos[id].y=Math.max(halfH,Math.min(mapH-halfH,nodePos[id].y));
}
function pointToSegmentDistance(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,len2=dx*dx+dy*dy;
  if(!len2) return {dist:Math.hypot(px-x1,py-y1),nx:0,ny:0};
  let t=((px-x1)*dx+(py-y1)*dy)/len2;t=Math.max(0,Math.min(1,t));
  const cx=x1+t*dx,cy=y1+t*dy,vx=px-cx,vy=py-cy,d=Math.hypot(vx,vy);
  if(d<.001){const nx=-dy/Math.sqrt(len2),ny=dx/Math.sqrt(len2);return{dist:0,nx,ny};}
  return{dist:d,nx:vx/d,ny:vy/d};
}
function pushNodeOffLinks(nodeId,visLinks,pad=0){
  const pos=nodePos[nodeId];if(!pos)return false;
  const need=getNodeRadius(nodeId)+12+pad;let moved=false;
  visLinks.forEach(lk=>{if(lk.from===nodeId||lk.to===nodeId)return;const a=nodePos[lk.from],b=nodePos[lk.to];if(!a||!b)return;const hit=pointToSegmentDistance(pos.x,pos.y,a.x,a.y,b.x,b.y);if(hit.dist<need){const push=need-hit.dist+.8;pos.x+=hit.nx*push;pos.y+=hit.ny*push;clampNodeToCanvas(nodeId);moved=true;}});
  return moved;
}
const chapterIndexMap = () => {
  const map={};
  chapters.forEach((ch,idx)=>{ if(ch&&ch.key) map[ch.key]=idx; });
  return map;
};
const sectionIndexMap = () => {
  const map={};
  sections.forEach((sec,idx)=>{ if(sec&&sec.key) map[sec.key]=idx; });
  return map;
};
const nodePreferredRank = (nodeId,chIdxMap,secIdxMap) => {
  const note=mapNodeById(nodeId)||{};
  const chIdxs=noteChapters(note).map(key=>chIdxMap[key]).filter(idx=>Number.isFinite(idx));
  const secIdxs=noteSections(note).map(key=>secIdxMap[key]).filter(idx=>Number.isFinite(idx));
  const minChIdx=chIdxs.length?Math.min(...chIdxs):9999;
  const minSecIdx=secIdxs.length?Math.min(...secIdxs):9999;
  const title=safeStr(note.title).trim();
  return {minChIdx,minSecIdx,title,nodeId};
};
function forceLayout() {
  const canvas=g('mapCanvas');mapW=canvas.offsetWidth||800;mapH=canvas.offsetHeight||600;
  clearMapCardBoxCache();
  const layoutNotes=visibleNotes(),visIds={};layoutNotes.forEach(n=>visIds[n.id]=true);
  const visLinks=visibleLinks(visIds),n2=layoutNotes.length;if(!n2)return;
  const scopedCenterId=getMapCenterFromScopes();
  const hasStoredCenter=!!scopedCenterId&&!!mapNodeById(scopedCenterId);
  if(!hasStoredCenter&&!mapCenterNodeId){
    const linkCount={};layoutNotes.forEach(n=>linkCount[n.id]=0);visLinks.forEach(lk=>{linkCount[lk.from]=(linkCount[lk.from]||0)+1;linkCount[lk.to]=(linkCount[lk.to]||0)+1;});
    setMapCenterForCurrentScope(layoutNotes.reduce((max,n)=>linkCount[n.id]>linkCount[max.id]?n:max,layoutNotes[0]).id,{updateGlobal:true});
  }
  const activeCenterId=getMapCenterFromScopes();
  const layoutCenterNodeId=visIds[activeCenterId]?activeCenterId:(()=>{
    const linkCount={};layoutNotes.forEach(n=>linkCount[n.id]=0);visLinks.forEach(lk=>{linkCount[lk.from]=(linkCount[lk.from]||0)+1;linkCount[lk.to]=(linkCount[lk.to]||0)+1;});
    return layoutNotes.reduce((max,n)=>linkCount[n.id]>linkCount[max.id]?n:max,layoutNotes[0]).id;
  })();
  const laneCfg=getLaneConfig(),laneCount=laneCfg.names.length;
  const LANE_CARD_GAP_Y=20,TOP_PAD=72,BOT_PAD=40;
  const laneLeft=Math.max(80,mapW*.1),laneRight=Math.min(mapW-80,mapW*.9);
  const laneGapX=laneCount>1?(laneRight-laneLeft)/(laneCount-1):0;
  const chIdxMap=chapterIndexMap(),secIdxMap=sectionIndexMap();
  const adj={};layoutNotes.forEach(n=>adj[n.id]=[]);visLinks.forEach(lk=>{if(adj[lk.from])adj[lk.from].push(lk.to);if(adj[lk.to])adj[lk.to].push(lk.from);});
  const layers={},visited=new Set(),queue=[layoutCenterNodeId];layers[layoutCenterNodeId]=0;visited.add(layoutCenterNodeId);
  while(queue.length){const current=queue.shift(),cl=layers[current];(adj[current]||[]).forEach(neighbor=>{if(!visited.has(neighbor)){visited.add(neighbor);layers[neighbor]=cl+1;queue.push(neighbor);}});}
  const connectedMaxLayer=Object.values(layers).reduce((m,v)=>Math.max(m,v),0);
  layoutNotes.forEach(n=>{if(!visited.has(n.id))layers[n.id]=connectedMaxLayer+1;});
  const laneGroups={};Object.keys(layers).forEach(nodeId=>{const lane=Math.max(0,Math.min(laneCount-1,layers[nodeId]||0));if(!laneGroups[lane])laneGroups[lane]=[];laneGroups[lane].push(parseInt(nodeId,10));});
  const incomingParents={};
  visLinks.forEach(lk=>{
    const childLane=layers[lk.to],parentLane=layers[lk.from];
    if(childLane===undefined||parentLane===undefined||childLane<=parentLane) return;
    if(!incomingParents[lk.to]) incomingParents[lk.to]=[];
    incomingParents[lk.to].push(lk.from);
  });
  const byPreferredRank=(a,b)=>{
    const ra=nodePreferredRank(a,chIdxMap,secIdxMap),rb=nodePreferredRank(b,chIdxMap,secIdxMap);
    return ra.minChIdx-rb.minChIdx||ra.minSecIdx-rb.minSecIdx||ra.title.localeCompare(rb.title,'zh')||ra.nodeId-rb.nodeId;
  };
  const laneOrder={};Object.keys(laneGroups).forEach(lane=>{laneOrder[lane]=laneGroups[lane].slice().sort((a,b)=>byPreferredRank(a,b)||(adj[b]||[]).length-(adj[a]||[]).length||a-b);});
  for(let pass=0;pass<6;pass++){
    for(let lane=1;lane<laneCount;lane++){
      const arr=laneOrder[lane]||[],prev=laneOrder[lane-1]||[],prevIdx={};prev.forEach((id,idx)=>prevIdx[id]=idx);
      arr.sort((a,b)=>{
        const an=(adj[a]||[]).map(id=>prevIdx[id]).filter(v=>v!==undefined);
        const bn=(adj[b]||[]).map(id=>prevIdx[id]).filter(v=>v!==undefined);
        const am=an.length?an.reduce((s,v)=>s+v,0)/an.length:9999,bm=bn.length?bn.reduce((s,v)=>s+v,0)/bn.length:9999;
        return am-bm||byPreferredRank(a,b)||a-b;
      });
    }
  }
  mapNodeMeta={};
  for(let lane=0;lane<laneCount;lane++){
    const arr=laneOrder[lane]||[],x=laneLeft+lane*laneGapX;
    const boxes=arr.map(nodeId=>getMapCardBox(nodeId));
    const totalCardsHeight=boxes.reduce((sum,box)=>sum+box.height,0);
    const totalGap=Math.max(0,(arr.length-1)*LANE_CARD_GAP_Y);
    const requiredHeight=totalCardsHeight+totalGap;
    const usableHeight=mapVerticalScrollMode?Math.max(120,requiredHeight):Math.max(120,mapH-TOP_PAD-BOT_PAD);
    let yCursor=TOP_PAD+(mapVerticalScrollMode?0:(requiredHeight<usableHeight?(usableHeight-requiredHeight)/2:0));
    arr.forEach((nodeId,idx)=>{
      const cardH=boxes[idx].height;
      const y=yCursor+cardH/2;
      nodePos[nodeId]={x,y};
      mapNodeMeta[nodeId]={lane,order:idx};
      clampNodeToCanvas(nodeId);
      yCursor+=cardH+LANE_CARD_GAP_Y;
    });
  }
  const laneNodeIds={};
  Object.keys(mapNodeMeta).forEach(nodeId=>{
    const lane=mapNodeMeta[nodeId]&&mapNodeMeta[nodeId].lane;
    if(!Number.isFinite(lane)) return;
    if(!laneNodeIds[lane]) laneNodeIds[lane]=[];
    laneNodeIds[lane].push(parseInt(nodeId,10));
  });
  for(let pass=0;pass<2;pass++){
    for(let lane=1;lane<laneCount;lane++){
      const ids=(laneNodeIds[lane]||[]).slice().sort((a,b)=>nodePos[a].y-nodePos[b].y);
      if(!ids.length) continue;
      ids.forEach(nodeId=>{
        const parents=(incomingParents[nodeId]||[]).filter(pid=>nodePos[pid]);
        if(!parents.length) return;
        const targetY=parents.reduce((sum,pid)=>sum+nodePos[pid].y,0)/parents.length;
        nodePos[nodeId].y=nodePos[nodeId].y*0.45+targetY*0.55;
      });
      ids.sort((a,b)=>nodePos[a].y-nodePos[b].y);
      let prevBottom=TOP_PAD-10;
      ids.forEach(nodeId=>{
        const box=getMapCardBox(nodeId),halfH=box.height/2,minY=prevBottom+LANE_CARD_GAP_Y+halfH;
        if(nodePos[nodeId].y<minY) nodePos[nodeId].y=minY;
        prevBottom=nodePos[nodeId].y+halfH;
      });
      if(!mapVerticalScrollMode){
        let nextTop=mapH-BOT_PAD+10;
        for(let i=ids.length-1;i>=0;i--){
          const nodeId=ids[i],box=getMapCardBox(nodeId),halfH=box.height/2,maxY=nextTop-LANE_CARD_GAP_Y-halfH;
          if(nodePos[nodeId].y>maxY) nodePos[nodeId].y=maxY;
          nextTop=nodePos[nodeId].y-halfH;
        }
      }
      ids.forEach(nodeId=>clampNodeToCanvas(nodeId));
    }
  }
  saveDataDeferred();
}
function visibleLinks(visIds){ return links.filter(lk=>visIds[lk.from]&&visIds[lk.to]); }
function getDescendantIds(rootId,limitIds=null){
  const seen=new Set([rootId]),queue=[rootId];
  while(queue.length){
    const current=queue.shift();
    const assigned=getMapSubpageAssignedIds(current);
    assigned.forEach(nextId=>{
      if(limitIds&& !limitIds[nextId]) return;
      if(seen.has(nextId)) return;
      seen.add(nextId);
      queue.push(nextId);
    });
  }
  return seen;
}
function updateMapPagePath(){
  const el=g('mapPagePath'); if(!el) return;
  if(!mapPageStack.length){el.textContent='主頁';return;}
  const labels=mapPageStack.map(id=>mapNodeById(id)?.title||`節點#${id}`);
  el.textContent=`主頁 / ${labels.join(' / ')}`;
}
function enterMapSubpage(rootId){
  if(!mapNodeById(rootId)) return;
  if(mapPageStack[mapPageStack.length-1]===rootId) return;
  mapPageStack.push(rootId);
  setMapCenterForCurrentScope(rootId);
  nodePos={};
  updateMapPagePath();
  forceLayout();
  drawMap();
  saveData();
  saveLastViewState();
}
function leaveMapSubpage(){
  if(!mapPageStack.length) return false;
  mapPageStack.pop();
  nodePos={};
  updateMapPagePath();
  forceLayout();
  drawMap();
  saveData();
  saveLastViewState();
  return true;
}
function removeRootFromPageStack(rootId){
  const idx=mapPageStack.indexOf(rootId);
  if(idx===-1) return false;
  mapPageStack=mapPageStack.slice(0,idx);
  return true;
}
function buildLinkCurveOffsets(visLinks){
  if(MAP_LIGHT_BUNDLING_STRENGTH<=0) return {};
  const groups={},spacing=12,laneOrder2=idx=>idx===0?0:(idx%2===1?(idx+1)/2:-(idx/2));
  visLinks.forEach(lk=>{
    const fp=nodePos[lk.from],tp=nodePos[lk.to];if(!fp||!tp)return;
    const dx=tp.x-fp.x,dy=tp.y-fp.y,ang=Math.atan2(dy,dx);
    const key=`${lk.from}_${Math.round((ang+Math.PI)/(Math.PI/10))}`;
    if(!groups[key])groups[key]=[];groups[key].push(lk);
  });
  const offsets={};
  Object.values(groups).forEach(arr=>{
    arr.sort((a,b)=>{
      const ta=nodePos[a.to],tb=nodePos[b.to];
      if(!ta||!tb) return a.id-b.id;
      return ta.y-tb.y||ta.x-tb.x||a.id-b.id;
    });
    arr.forEach((lk,idx)=>{offsets[lk.id]=laneOrder2(idx)*spacing;});
  });
  return offsets;
}
function calcLinkPath(lk,opt={}){
  const fp=nodePos[lk.from],tp=nodePos[lk.to];if(!fp||!tp)return null;
  const dx=tp.x-fp.x,dy=tp.y-fp.y,dist=Math.sqrt(dx*dx+dy*dy)||1,nx=dx/dist,ny=dy/dist;
  const px=-ny,py=nx;
  const fromBox=getMapCardBox(lk.from),toBox=getMapCardBox(lk.to);
  const edgeDistance=(box,dirX,dirY)=>{
    const halfW=Math.max(8,(box.width||0)/2),halfH=Math.max(8,(box.height||0)/2);
    const tx=Math.abs(dirX)<1e-4?Infinity:halfW/Math.abs(dirX);
    const ty=Math.abs(dirY)<1e-4?Infinity:halfH/Math.abs(dirY);
    return Math.min(tx,ty);
  };
  const sourceOffset=edgeDistance(fromBox,nx,ny)+1.5;
  const targetOffset=edgeDistance(toBox,nx,ny);
  const ARROW_TIP_ADVANCE=1.35;
  const x1=fp.x+nx*sourceOffset,y1=fp.y+ny*sourceOffset;
  const x2=tp.x-nx*(targetOffset+ARROW_TIP_ADVANCE),y2=tp.y-ny*(targetOffset+ARROW_TIP_ADVANCE);
  const laneOffset=linkCurveOffsets[lk.id]||0;
  const unbundled=!!opt.unbundled;
  const splitOffset=unbundled?0:Math.max(-26,Math.min(26,laneOffset*MAP_LIGHT_BUNDLING_STRENGTH));
  const trunkLen=Math.max(22,Math.min(68,dist*0.5));
  const c1x=x1+nx*trunkLen, c1y=y1+ny*trunkLen;
  const c2x=x2-nx*Math.max(20,Math.min(52,dist*0.22))+px*splitOffset;
  const c2y=y2-ny*Math.max(20,Math.min(52,dist*0.22))+py*splitOffset;
  const d=`M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`;
  return {d,c2x,c2y,x2,y2};
}
function moveNodeEl(id,x,y){
  const grp=nodeEls[id];if(!grp)return;
  const card=grp.querySelector('rect.node-card');
  const info=getMapCardBox(id);
  const halfW=info.width/2,halfH=info.height/2;
  if(card){card.setAttribute('x',String(x-halfW));card.setAttribute('y',String(y-halfH));}
  const cardBody=grp.querySelector('foreignObject.node-card-body');
  if(cardBody){cardBody.setAttribute('x',String(x-halfW));cardBody.setAttribute('y',String(y-halfH));cardBody.setAttribute('width',String(info.width));cardBody.setAttribute('height',String(info.height));}
  const foldBtn=grp.querySelector('circle.node-fold-btn');
  if(foldBtn){
    const foldBtnR=parseFloat(foldBtn.getAttribute('r')||'9')||9;
    foldBtn.setAttribute('cx',String(x+halfW-foldBtnR-5));
    foldBtn.setAttribute('cy',String(y-halfH+foldBtnR+5));
  }
  const foldSign=grp.querySelector('text.node-fold-sign');
  if(foldSign&&foldBtn){
    const cx=parseFloat(foldBtn.getAttribute('cx')||String(x+halfW-12))||x+halfW-12;
    const cy=parseFloat(foldBtn.getAttribute('cy')||String(y-halfH+12))||y-halfH+12;
    foldSign.setAttribute('x',String(cx));foldSign.setAttribute('y',String(cy+1));
  }
  const subEnterBtn=grp.querySelector('circle.node-sub-enter-btn');
  const subEnterSign=grp.querySelector('text.node-sub-enter-sign');
  if(subEnterBtn){
    const subEnterBtnR=parseFloat(subEnterBtn.getAttribute('r')||'9')||9;
    const subEnterX=x-halfW+subEnterBtnR+6;
    const subEnterY=y+halfH-subEnterBtnR-6;
    subEnterBtn.setAttribute('cx',String(subEnterX));
    subEnterBtn.setAttribute('cy',String(subEnterY));
    if(subEnterSign){
      subEnterSign.setAttribute('x',String(subEnterX));
      subEnterSign.setAttribute('y',String(subEnterY+1));
    }
  }
}
function redrawLines(affectedId){
  const visIds={};visibleNotes().forEach(n=>visIds[n.id]=true);
  linkCurveOffsets=buildLinkCurveOffsets(visibleLinks(visIds));
  const toUpdateIds=affectedId!==undefined?(nodeLinksIndex[affectedId]||[]):Object.keys(linkElsMap).map(Number);
  toUpdateIds.forEach(linkId=>{
    const els=linkElsMap[linkId],lk=links.find(x=>x.id===linkId);if(!els||!els.p||!lk)return;
    if(!visIds[lk.from]||!visIds[lk.to])return;
    const unbundled=!!mapFocusedNodeId&&(lk.from===mapFocusedNodeId||lk.to===mapFocusedNodeId);
    const c=calcLinkPath(lk,{unbundled});if(!c)return;
    els.p.setAttribute('d',c.d);
    if(els.a) els.a.setAttribute('d',`M${c.c2x},${c.c2y} L${c.x2},${c.y2}`);
  });
}
function mapNodeMatchesTaxonomyFilter(n){
  const subs=noteSubjects(n),chs=noteChapters(n),secs=noteSections(n);
  const chapterMatch=mapFilter.chapter==='all'?true:(mapFilter.chapter==='none'?!chs.length:chs.includes(mapFilter.chapter));
  const sectionMatch=mapFilter.section==='all'?true:(mapFilter.section==='none'?!secs.length:secs.includes(mapFilter.section));
  return (mapFilter.sub==='all'||subs.includes(mapFilter.sub))&&chapterMatch&&sectionMatch;
}
function visibleNotes(){
  const q=(mapFilter.q||'').toLowerCase(),linkedIds={};
  const pageAssignedIds=getMapPageAssignedIds();
  if(mapLinkedOnly)links.forEach(l=>{linkedIds[l.from]=true;linkedIds[l.to]=true;});
  const baseFiltered=notes.filter(n=>{
    if(!pageAssignedIds.has(n.id)) return false;
    const subs=noteSubjects(n),chs=noteChapters(n),secs=noteSections(n);
    return mapNodeMatchesTaxonomyFilter(n)
      &&(!q||`${n.title}${subs.join('')}${chs.join('')}${secs.join('')}${noteTags(n).join('')}`.toLowerCase().includes(q));
  });
  const relayFiltered=mapRelays.filter(n=>{
    if(!pageAssignedIds.has(n.id)) return false;
    return mapNodeMatchesTaxonomyFilter(n)&&relayMatchesSearch(n,q);
  });
  const shouldExpandLinked=mapHasTaxonomyFilter();
  let filtered=baseFiltered, relayVisible=relayFiltered;
  if(shouldExpandLinked){
    const seedIds=new Set([...baseFiltered,...relayFiltered].map(n=>n.id));
    const expandedIds=new Set(seedIds);
    links.forEach(lk=>{
      const fromInSeed=seedIds.has(lk.from),toInSeed=seedIds.has(lk.to);
      if(fromInSeed&&!toInSeed&&pageAssignedIds.has(lk.to)) expandedIds.add(lk.to);
      if(toInSeed&&!fromInSeed&&pageAssignedIds.has(lk.from)) expandedIds.add(lk.from);
    });
    filtered=notes.filter(n=>expandedIds.has(n.id)&&noteMatchesSearch(n,q));
    relayVisible=mapRelays.filter(n=>expandedIds.has(n.id)&&relayMatchesSearch(n,q));
  }
  let base=[...filtered,...relayVisible].filter(n=>!mapLinkedOnly||isRelayNode(n)||linkedIds[n.id]);
  if(mapLinkedOnly&&!base.length&&filtered.length){
    mapLinkedOnly=false;setMapLinkedOnlyBtnStyle();
    showToast('目前沒有關聯節點，已自動顯示全部節點');saveDataDeferred();base=filtered;
  }
  const baseIds={};base.forEach(n=>baseIds[n.id]=true);
  if(base.length){
    const collapsedNodes=getCollapsedNodesForCurrentContext();
    const hiddenByCollapse={},stack=[];
    Object.keys(collapsedNodes).forEach(key=>{
      const id=parseInt(key,10);
      if(collapsedNodes[id]&&baseIds[id]) stack.push(id);
    });
    while(stack.length){
      const current=stack.pop();
      links.forEach(lk=>{
        if(lk.from!==current||!baseIds[lk.to]||hiddenByCollapse[lk.to]) return;
        hiddenByCollapse[lk.to]=true;
        stack.push(lk.to);
      });
    }
    base=base.filter(n=>!hiddenByCollapse[n.id]);
  }
  if(mapDepth==='all'||!base.length)return base;
  const depthBaseIds={};base.forEach(n=>depthBaseIds[n.id]=true);
  const centerId=getMapCenterFromScopes();
  if(!centerId||!depthBaseIds[centerId])return base;
  const maxDepth=parseInt(mapDepth,10);if(!maxDepth)return base;
  const adj={};links.forEach(l=>{if(!depthBaseIds[l.from]||!depthBaseIds[l.to])return;if(!adj[l.from])adj[l.from]=[];if(!adj[l.to])adj[l.to]=[];adj[l.from].push(l.to);adj[l.to].push(l.from);});
  const seen={[centerId]:0},q2=[centerId];
  while(q2.length){const id=q2.shift(),depth=seen[id];if(depth>=maxDepth)continue;(adj[id]||[]).forEach(nid=>{if(seen[nid]===undefined){seen[nid]=depth+1;q2.push(nid);}});}
  return base.filter(n=>seen[n.id]!==undefined);
}
function createMapRelay(){
  formMode='relay';
  const subpageRootId=currentSubpageRootId();
  const subpageRoot=subpageRootId?mapNodeById(subpageRootId):null;
  const defaultSubjects=subpageRoot?noteSubjects(subpageRoot):(mapFilter.sub==='all'?[]:[mapFilter.sub]);
  const defaultChapters=subpageRoot?noteChapters(subpageRoot):((mapFilter.chapter==='all'||mapFilter.chapter==='none')?[]:[mapFilter.chapter]);
  const defaultSections=subpageRoot?noteSections(subpageRoot):((mapFilter.section==='all'||mapFilter.section==='none')?[]:[mapFilter.section]);
  openForm(false);
  const defaultSub=defaultSubjects[0]||'';
  if(defaultSub){
    setSelectedValues('fs2',[defaultSub]);
    syncChapterSelect([defaultSub],defaultChapters.slice(0,1));
    syncSectionSelect(defaultChapters.slice(0,1),defaultSections.slice(0,1),[defaultSub]);
  }
  g('fti').value='新中繼站';
  g('fti')?.focus();
  g('fti')?.select();
}
function notifyHiddenRelaysByFilter(beforeRelayVisibleIds){
  if(!isMapOpen||!(beforeRelayVisibleIds instanceof Set)||!beforeRelayVisibleIds.size) return;
  const afterRelayVisibleIds=new Set(visibleNotes().filter(isRelayNode).map(n=>n.id));
  const hiddenCount=[...beforeRelayVisibleIds].filter(id=>!afterRelayVisibleIds.has(id)).length;
  if(hiddenCount>0) showToast(`有 ${hiddenCount} 個中繼站因篩選被隱藏`);
}
function editMapRelay(id){
  const relay=relayById(id);
  if(!relay) return;
  openId=id;
  formMode='relay';
  openForm(true);
}
function deleteMapRelay(id){
  const relay=relayById(id);
  if(!relay) return;
  if(!confirm(`確定刪除中繼站「${relay.title||'未命名'}」？`)) return;
  if(mapLinkSourceId===id) mapLinkSourceId=null;
  mapRelays=mapRelays.filter(r=>r.id!==id);
  links=links.filter(l=>l.from!==id&&l.to!==id);
  delete nodePos[id];
  delete nodeSizes[id];
  closeMapPopup();
  saveData();
  if(isMapOpen) scheduleMapRedraw(0);
  showToast('已刪除中繼站');
}
function scheduleMapRedraw(ms=60){ if(mapRedrawTimer)clearTimeout(mapRedrawTimer);if(mapTimer)clearTimeout(mapTimer);mapRedrawTimer=setTimeout(()=>drawMap(),ms);mapTimer=mapRedrawTimer; }
function buildMapTreeIndex(visNotes){
  const body=g('mapTreeBody');if(!body)return;
  if(!Array.isArray(visNotes)||!visNotes.length){body.innerHTML='<div class="map-tree-empty">目前沒有可顯示節點。</div>';return;}
  const tree={};
  const chapterOrder={};chapters.forEach((ch,idx)=>{if(ch&&ch.key) chapterOrder[ch.key]=idx;});
  const sectionOrder={};sections.forEach((sec,idx)=>{if(sec&&sec.key) sectionOrder[sec.key]=idx;});
  const chapterRank=key=>key==='none'?Number.MAX_SAFE_INTEGER:(chapterOrder[key]??Number.MAX_SAFE_INTEGER-1);
  const sectionRank=key=>key==='none'?Number.MAX_SAFE_INTEGER:(sectionOrder[key]??Number.MAX_SAFE_INTEGER-1);
  visNotes.forEach(n=>{
    const subKeys=noteSubjects(n).length?noteSubjects(n):['none'];
    const chKeys=noteChapters(n).length?noteChapters(n):['none'];
    const secKeys=noteSections(n).length?noteSections(n):['none'];
    subKeys.forEach(sk=>{
      if(!tree[sk]) tree[sk]={items:{}};
      chKeys.forEach(ck=>{
        if(!tree[sk].items[ck]) tree[sk].items[ck]={items:{}};
        secKeys.forEach(sek=>{
          if(!tree[sk].items[ck].items[sek]) tree[sk].items[ck].items[sek]=[];
          tree[sk].items[ck].items[sek].push(n);
        });
      });
    });
  });
  const subOrder=Object.keys(tree).sort((a,b)=>subByKey(a).label.localeCompare(subByKey(b).label,'zh'));
  const secLabel=key=>key==='none'?'（無節）':sectionByKey(key).label;
  const chLabel=key=>key==='none'?'（無章）':chapterByKey(key).label;
  const subLabel=key=>key==='none'?'（未設定科目）':subByKey(key).label;
  body.innerHTML=`<ul class="map-tree-list">${subOrder.map(sk=>{
    const chMap=tree[sk].items,chOrder=Object.keys(chMap).sort((a,b)=>chapterRank(a)-chapterRank(b)||chLabel(a).localeCompare(chLabel(b),'zh'));
    const subCount=chOrder.reduce((sum,ck)=>sum+Object.values(chMap[ck].items).reduce((s,arr)=>s+arr.length,0),0);
    return `<li class="map-tree-group"><div class="map-tree-group-row"><span class="map-tree-label">📚 ${escapeHtml(subLabel(sk))}</span><span class="map-tree-count">${subCount}</span></div>
      <ul>${chOrder.map(ck=>{
        const secMap=chMap[ck].items,secOrder=Object.keys(secMap).sort((a,b)=>sectionRank(a)-sectionRank(b)||secLabel(a).localeCompare(secLabel(b),'zh'));
        const chCount=secOrder.reduce((sum,sek)=>sum+secMap[sek].length,0);
        return `<li class="map-tree-group"><div class="map-tree-group-row"><span class="map-tree-label">📁 ${escapeHtml(chLabel(ck))}</span><span class="map-tree-count">${chCount}</span></div>
          <ul>${secOrder.map(sek=>{
            const sorted=secMap[sek];
            return `<li class="map-tree-group"><div class="map-tree-group-row"><span class="map-tree-label">📄 ${escapeHtml(secLabel(sek))}</span><span class="map-tree-count">${sorted.length}</span></div>
              <ul>${sorted.map(note=>{
                const type=typeByKey(note.type);
                return `<li><button class="map-tree-node" type="button" data-tree-note-id="${note.id}"><span class="map-tree-node-color" style="background:${type.color};"></span><span>${escapeHtml(note.title||`節點#${note.id}`)}</span></button></li>`;
              }).join('')}</ul>
            </li>`;
          }).join('')}</ul>
        </li>`;
      }).join('')}</ul>
    </li>`;
  }).join('')}</ul>`;
  body.querySelectorAll('[data-tree-note-id]').forEach(btn=>btn.addEventListener('click',()=>{
    const id=parseInt(btn.dataset.treeNoteId,10);
    if(!Number.isFinite(id)||!mapNodeById(id)) return;
    showMapInfo(id);openMapPopup(id);highlightNode(id);
    const pos=nodePos[id];
    if(pos){
      mapOffX=mapW*0.5-pos.x*mapScale;
      mapOffY=mapH*0.35-pos.y*mapScale;
      drawMap();
    }
  }));
}
function drawMap(){
  if(!isMapOpen)return;
  clearMapCardBoxCache();
  const canvas=g('mapCanvas'),svg=g('mapSvg'),linksLayer=g('linksLayer'),nodesLayer=g('nodesLayer'),arrowsLayer=g('arrowsLayer');
  if(!canvas||!svg||!linksLayer||!nodesLayer||!arrowsLayer)return;
  const viewportW=canvas.clientWidth||canvas.offsetWidth||1200;
  const viewportH=canvas.clientHeight||canvas.offsetHeight||1000;
  mapW=viewportW;mapH=viewportH;
  let mapWrap=svg.querySelector('#mapWrap');
  if(!mapWrap){mapWrap=document.createElementNS('http://www.w3.org/2000/svg','g');mapWrap.id='mapWrap';svg.appendChild(mapWrap);mapWrap.appendChild(linksLayer);mapWrap.appendChild(arrowsLayer);mapWrap.appendChild(nodesLayer);}
  if(mapVerticalScrollMode) mapOffY=0;
  mapWrap.setAttribute('transform',`translate(${mapOffX},${mapVerticalScrollMode?0:mapOffY}) scale(${mapScale})`);
  const visNotes=visibleNotes(),visIds={};visNotes.forEach(n=>visIds[n.id]=true);
  buildMapTreeIndex(visNotes);
  if(visNotes.length===0){linksLayer.innerHTML='';nodesLayer.innerHTML='';arrowsLayer.innerHTML='';nodeEls={};linkElsMap={};nodeLinksIndex={};linkCurveOffsets={};closeMapPopup();return;}
  const missingPos=visNotes.some(n=>!nodePos[n.id]||isNaN(nodePos[n.id].x)||isNaN(nodePos[n.id].y));
  if(missingPos)forceLayout();
  visNotes.forEach(n=>{if(nodePos[n.id])clampNodeToCanvas(n.id);});
  const contentBottom=Math.max(viewportH,Math.ceil(visNotes.reduce((maxY,n)=>{
    const pos=nodePos[n.id];
    if(!pos) return maxY;
    const box=getMapCardBox(n.id);
    return Math.max(maxY,pos.y+box.height/2+46);
  },0)));
  mapContentH=mapVerticalScrollMode?contentBottom:viewportH;
  mapH=mapContentH;
  svg.setAttribute('viewBox',`0 0 ${mapW} ${mapH}`);svg.setAttribute('width',String(mapW));svg.setAttribute('height',String(mapH));
  const visLinks=visibleLinks(visIds);linkCurveOffsets=buildLinkCurveOffsets(visLinks);
  nodeEls={};linkElsMap={};nodeLinksIndex={};linksLayer.innerHTML='';nodesLayer.innerHTML='';arrowsLayer.innerHTML='';
  const laneCfg=getLaneConfig(),laneCount=laneCfg.names.length;
  const laneLeft=Math.max(80,mapW*.1),laneRight=Math.min(mapW-80,mapW*.9);
  const laneGapX=laneCount>1?(laneRight-laneLeft)/(laneCount-1):0;
  for(let i=0;i<laneCount;i++){
    const x=laneLeft+i*laneGapX;
    const guide=document.createElementNS('http://www.w3.org/2000/svg','line');
    guide.setAttribute('x1',x);guide.setAttribute('y1',42);guide.setAttribute('x2',x);guide.setAttribute('y2',mapH-18);
    guide.setAttribute('stroke','#d6deea');guide.setAttribute('stroke-width','1');guide.setAttribute('stroke-dasharray','5 6');guide.style.opacity='0.8';linksLayer.appendChild(guide);
    const label=document.createElementNS('http://www.w3.org/2000/svg','text');
    label.classList.add('map-lane-label');label.setAttribute('x',x);label.setAttribute('y',26);label.setAttribute('text-anchor','middle');label.textContent=laneCfg.names[i];linksLayer.appendChild(label);
  }
  visLinks.forEach(lk=>{
    if(!nodeLinksIndex[lk.from])nodeLinksIndex[lk.from]=[];if(!nodeLinksIndex[lk.to])nodeLinksIndex[lk.to]=[];
    nodeLinksIndex[lk.from].push(lk.id);nodeLinksIndex[lk.to].push(lk.id);
    const pathData=calcLinkPath(lk);if(!pathData)return;
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',pathData.d);path.setAttribute('stroke',LINK_COLOR);path.setAttribute('stroke-width','1.35');path.setAttribute('fill','none');path.style.opacity='0.3';linksLayer.appendChild(path);
    const arrow=document.createElementNS('http://www.w3.org/2000/svg','path');
    arrow.setAttribute('d',`M${pathData.c2x},${pathData.c2y} L${pathData.x2},${pathData.y2}`);
    arrow.setAttribute('stroke',LINK_COLOR);arrow.setAttribute('stroke-width','1.35');arrow.setAttribute('fill','none');arrow.setAttribute('marker-end','url(#arrowBlue)');
    arrow.style.opacity='0.92';
    arrowsLayer.appendChild(arrow);
    linkElsMap[lk.id]={p:path,a:arrow};
  });
  visNotes.forEach(n=>{
    const pos=nodePos[n.id];if(!pos)return;
    const type=isRelayNode(n)?{label:'中繼站',color:'#A855F7'}:typeByKey(n.type),box=getMapCardBox(n.id),halfW=box.width/2,halfH=box.height/2;
    const grp=document.createElementNS('http://www.w3.org/2000/svg','g');grp.classList.add('map-node');grp.dataset.id=String(n.id);
    if(mapLinkSourceId===n.id) grp.classList.add('map-link-source');
    const card=document.createElementNS('http://www.w3.org/2000/svg','rect');
    card.classList.add('node-card');
    card.setAttribute('x',String(pos.x-halfW));card.setAttribute('y',String(pos.y-halfH));
    card.setAttribute('rx','12');card.setAttribute('ry','12');
    card.setAttribute('width',String(box.width));card.setAttribute('height',String(box.height));
    card.setAttribute('fill','#ffffff');card.setAttribute('stroke',type.color);card.setAttribute('stroke-width','1.8');
    const cardBody=document.createElementNS('http://www.w3.org/2000/svg','foreignObject');
    cardBody.classList.add('node-card-body');
    cardBody.setAttribute('x',String(pos.x-halfW));cardBody.setAttribute('y',String(pos.y-halfH));
    cardBody.setAttribute('width',String(box.width));cardBody.setAttribute('height',String(box.height));
    cardBody.style.pointerEvents='none';
    const previewHtml=renderMapCardPreview(n);
    const markedTitle=`${mapTitleMarkers(n.id)}${n.title||'（未命名）'}`;
    cardBody.innerHTML=`<div xmlns="http://www.w3.org/1999/xhtml" class="map-card-inner">
      <div class="map-card-head"><span class="map-card-title">${escapeHtml(markedTitle)}</span></div>
      ${previewHtml}
    </div>`;
    const hasChildren=links.some(l=>l.from===n.id&&mapNodeById(l.to));
    grp.appendChild(card);grp.appendChild(cardBody);
    if(hasChildren){
      const foldBtnR=9;
      const foldX=pos.x+halfW-foldBtnR-5,foldY=pos.y-halfH+foldBtnR+5;
      const foldBtn=document.createElementNS('http://www.w3.org/2000/svg','circle');
      foldBtn.classList.add('node-fold-btn');
      foldBtn.setAttribute('cx',String(foldX));foldBtn.setAttribute('cy',String(foldY));foldBtn.setAttribute('r',String(foldBtnR));
      foldBtn.setAttribute('fill','#ffffff');foldBtn.setAttribute('stroke',type.color);foldBtn.setAttribute('stroke-width','1.5');
      foldBtn.style.cursor='pointer';
      const foldSign=document.createElementNS('http://www.w3.org/2000/svg','text');
      foldSign.classList.add('node-fold-sign');
      foldSign.setAttribute('x',String(foldX));foldSign.setAttribute('y',String(foldY+1));
      foldSign.setAttribute('text-anchor','middle');foldSign.setAttribute('dominant-baseline','middle');
      foldSign.setAttribute('font-size','14');
      foldSign.setAttribute('font-weight','700');foldSign.setAttribute('fill',type.color);
      foldSign.style.cursor='pointer';
      foldSign.textContent=isMapNodeCollapsed(n.id)?'+':'−';
      const toggleFold=e=>{e.stopPropagation();toggleMapFold(n.id);};
      foldBtn.addEventListener('click',toggleFold);
      foldSign.addEventListener('click',toggleFold);
      grp.appendChild(foldBtn);grp.appendChild(foldSign);
    }
    const hasSubpage=hasSubpageForNode(n.id);
    if(hasSubpage&&isNodeInCurrentSubpage(n.id)){
      const subEnterBtnR=9;
      const subEnterX=pos.x-halfW+subEnterBtnR+6;
      const subEnterY=pos.y+halfH-subEnterBtnR-6;
      const subEnterBtn=document.createElementNS('http://www.w3.org/2000/svg','circle');
      subEnterBtn.classList.add('node-sub-enter-btn');
      subEnterBtn.setAttribute('cx',String(subEnterX));subEnterBtn.setAttribute('cy',String(subEnterY));subEnterBtn.setAttribute('r',String(subEnterBtnR));
      subEnterBtn.setAttribute('fill','#ffffff');subEnterBtn.setAttribute('stroke',type.color);subEnterBtn.setAttribute('stroke-width','1.5');
      subEnterBtn.style.cursor='pointer';
      const subEnterSign=document.createElementNS('http://www.w3.org/2000/svg','text');
      subEnterSign.classList.add('node-sub-enter-sign');
      subEnterSign.setAttribute('x',String(subEnterX));subEnterSign.setAttribute('y',String(subEnterY+1));
      subEnterSign.setAttribute('text-anchor','middle');subEnterSign.setAttribute('dominant-baseline','middle');
      subEnterSign.setAttribute('font-size','13');
      subEnterSign.setAttribute('font-weight','700');subEnterSign.setAttribute('fill',type.color);
      subEnterSign.style.cursor='pointer';
      subEnterSign.textContent='↙';
      const enterSubpage=e=>{e.stopPropagation();closeMapPopup();enterMapSubpage(n.id);};
      subEnterBtn.addEventListener('click',enterSubpage);
      subEnterSign.addEventListener('click',enterSubpage);
      grp.appendChild(subEnterBtn);grp.appendChild(subEnterSign);
    }
    grp.addEventListener('click',e=>{
      e.stopPropagation();
      if(handleMapNodeLinkTap(n.id)) return;
      showMapInfo(n.id);
      openMapPopup(n.id);
      highlightNode(n.id);
    });
    grp.addEventListener('dblclick',e=>{
      e.stopPropagation();
      if(isRelayNode(n)) return;
      openId=n.id;
      openForm(true);
      closeMapPopup();
    });
    grp.addEventListener('mousedown',e=>startDrag(e,n.id));grp.addEventListener('touchstart',e=>startDragTouch(e,n.id),{passive:true});
    nodesLayer.appendChild(grp);nodeEls[n.id]=grp;
  });
  applyFocusStyles();
}
function toggleMapFold(id){
  const key=mapCollapseKey(id);
  if(mapCollapsed[key]) delete mapCollapsed[key];
  else mapCollapsed[key]=true;
  closeMapPopup();
  drawMap();
  saveDataDeferred();
}
function openMapPopup(id){
  const popup=g('mapPopup'),pos=nodePos[id];if(!popup||!pos)return;
  const maxLeft=Math.max(8,mapW-320),maxTop=Math.max(8,mapH-250);
  const left=Math.max(8,Math.min(maxLeft,pos.x*mapScale+mapOffX+14)),top=Math.max(8,Math.min(maxTop,pos.y*mapScale+mapOffY+14));
  popup.style.left=`${left}px`;popup.style.top=`${top}px`;popup.classList.add('open');
  const goBtn=g('mpGoto');
  const node=mapNodeById(id);
  if(goBtn){
    if(isRelayNode(node)){
      goBtn.style.display='none';
    }else{
      goBtn.style.display='block';
      goBtn.onclick=()=>{openNote(id);closeMapPopup();};
    }
  }
}
function showMapInfo(id){
  const n=mapNodeById(id);if(!n)return;
  const relay=isRelayNode(n);
  const tp=relay?{label:'中繼站',color:'#A855F7'}:typeByKey(n.type),sb=subByKey(n.subject),related=links.filter(l=>l.from===id||l.to===id);
  const quickWrap=g('mp-link-quick-wrap');
  const quickInput=g('mp-link-search');
  g('mpBadge').textContent=tp.label;g('mpBadge').style.background=tp.color;g('mpTitle').textContent=n.title;
  g('mpSubject').textContent=sb.label;g('mpSubject').style.background=sb.color+'22';g('mpSubject').style.color=sb.color;
  if(quickWrap){
    quickWrap.style.display=relay?'flex':'none';
    if(quickInput){
      quickInput.value='';
      quickInput.dataset.sourceId=relay?String(id):'';
    }
    renderMapPopupQuickLinkSearch(relay?id:null);
  }
  const currentCenterId=getMapCenterFromScopes();
  const setCenterBtn=document.createElement('button');setCenterBtn.className='mp-set-center';
  setCenterBtn.textContent=currentCenterId===id?'✓ 已是核心':'⭐ 設為核心';
  setCenterBtn.style.cssText='width:100%;padding:8px;margin:8px 0 4px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #ddd;'+(currentCenterId===id?'background:#EAF3DE;color:#3B6D11;border-color:#97C459;':'background:#f5f5f5;color:#555;');
  setCenterBtn.onclick=()=>{setMapCenterForCurrentScope(id,{updateGlobal:true});nodePos={};forceLayout();drawMap();saveData();closeMapPopup();showToast(`已將「${n.title}」設為核心節點（僅此科目/章/節）`);};
  const goBtn=g('mpGoto');
  const hasSubpage=hasSubpageForNode(id);
  const subpageBtn=document.createElement('button');
  subpageBtn.className='mp-subpage-btn';
  subpageBtn.textContent=hasSubpage?'📄 進入子頁面':'📄 設定子頁面';
  subpageBtn.style.cssText='width:100%;padding:8px;margin:4px 0;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #ddd;background:#f5f5f5;color:#555;';
  subpageBtn.onclick=()=>{
    if(!hasSubpage){
      if(!ensureMapSubpageRoot(id)){
        showToast('設定失敗：節點不存在');
        return;
      }
      setMapCenterForSubpageScope(id,id);
      saveData();
      drawMap();
      showToast('已設定子頁面，且此頁面核心已設為該筆記');
      showMapInfo(id);
      return;
    }
    closeMapPopup();
    enterMapSubpage(id);
  };
  const cancelSubpageBtn=document.createElement('button');
  cancelSubpageBtn.className='mp-subpage-btn mp-subpage-cancel-btn';
  cancelSubpageBtn.textContent='🗑️ 取消子頁面';
  cancelSubpageBtn.style.cssText='width:100%;padding:8px;margin:4px 0 8px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #f3c7c7;background:#fff2f2;color:#c43d3d;';
  cancelSubpageBtn.onclick=()=>{
    if(!removeSubpageForNode(id)) return;
    removeRootFromPageStack(id);
    saveData();
    closeMapPopup();
    drawMap();
    updateMapPagePath();
    showToast('已取消子頁面設定');
  };
  const linkStartBtn=document.createElement('button');
  linkStartBtn.className='mp-link-start-btn';
  linkStartBtn.textContent=mapLinkSourceId===id?'✖ 取消連線起點':'🔗 以此為連線起點';
  linkStartBtn.style.cssText='width:100%;padding:8px;margin:4px 0;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #ddd;'+(mapLinkSourceId===id?'background:#fff2f2;color:#c43d3d;border-color:#f3c7c7;':'background:#eef6ff;color:#0C447C;border-color:#b5d4f4;');
  linkStartBtn.onclick=()=>{
    if(mapLinkSourceId===id) clearMapLinkSource({silent:true});
    else setMapLinkSource(id);
    closeMapPopup();
  };
  const hideFromPageBtn=document.createElement('button');
  hideFromPageBtn.className='mp-hide-page-btn';
  hideFromPageBtn.textContent='🙈 取消顯示';
  hideFromPageBtn.style.cssText='width:100%;padding:8px;margin:4px 0;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #e8d59b;background:#fff9e9;color:#8a6400;';
  hideFromPageBtn.onclick=()=>{
    if(!unassignNoteFromMapPage(id)){
      showToast('無法隱藏此節點');
      return;
    }
    if(mapLinkSourceId===id) clearMapLinkSource({silent:true});
    saveData();
    closeMapPopup();
    drawMap();
    updateMapPagePath();
    showToast(`已取消顯示「${n.title||'（未命名）'}」`);
  };
  if(goBtn&&goBtn.parentNode){
    goBtn.parentNode.querySelectorAll('.mp-set-center,.mp-subpage-btn,.mp-subpage-cancel-btn,.mp-link-start-btn,.mp-hide-page-btn').forEach(el=>el.remove());
    goBtn.parentNode.insertBefore(setCenterBtn,goBtn);
    goBtn.parentNode.insertBefore(linkStartBtn,goBtn);
    if(isNodeInCurrentMapPage(id)) goBtn.parentNode.insertBefore(hideFromPageBtn,goBtn);
    if(isNodeInCurrentSubpage(id)) goBtn.parentNode.insertBefore(subpageBtn,goBtn);
    if(hasSubpage&&isNodeInCurrentSubpage(id)) goBtn.parentNode.insertBefore(cancelSubpageBtn,goBtn);
    let relayEditBtn=goBtn.parentNode.querySelector('.mp-relay-edit-btn');
    let relayDeleteBtn=goBtn.parentNode.querySelector('.mp-relay-delete-btn');
    relayEditBtn?.remove();relayDeleteBtn?.remove();
    if(relay){
      relayEditBtn=document.createElement('button');
      relayEditBtn.className='mp-relay-edit-btn';
      relayEditBtn.textContent='✏️ 編輯中繼站';
      relayEditBtn.style.cssText='width:100%;padding:8px;margin:4px 0;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #ddd;background:#f5f5f5;color:#555;';
      relayEditBtn.onclick=()=>editMapRelay(id);
      relayDeleteBtn=document.createElement('button');
      relayDeleteBtn.className='mp-relay-delete-btn';
      relayDeleteBtn.textContent='🗑️ 刪除中繼站';
      relayDeleteBtn.style.cssText='width:100%;padding:8px;margin:4px 0 8px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #f3c7c7;background:#fff2f2;color:#c43d3d;';
      relayDeleteBtn.onclick=()=>deleteMapRelay(id);
      goBtn.parentNode.insertBefore(relayEditBtn,goBtn);
      goBtn.parentNode.insertBefore(relayDeleteBtn,goBtn);
    }
  }
  const linksEl=g('mpLinks');
  const slashLinks=extractSlashLinks(n.detail,id);
  if(!related.length&&!slashLinks.length){linksEl.innerHTML='<span class="mp-no-links">尚無關聯</span>';}
  else{
    const relationHtml=related.map(l=>{const otherId=l.from===id?l.to:l.from,other=mapNodeById(otherId),dir=l.from===id?'→':'←',name=other?other.title:'（已刪除）',relNote=normalizeRelationNote(l.note);return `<div class="mp-link-row"><span class="mp-link-badge" style="background:${relationColor(l.rel)}">${dir} ${relationLabel(l.rel)}</span><span class="mp-link-name" data-nid="${otherId}">${name}</span>${relNote?`<span class="chip">${escapeHtml(relNote)}</span>`:''}</div>`;}).join('');
    const slashHtml=slashLinks.map(item=>`<div class="mp-link-row"><span class="mp-link-badge" style="background:#64748B">/ 連結</span><span class="mp-link-name" data-nid="${item.id}">${escapeHtml(item.title)}</span></div>`).join('');
    linksEl.innerHTML=relationHtml+slashHtml;
    linksEl.querySelectorAll('.mp-link-name').forEach(el=>{el.addEventListener('click',()=>{
      const targetId=parseInt(el.dataset.nid,10);
      highlightNode(targetId);
      closeMapPopup();
      if(noteById(targetId)){ openNote(targetId); return; }
      showMapInfo(targetId);
      openMapPopup(targetId);
    });});
  }
}
function closeMapPopup(){ g('mapPopup').classList.remove('open'); }
function getFocusNodeSet(id){ const set={[id]:true};links.forEach(l=>{if(l.from===id)set[l.to]=true;if(l.to===id)set[l.from]=true;});return set; }
function applyFocusStyles(){
  const focusSet=(mapFocusMode&&mapFocusedNodeId)?getFocusNodeSet(mapFocusedNodeId):null;
  g('nodesLayer').querySelectorAll('.map-node').forEach(grp=>{const nid2=parseInt(grp.dataset.id);grp.classList.remove('map-node-highlight','map-node-dimmed');if(mapFocusedNodeId===nid2)grp.classList.add('map-node-highlight');if(focusSet&&!focusSet[nid2])grp.classList.add('map-node-dimmed');});
  Object.keys(linkElsMap).forEach(key=>{
    const lid2=parseInt(key,10),lk=links.find(l=>l.id===lid2),path=linkElsMap[lid2]&&linkElsMap[lid2].p;
    if(!lk||!path)return;
    const active=!focusSet||(focusSet[lk.from]&&focusSet[lk.to]);
    const isSelectedRelated=!!mapFocusedNodeId&&(lk.from===mapFocusedNodeId||lk.to===mapFocusedNodeId);
    const c=calcLinkPath(lk,{unbundled:isSelectedRelated});
    if(c){
      path.setAttribute('d',c.d);
      if(linkElsMap[lid2]&&linkElsMap[lid2].a) linkElsMap[lid2].a.setAttribute('d',`M${c.c2x},${c.c2y} L${c.x2},${c.y2}`);
    }
    path.style.opacity=isSelectedRelated?'0.95':(active?'0.3':'0.12');
    path.setAttribute('stroke-width',isSelectedRelated?'3.2':(active?'1.35':'1'));
    const arrow=linkElsMap[lid2]&&linkElsMap[lid2].a;
    if(arrow){
      arrow.style.opacity=isSelectedRelated?'0.95':(active?'0.92':'0.35');
      arrow.setAttribute('stroke-width',isSelectedRelated?'3.2':(active?'1.35':'1'));
    }
  });
}
function highlightNode(id){ mapFocusedNodeId=id;applyFocusStyles(); }
function startDrag(e,id){
  e.preventDefault();e.stopPropagation();closeMapPopup();dragNode=id;
  const canvas=g('mapCanvas'),pos=nodePos[id],rect=canvas.getBoundingClientRect(),scrollTop=mapVerticalScrollMode?canvas.scrollTop:0;
  dragOffX=e.clientX-rect.left-(pos.x*mapScale+mapOffX);
  dragOffY=e.clientY-rect.top+scrollTop-(pos.y*mapScale+mapOffY);
}
function startDragTouch(e,id){
  e.stopPropagation();dragNode=id;
  const canvas=g('mapCanvas'),pos=nodePos[id],rect=canvas.getBoundingClientRect(),touch=e.touches[0],scrollTop=mapVerticalScrollMode?canvas.scrollTop:0;
  dragOffX=touch.clientX-rect.left-(pos.x*mapScale+mapOffX);
  dragOffY=touch.clientY-rect.top+scrollTop-(pos.y*mapScale+mapOffY);
}
function buildMapFilters(){
  const ss=g('mapFilterSub'),sch=g('mapFilterChapter'),ssc=g('mapFilterSection'),sd=g('mapDepthSel');if(!ss||!sch||!ssc)return;
  ss.innerHTML='<option value="all">全部科目</option>'+subjects.map(s=>`<option value="${s.key}">${s.label}</option>`).join('');
  if(!subjects.some(s=>s.key===mapFilter.sub))mapFilter.sub='all';
  const mapChapters=chapters.filter(ch=>mapFilter.sub==='all'||ch.subject===mapFilter.sub||ch.subject==='all');
  const preferredChapter=(cch!=='all'&&cch)||selectedChapters[0]||'';
  if(mapChapters.length){
    if(!['all','none'].includes(mapFilter.chapter)&&!mapChapters.some(ch=>ch.key===mapFilter.chapter)) mapFilter.chapter=preferredChapter;
    if(!['all','none'].includes(mapFilter.chapter)&&!mapChapters.some(ch=>ch.key===mapFilter.chapter)) mapFilter.chapter='all';
    sch.innerHTML='<option value="all">全部章</option><option value="none">無章</option>'+mapChapters.map(ch=>`<option value="${ch.key}">${ch.label}</option>`).join('');
  }else{
    mapFilter.chapter='all';
    sch.innerHTML='<option value="all">全部章</option><option value="none">無章</option>';
  }
  const mapSections=sections.filter(sec=>mapFilter.chapter==='all'||sec.chapter===mapFilter.chapter||sec.chapter==='all');
  if(mapSections.length){
    if(!['all','none'].includes(mapFilter.section)&&!mapSections.some(sec=>sec.key===mapFilter.section)) mapFilter.section='all';
    ssc.innerHTML='<option value="all">全部節</option><option value="none">無節</option>'+mapSections.map(sec=>`<option value="${sec.key}">${sec.label}</option>`).join('');
  }else{
    mapFilter.section='all';
    ssc.innerHTML='<option value="all">全部節</option><option value="none">無節</option>';
  }
  ss.value=mapFilter.sub;sch.value=mapFilter.chapter;ssc.value=mapFilter.section;
  if(sd)sd.value=['all','1','2','3'].includes(mapDepth)?mapDepth:'all';
  updateMapPinnedChapter();
}
function laneContextLabelText(){ const s=mapFilter.sub==='all'?'全部科目':subByKey(mapFilter.sub).label,sec=mapFilter.section==='all'?'全部節':(mapFilter.section==='none'?'無節':sectionByKey(mapFilter.section).label);return `目前篩選：${s} / ${sec}`; }
function ensureLanePanel(){
  const existing=g('lanePanel');if(existing)return existing;
  const canvas=g('mapCanvas');if(!canvas)return null;
  const panel=document.createElement('div');panel.id='lanePanel';
  panel.innerHTML=`<div class="lane-panel-head"><span class="lane-panel-title">泳道設定</span><button class="pcls" id="lanePanelClose">×</button></div><div class="lane-panel-desc">可依「目前科目/節篩選」分開設定泳道名稱。</div><div id="laneContextLabel"></div><div class="lane-count-row"><label for="laneCountInput">泳道數量</label><input id="laneCountInput" type="number" min="${MIN_LANE_COUNT}" max="${MAX_LANE_COUNT}" value="${DEFAULT_LANE_NAMES.length}"></div><div id="laneInputs"></div><div class="lane-panel-actions"><button class="fbtn bcl" id="laneResetBtn">恢復預設</button><button class="fbtn bsv" id="laneSaveBtn">儲存</button></div>`;
  canvas.appendChild(panel);on('lanePanelClose','click',closeLanePanel);on('laneSaveBtn','click',saveLanePanel);on('laneResetBtn','click',resetLanePanel);return panel;
}
function renderLanePanel(){
  const panel=ensureLanePanel(),ctx=g('laneContextLabel'),inputs=g('laneInputs');if(!panel||!ctx||!inputs)return;
  const cfg=getLaneConfig();ctx.textContent=`${laneContextLabelText()}（獨立泳道設定）`;
  const laneCountInput=g('laneCountInput');
  if(laneCountInput){
    laneCountInput.value=String(cfg.count);
    laneCountInput.onchange=()=>{
      const nextCount=normalizeLaneCount(laneCountInput.value);
      const currNames=Array.from(inputs.querySelectorAll('input[data-idx]')).map((el,idx)=>(el.value||'').trim()||defaultLaneNameAt(idx));
      const nextNames=Array.from({length:nextCount},(_,idx)=>currNames[idx]||defaultLaneNameAt(idx));
      mapLaneConfigs[cfg.key]={count:nextCount,names:nextNames};
      renderLanePanel();
    };
  }
  inputs.innerHTML=cfg.names.map((name,idx)=>`<div class="lane-input-row"><label>泳道 ${idx+1}</label><input data-idx="${idx}" value="${name}" maxlength="16" placeholder="泳道名稱"></div>`).join('');
}
function openLanePanel(){ const panel=ensureLanePanel();if(!panel)return;renderLanePanel();panel.classList.add('open'); }
function closeLanePanel(){ const panel=g('lanePanel');if(panel)panel.classList.remove('open'); }
function saveLanePanel(){
  const cfg=getLaneConfig(),inputsWrap=g('laneInputs');if(!inputsWrap)return;
const count=normalizeLaneCount(g('laneCountInput')?.value||cfg.count);
  const names=Array.from({length:count},(_,idx)=>{
    const el=inputsWrap.querySelector(`input[data-idx="${idx}"]`);
    return ((el&&el.value)||'').trim()||defaultLaneNameAt(idx);
  });
  mapLaneConfigs[cfg.key]={count,names};saveDataDeferred();closeLanePanel();nodePos={};forceLayout();drawMap();showToast('已儲存泳道設定');
}
function resetLanePanel(){ const cfg=getLaneConfig();mapLaneConfigs[cfg.key]={count:DEFAULT_LANE_NAMES.length,names:DEFAULT_LANE_NAMES.slice()};renderLanePanel();saveDataDeferred(); }
function executeQuickCommand(cmd,{closeSheet=true}={}){
  if(cmd==='search') g('searchInput')?.focus();
  else if(cmd==='new') openForm(false);
  else if(cmd==='mapAssign'){
    openMapAssignPanel();
  }
  else if(cmd==='relay'){
    showToast('「中繼站」功能已移除');
  }
  else if(cmd==='map') toggleMapView(!isMapOpen);
  else if(cmd==='calendar') toggleCalendarView(currentView!=='calendar');
  else if(cmd==='duplicate') duplicateMapNode();
  else if(cmd==='delete') deleteMapNode();
}
function bindTouchQuickActions(){
  on('mapTreeToggleBtn','click',()=>g('mapTreeSidebar')?.classList.add('open'));
  on('mapTreeCloseBtn','click',()=>g('mapTreeSidebar')?.classList.remove('open'));
}

function bindCoreButtons(){
  const bind=(id,fn)=>{const el=g(id);if(el)el.onclick=fn;};
  bind('addBtn',()=>openForm(false));
  bind('editBtn',()=>{if(!openId){showToast('請先開啟一筆筆記');return;}openForm(true);});
  bind('copyBtn',copyNoteToClipboard);
  bind('dupBtn',duplicateNote);
  bind('dpClose',closeDetail);bind('fpClose',closeForm);bind('fpCancel',closeForm);
  bind('fpSave',saveNote);bind('delBtn',deleteNote);
}
function bindTagManagerNav(){
  g('tagCategoryNav')?.addEventListener('click',ev=>{
    const btn=ev.target.closest('.tag-nav-btn');
    if(!btn) return;
    activeTagCategory=btn.dataset.category||'type';
    renderTagLists();
  });
  on('tagSettingsBtn','click',()=>g('tagGlobalOptions')?.classList.toggle('open'));
}

// ==================== AI 功能 ====================
function requireAiKey(action){ const k=getAiKey();if(k){action(k);return;}_aiPendingAction=action;g('aiKeyInput').value='';const sel=g('aiModelSel');if(sel)sel.innerHTML=AI_MODELS.map(m=>`<option value="${m.id}"${m.id===getAiModel()?' selected':''}>${m.label}</option>`).join('');g('aiKeyModal').classList.add('open'); }
function openAiSettings(){ g('aiKeyInput').value=getAiKey();const sel=g('aiModelSel');if(sel)sel.innerHTML=AI_MODELS.map(m=>`<option value="${m.id}"${m.id===getAiModel()?' selected':''}>${m.label}</option>`).join('');_aiPendingAction=null;g('aiKeyModal').classList.add('open'); }
