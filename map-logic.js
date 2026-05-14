var { matchesQueryMode } = window.KLawsUtils;
var appStateFacadeMap=(typeof window!=='undefined'&&window.appState)?window.appState:null;
// ==================== 體系圖 ====================
const MAP_TREE_SIDEBAR_OPEN_KEY='klaws_map_tree_sidebar_open_v1';
function setMapTreeSidebarOpen(willOpen){
  const sidebar=g('mapTreeSidebar');
  const toggleBtn=g('mapTreeToggleBtn');
  if(!sidebar||!toggleBtn) return;
  mapTreeSidebarOpen=!!willOpen;
  sidebar.classList.toggle('open',mapTreeSidebarOpen);
  toggleBtn.classList.toggle('open',mapTreeSidebarOpen);
  toggleBtn.textContent=mapTreeSidebarOpen?'❮':'❯';
  toggleBtn.setAttribute('aria-label',mapTreeSidebarOpen?'收合路徑索引':'開啟路徑索引');
  try{ window.KLawsStorage.governedWriteLocal(MAP_TREE_SIDEBAR_OPEN_KEY,mapTreeSidebarOpen?'1':'0','ephemeral'); }catch(e){}
}
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
const groupIndexMap = () => {
  const map={};
  groups.forEach((ch,idx)=>{ if(ch&&ch.key) map[ch.key]=idx; });
  return map;
};
const partIndexMap = () => {
  const map={};
  parts.forEach((sec,idx)=>{ if(sec&&sec.key) map[sec.key]=idx; });
  return map;
};
const nodePreferredRank = (nodeId,chIdxMap,secIdxMap) => {
  const note=mapNodeById(nodeId)||{};
  const chIdxs=noteGroups(note).map(key=>chIdxMap[key]).filter(idx=>Number.isFinite(idx));
  const secIdxs=noteParts(note).map(key=>secIdxMap[key]).filter(idx=>Number.isFinite(idx));
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
  const scopedCenterIds=getMapCentersFromScopes();
  const hasStoredCenter=scopedCenterIds.length>0;
  const linkCount={},incomingCount={};
  layoutNotes.forEach(n=>{linkCount[n.id]=0;incomingCount[n.id]=0;});
  visLinks.forEach(lk=>{
    linkCount[lk.from]=(linkCount[lk.from]||0)+1;
    linkCount[lk.to]=(linkCount[lk.to]||0)+1;
    incomingCount[lk.to]=(incomingCount[lk.to]||0)+1;
  });
  if(!hasStoredCenter&&!mapCenterNodeId){
    setMapCenterForCurrentScope(layoutNotes.reduce((max,n)=>linkCount[n.id]>linkCount[max.id]?n:max,layoutNotes[0]).id,{updateGlobal:true});
  }
  const activeCenterIds=getMapCentersFromScopes();
  const fallbackCenterId=layoutNotes.reduce((max,n)=>linkCount[n.id]>linkCount[max.id]?n:max,layoutNotes[0]).id;
  const layoutCenterNodeIds=activeCenterIds.filter(id=>visIds[id]);
  if(!layoutCenterNodeIds.length) layoutCenterNodeIds.push(fallbackCenterId);
  const layoutCenterNodeId=layoutCenterNodeIds[0];
  const layoutCoreNodeIds=layoutNotes
    .map(n=>n.id)
    .filter(id=>(incomingCount[id]||0)===0)
    .sort((a,b)=>(linkCount[b]||0)-(linkCount[a]||0)||a-b);
  layoutCenterNodeIds.slice().reverse().forEach(cid=>{ if(visIds[cid]&&!layoutCoreNodeIds.includes(cid)) layoutCoreNodeIds.unshift(cid); });
  if(!layoutCoreNodeIds.length) layoutCoreNodeIds.push(layoutCenterNodeId);
  const laneCfg=getLaneConfig(),laneCount=laneCfg.names.length;
  const LANE_CARD_GAP_Y=20,TOP_PAD=72,BOT_PAD=40;
  const laneLeft=Math.max(80,mapW*.1),laneRight=Math.min(mapW-80,mapW*.9);
  const laneGapX=laneCount>1?(laneRight-laneLeft)/(laneCount-1):0;
  const chIdxMap=groupIndexMap(),secIdxMap=partIndexMap();
  const adj={};layoutNotes.forEach(n=>adj[n.id]=[]);visLinks.forEach(lk=>{if(adj[lk.from])adj[lk.from].push(lk.to);if(adj[lk.to])adj[lk.to].push(lk.from);});
  const layers={},visited=new Set(),queue=[...layoutCoreNodeIds];
  layoutCoreNodeIds.forEach(id=>{layers[id]=0;visited.add(id);});
  while(queue.length){const current=queue.shift(),cl=layers[current];(adj[current]||[]).forEach(neighbor=>{if(!visited.has(neighbor)){visited.add(neighbor);layers[neighbor]=cl+1;queue.push(neighbor);}});}
  const connectedMaxLayer=Object.values(layers).reduce((m,v)=>Math.max(m,v),0);
  layoutNotes.forEach(n=>{if(!visited.has(n.id))layers[n.id]=connectedMaxLayer+1;});
  const coreSet=new Set(layoutCoreNodeIds.map(id=>parseInt(id,10)));
  const laneGroups={};Object.keys(layers).forEach(nodeId=>{
    const nid=parseInt(nodeId,10);
    const lane=coreSet.has(nid)?0:Math.max(1,Math.min(laneCount-1,layers[nodeId]||0));
    if(!laneGroups[lane])laneGroups[lane]=[];
    laneGroups[lane].push(nid);
  });
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
function isPathPageKey(rootId){
  return typeof rootId==='string'&&rootId.startsWith('path::');
}
function pathFromPageKey(rootId){
  return isPathPageKey(rootId)?rootId.slice(6):'';
}
function mapPageLabel(rootId){
  if(isPathPageKey(rootId)) return pathFromPageKey(rootId)||'（未命名路徑）';
  return mapNodeById(rootId)?.title||`點#${rootId}`;
}
function updateMapPagePath(){
  const el=g('mapPagePath'); if(!el) return;
  if(!mapPageStack.length){el.textContent='主頁';return;}
  const labels=mapPageStack.map(id=>mapPageLabel(id));
  el.textContent=`主頁 / ${labels.join(' / ')}`;
}
function enterMapSubpage(rootId){
  if(!isPathPageKey(rootId)&&!mapNodeById(rootId)) return;
  if(mapPageStack[mapPageStack.length-1]===rootId) return;
  mapPageStack.push(rootId);
  setMapCenterForCurrentScope(rootId);
  nodePos={};
  updateMapPagePath();
  forceLayout();
  drawMap();
  persistMapCriticalState();
  saveLastViewState();
}
function leaveMapSubpage(){
  if(!mapPageStack.length) return false;
  mapPageStack.pop();
  nodePos={};
  updateMapPagePath();
  forceLayout();
  drawMap();
  persistMapCriticalState();
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
  const pickAnchor=(center,box,target)=>{
    const halfW=Math.max(8,(box.width||0)/2),halfH=Math.max(8,(box.height||0)/2);
    const dx2=(target.x||0)-center.x,dy2=(target.y||0)-center.y;
    if(Math.abs(dx2)>=Math.abs(dy2)){
      return {x:center.x+(dx2>=0?halfW:-halfW),y:center.y};
    }
    return {x:center.x,y:center.y+(dy2>=0?halfH:-halfH)};
  };
  const sourceAnchor=pickAnchor(fp,fromBox,tp);
  const targetAnchor=pickAnchor(tp,toBox,fp);
  const ARROW_TIP_ADVANCE=1.35;
  const x1=sourceAnchor.x,y1=sourceAnchor.y;
  const x2=targetAnchor.x-nx*ARROW_TIP_ADVANCE,y2=targetAnchor.y-ny*ARROW_TIP_ADVANCE;
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
function mapNodeMatchesTaxonomyFilter(_n){
  return true;
}
function visibleNotes(){
  const q=(mapFilter.q||'').toLowerCase(),linkedIds={};
  const pageAssignedIds=getMapPageAssignedIds();
  if(mapLinkedOnly)links.forEach(l=>{linkedIds[l.from]=true;linkedIds[l.to]=true;});
  const baseFiltered=notes.filter(n=>{
    if(!pageAssignedIds.has(n.id)) return false;
    const subs=noteDomains(n),chs=noteGroups(n),secs=noteParts(n);
    return mapNodeMatchesTaxonomyFilter(n)
      &&(!q||matchesQueryMode({query:q,candidates:[n.title,...subs,...chs,...secs,...noteTags(n),String(n.id||''),`第${n.id||''}條`,`第 ${n.id||''} 條`],mode:window.__klawsSearchMode}));
  });
  const auxnodeFiltered=mapAuxNodes.filter(n=>{
    if(!pageAssignedIds.has(n.id)) return false;
    return mapNodeMatchesTaxonomyFilter(n)&&auxnodeMatchesSearch(n,q);
  });
  const shouldExpandLinked=mapHasTaxonomyFilter();
  let filtered=baseFiltered, auxnodeVisible=auxnodeFiltered;
  if(shouldExpandLinked){
    const seedIds=new Set([...baseFiltered,...auxnodeFiltered].map(n=>n.id));
    const expandedIds=new Set(seedIds);
    links.forEach(lk=>{
      const fromInSeed=seedIds.has(lk.from),toInSeed=seedIds.has(lk.to);
      if(fromInSeed&&!toInSeed&&pageAssignedIds.has(lk.to)) expandedIds.add(lk.to);
      if(toInSeed&&!fromInSeed&&pageAssignedIds.has(lk.from)) expandedIds.add(lk.from);
    });
    filtered=notes.filter(n=>expandedIds.has(n.id)&&noteMatchesSearch(n,q));
    auxnodeVisible=mapAuxNodes.filter(n=>expandedIds.has(n.id)&&auxnodeMatchesSearch(n,q));
  }
  let base=[...filtered,...auxnodeVisible].filter(n=>!mapLinkedOnly||isAuxnodeNode(n)||linkedIds[n.id]);
  if(mapLinkedOnly&&!base.length&&filtered.length){
    mapLinkedOnly=false;setMapLinkedOnlyBtnStyle();
    showToast('目前沒有關聯點，已自動顯示全部點');saveDataDeferred();base=filtered;
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
  const centerIds=getMapCentersFromScopes().filter(id=>depthBaseIds[id]);
  if(!centerIds.length)return base;
  const maxDepth=parseInt(mapDepth,10);if(!maxDepth)return base;
  const adj={};links.forEach(l=>{if(!depthBaseIds[l.from]||!depthBaseIds[l.to])return;if(!adj[l.from])adj[l.from]=[];if(!adj[l.to])adj[l.to]=[];adj[l.from].push(l.to);adj[l.to].push(l.from);});
  const seen={},q2=[];centerIds.forEach(id=>{seen[id]=0;q2.push(id);});
  while(q2.length){const id=q2.shift(),depth=seen[id];if(depth>=maxDepth)continue;(adj[id]||[]).forEach(nid=>{if(seen[nid]===undefined){seen[nid]=depth+1;q2.push(nid);}});}
  return base.filter(n=>seen[n.id]!==undefined);
}
function createMapAuxnode(){
  formMode='auxnode';
  const subpageRootId=currentSubpageRootId();
  const subpageRoot=subpageRootId?mapNodeById(subpageRootId):null;
  const defaultDomains=subpageRoot?noteDomains(subpageRoot):(mapFilter.sub==='all'?[]:[mapFilter.sub]);
  const defaultGroups=subpageRoot?noteGroups(subpageRoot):((mapFilter.group==='all'||mapFilter.group==='none')?[]:[mapFilter.group]);
  const defaultParts=subpageRoot?noteParts(subpageRoot):((mapFilter.part==='all'||mapFilter.part==='none')?[]:[mapFilter.part]);
  openForm(false);
  const defaultSub=defaultDomains[0]||'';
  if(defaultSub){
    setSelectedValues('fs2',[defaultSub]);
    syncGroupSelect([defaultSub],defaultGroups.slice(0,1));
    syncPartSelect(defaultGroups.slice(0,1),defaultParts.slice(0,1),[defaultSub]);
  }
  g('fti').value='新';
  g('fti')?.focus();
  g('fti')?.select();
}
function notifyHiddenAuxnodesByFilter(beforeAuxnodeVisibleIds){
  if(!isMapOpen||!(beforeAuxnodeVisibleIds instanceof Set)||!beforeAuxnodeVisibleIds.size) return;
  const afterAuxnodeVisibleIds=new Set(visibleNotes().filter(isAuxnodeNode).map(n=>n.id));
  const hiddenCount=[...beforeAuxnodeVisibleIds].filter(id=>!afterAuxnodeVisibleIds.has(id)).length;
  if(hiddenCount>0) showToast(`有 ${hiddenCount} 個因篩選被隱藏`);
}
function editMapAuxnode(id){
  const auxnode=auxnodeById(id);
  if(!auxnode) return;
  openId=id;
  formMode='auxnode';
  openForm(true);
}
function deleteMapAuxnode(id){
  const auxnode=auxnodeById(id);
  if(!auxnode) return;
  if(!confirm(`確定刪除「${auxnode.title||'未命名'}」？`)) return;
  if(mapLinkSourceId===id) mapLinkSourceId=null;
  mapAuxNodes=mapAuxNodes.filter(r=>r.id!==id);
  links=links.filter(l=>l.from!==id&&l.to!==id);
  delete nodePos[id];
  delete nodeSizes[id];
  closeMapPopup();
  persistMapCriticalState();
  if(isMapOpen) scheduleMapRedraw(0);
  showToast('已刪除');
}
function scheduleMapRedraw(ms=60){ if(mapRedrawTimer)clearTimeout(mapRedrawTimer);if(mapTimer)clearTimeout(mapTimer);mapRedrawTimer=setTimeout(()=>drawMap(),ms);mapTimer=mapRedrawTimer; }

function replacePathPrefixForNotes(oldPath,newPath){
  const oldSegs=notePathSegments({path:oldPath});
  if(!oldSegs.length) return 0;
  const newSegs=notePathSegments({path:newPath});
  let changed=0;
  notes.forEach(note=>{
    const segs=notePathSegments(note);
    if(segs.length<oldSegs.length) return;
    const isPrefix=oldSegs.every((seg,idx)=>segs[idx]===seg);
    if(!isPrefix) return;
    const nextSegs=[...newSegs,...segs.slice(oldSegs.length)];
    const nextPath=nextSegs.join(' > ');
    if((note.path||'')===nextPath) return;
    note.path=nextPath;
    changed++;
  });
  return changed;
}
function deletePathForNotes(targetPath){
  const targetSegs=notePathSegments({path:targetPath});
  if(!targetSegs.length) return 0;
  let changed=0;
  notes.forEach(note=>{
    const segs=notePathSegments(note);
    if(segs.length<targetSegs.length) return;
    const isPrefix=targetSegs.every((seg,idx)=>segs[idx]===seg);
    if(!isPrefix) return;
    const nextPath=segs.slice(targetSegs.length).join(' > ');
    if((note.path||'')===nextPath) return;
    note.path=nextPath;
    changed++;
  });
  return changed;
}
function persistPathStructureChange(changed,successMsg){
  if(!changed){showToast('沒有筆記需要更新');return false;}
  savePathChange();
  saveLastViewState();
  drawMap();
  if(successMsg) showToast(successMsg(changed));
  return true;
}

function buildMapTreeIndex(visNotes){
  const body=g('mapTreeBody');if(!body)return;
  const filterQ=safeStr(mapTreeFilterQ||'').trim().toLowerCase();
  const isSearching=!!filterQ;
  const list=Array.isArray(visNotes)?visNotes:[];
  const levelIcons=['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
  const getLevelIcon=depth=>depth===0?'🗂️':(levelIcons[depth-1]||`${depth}.`);
  const tree={label:'',items:{},notes:[]};
  const ensurePath=pathSegs=>{
    let cursor=tree;
    pathSegs.forEach(seg=>{
      if(!cursor.items[seg]) cursor.items[seg]={label:seg,items:{},notes:[]};
      cursor=cursor.items[seg];
    });
    return cursor;
  };
  collectTreePathSegments(notes,notePathSegments).forEach(ensurePath);
  list.forEach(n=>{
    const pathSegs=notePathSegments(n);
    if(!pathSegs.length){tree.notes.push(n);return;}
    ensurePath(pathSegs).notes.push(n);
  });
  const countNode=node=>node.notes.length+Object.values(node.items).reduce((sum,ch)=>sum+countNode(ch),0);
  const currentPageRoot=currentSubpageRootId();
  const selectedPath=isPathPageKey(currentPageRoot)?safeStr(pathFromPageKey(currentPageRoot)):'';
  const renderNode=(node,depth=0,parentPath='')=>{
    const pathOrderForParent=(parentPath)=>{
      const orderKey=safeStr(parentPath||'').trim()||'__root__';
      return Array.isArray(mapTreePathOrder[orderKey])?mapTreePathOrder[orderKey]:[];
    };
    const sortKeysByOrder=(keys,parentPath)=>{
      const customOrder=pathOrderForParent(parentPath);
      if(!customOrder.length) return keys.slice().sort((a,b)=>a.localeCompare(b,'zh'));
      const rank={}; customOrder.forEach((v,idx)=>{ rank[v]=idx; });
      return keys.slice().sort((a,b)=>{
        const ra=Number.isFinite(rank[a])?rank[a]:Number.MAX_SAFE_INTEGER;
        const rb=Number.isFinite(rank[b])?rank[b]:Number.MAX_SAFE_INTEGER;
        if(ra!==rb) return ra-rb;
        return a.localeCompare(b,'zh');
      });
    };
    const keys=sortKeysByOrder(Object.keys(node.items),parentPath);
    const icon=getLevelIcon(depth);
    const noteItems=(isSearching?node.notes:[]).filter(note=>{
      if(!isSearching) return false;
      return matchesQueryMode({query:filterQ,candidates:[note.title,String(note.id||'')],mode:window.__klawsSearchMode});
    }).map(note=>{
      const type=typeByKey(note.type);
      const activeCls=mapFocusedNodeId===note.id?' active':'';
      return `<li><button class="map-tree-node${activeCls}" type="button" data-tree-note-id="${note.id}"><span class="map-tree-node-color" style="background:${type.color};"></span><span>${escapeHtml(note.title||`點#${note.id}`)}</span></button></li>`;
    }).join('');
    const groupItems=keys.map(key=>{
      const child=node.items[key];
      const total=countNode(child);
      const treePath=buildTreePathLabel(parentPath,child.label);
      const pathMatch=!filterQ||matchesQueryMode({query:filterQ,candidates:[treePath,child.label],mode:window.__klawsSearchMode});
      const childHtml=renderNode(child,depth+1,treePath);
      if(isSearching&&!pathMatch&&!childHtml) return '';
      const collapsed=!!mapTreeCollapsedPaths[treePath];
      const toggleSymbol=collapsed?'➕':'➖';
      const collapsedByFilter=isSearching?false:collapsed;
      const pathActiveClass=selectedPath===treePath?' active-path':'';
      return `<li class="map-tree-group"><div class="map-tree-group-row" data-tree-path="${escapeHtml(treePath)}"><button type="button" class="map-tree-expand-btn" data-tree-toggle-path="${escapeHtml(treePath)}" aria-label="${collapsedByFilter?'展開':'收合'}路徑">${toggleSymbol}</button><button type="button" class="map-tree-move-btn" data-tree-move-up-path="${escapeHtml(treePath)}" title="上移">⬆️</button><button type="button" class="map-tree-path-btn${pathActiveClass}" data-tree-nav-path="${escapeHtml(treePath)}" title="雙擊可編輯或刪除此路徑">${icon} ${escapeHtml(child.label)}</button><span class="map-tree-count">${total}</span></div><div class="map-tree-group-body" style="display:${collapsedByFilter?'none':'block'}">${childHtml}</div></li>`;
    }).join('');
    if(!groupItems&&!noteItems) return '';
    return `<ul>${groupItems}${noteItems}</ul>`;
  };
  const uncategorized=(isSearching&&tree.notes.length)?`<li class="map-tree-group"><div class="map-tree-group-row"><span class="map-tree-label">📄 （未設定路徑）</span><span class="map-tree-count">${tree.notes.length}</span></div><ul>${tree.notes.filter(note=>matchesQueryMode({query:filterQ,candidates:[note.title,String(note.id||'')],mode:window.__klawsSearchMode})).map(note=>{const type=typeByKey(note.type);return `<li><button class="map-tree-node" type="button" data-tree-note-id="${note.id}"><span class="map-tree-node-color" style="background:${type.color};"></span><span>${escapeHtml(note.title||`點#${note.id}`)}</span></button></li>`;}).join('')}</ul></li>`:'';
  const treeHtml=renderNode(tree,0,'');
  if(!treeHtml&&!uncategorized){body.innerHTML='<div class="map-tree-empty">目前沒有可顯示點。</div>';return;}
  body.innerHTML=`<ul class="map-tree-list">${treeHtml}${uncategorized}</ul>`;
  body.querySelectorAll('[data-tree-toggle-path]').forEach(btn=>btn.addEventListener('click',ev=>{
    const path=btn.dataset.treeTogglePath||'';
    if(!path) return;
    mapTreeCollapsedPaths[path]=!mapTreeCollapsedPaths[path];
    buildMapTreeIndex(list);
    saveDataDeferred();
    ev.stopPropagation();
  }));
  body.querySelectorAll('[data-tree-nav-path]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const path=safeStr(btn.dataset.treeNavPath||'').trim();
      if(!path) return;
      const segs=notePathSegments({path});
      if(!segs.length){showToast('找不到對應的路徑頁面');return;}
      const rootDepth=segs.length;
      const noteIds=notes.filter(n=>{
        const nSegs=notePathSegments(n);
        if(!nSegs.length) return false;
        const isPrefix=segs.every((seg,idx)=>nSegs[idx]===seg);
        const withinOneLevel=nSegs.length<=rootDepth+1;
        return isPrefix&&withinOneLevel;
      }).map(n=>n.id);
      const pathPageKey=`path::${path}`;
      setMapPageAssignedIds(pathPageKey,noteIds);
      if(mapPageStack.length){
        const existingIdx=mapPageStack.indexOf(pathPageKey);
        if(existingIdx!==-1) mapPageStack=mapPageStack.slice(0,existingIdx+1);
        else mapPageStack[mapPageStack.length-1]=pathPageKey;
        nodePos={};
        updateMapPagePath();
        forceLayout();
        drawMap();
        persistMapCriticalState();
        saveLastViewState();
        return;
      }
      enterMapSubpage(pathPageKey);
    });
    btn.addEventListener('dblclick',ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      const path=safeStr(btn.dataset.treeNavPath||'').trim();
      if(!path) return;
      const op=prompt(`編輯路徑：輸入新路徑名稱。\n若要刪除此路徑，請輸入 /delete`,path);
      if(op===null) return;
      const next=safeStr(op).trim();
      if(!next) return;
      if(next==='/delete'){
        if(!confirm(`確定刪除路徑「${path}」？\n此路徑下筆記會移除該路徑前綴。`)) return;
        const changed=deletePathForNotes(path);
        persistPathStructureChange(changed,count=>`已刪除路徑，更新 ${count} 筆筆記`);
        return;
      }
      const changed=replacePathPrefixForNotes(path,next);
      persistPathStructureChange(changed,count=>`路徑已更新，共 ${count} 筆`);
    });
  });
  body.querySelectorAll('[data-tree-move-up-path]').forEach(btn=>btn.addEventListener('click',ev=>{
    ev.stopPropagation();
    const path=safeStr(btn.dataset.treeMoveUpPath||'').trim();
    if(!path) return;
    const segs=notePathSegments({path});
    if(!segs.length) return;
    const label=segs[segs.length-1];
    const parent=segs.slice(0,-1).join('>');
    const parentKey=parent||'__root__';
    const siblings=Object.keys((()=>{
      const tree={items:{}};
      const ensure=(parts)=>{let c=tree;parts.forEach(part=>{c.items[part]=c.items[part]||{items:{}};c=c.items[part];});return c;};
      collectTreePathSegments(notes,notePathSegments).forEach(ensure);
      const cursor=segs.slice(0,-1).reduce((acc,part)=>acc&&acc.items?acc.items[part]:null,tree);
      return cursor&&cursor.items?cursor.items:{};
    })());
    const ordered=(Array.isArray(mapTreePathOrder[parentKey])?mapTreePathOrder[parentKey].filter(v=>siblings.includes(v)):[]).concat(siblings.filter(v=>!(Array.isArray(mapTreePathOrder[parentKey])&&mapTreePathOrder[parentKey].includes(v))));
    const idx=ordered.indexOf(label);
    if(idx<=0){ showToast('已在最上方'); return; }
    [ordered[idx-1],ordered[idx]]=[ordered[idx],ordered[idx-1]];
    mapTreePathOrder[parentKey]=ordered;
    saveDataDeferred();
    buildMapTreeIndex(list);
  }));
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
    const type=isAuxnodeNode(n)?{label:'',color:'#A855F7'}:typeByKey(n.type),box=getMapCardBox(n.id),halfW=box.width/2,halfH=box.height/2;
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
    grp.addEventListener('click',e=>{
      e.stopPropagation();
      if(handleMapNodeLinkTap(n.id)) return;
      showMapInfo(n.id);
      openMapPopup(n.id);
      highlightNode(n.id);
    });
    grp.addEventListener('dblclick',e=>{
      e.stopPropagation();
      if(isAuxnodeNode(n)) return;
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
    if(isAuxnodeNode(node)){
      goBtn.style.display='none';
    }else{
      goBtn.style.display='block';
      goBtn.onclick=()=>{openId=id;openForm(true);closeMapPopup();};
    }
  }
}
function showMapInfo(id){
  const n=mapNodeById(id);if(!n)return;
  const auxnode=isAuxnodeNode(n);
  const tp=auxnode?{label:'',color:'#A855F7'}:typeByKey(n.type),related=links.filter(l=>l.from===id||l.to===id);
  const quickWrap=g('mp-link-quick-wrap');
  const quickInput=g('mp-link-search');
  g('mpBadge').textContent=tp.label;g('mpBadge').style.background=tp.color;g('mpTitle').textContent=n.title;
  renderMapReviewCard(n);
  const mpDomainEl=g('mpDomain');
  if(mpDomainEl){
    mpDomainEl.textContent='';
    mpDomainEl.style.display='none';
  }
  if(quickWrap){
    quickWrap.style.display=auxnode?'flex':'none';
    if(quickInput){
      quickInput.value='';
      quickInput.dataset.sourceId=auxnode?String(id):'';
    }
    renderMapPopupQuickLinkSearch(auxnode?id:null);
  }
  const currentCenterIds=getMapCentersFromScopes();
  const setCenterBtn=document.createElement('button');setCenterBtn.className='mp-action-btn mp-action-secondary mp-set-center';
  setCenterBtn.textContent=currentCenterIds.includes(id)?'✓ 已核心':'⭐ 設核心';
  setCenterBtn.onclick=async()=>{
    const added=toggleMapCenterForCurrentScope(id,{updateGlobal:true});
    nodePos={};
    forceLayout();
    drawMap();
    const saveResult=await persistMapCriticalState();
    closeMapPopup();
    if(!saveResult||saveResult.ok===false){
      showToast('儲存失敗，請稍後重試');
      return;
    }
    showToast(added?`已新增「${n.title}」為核心點（僅此頁）`:`已移除「${n.title}」核心點（僅此頁）`);
  };
  const goBtn=g('mpGoto');
  const hasSubpage=hasSubpageForNode(id);
  const linkStartBtn=document.createElement('button');
  linkStartBtn.className='mp-action-btn mp-action-secondary mp-link-start-btn';
  linkStartBtn.textContent=mapLinkSourceId===id?'✖ 取消起點':'🔗 設起點';
  linkStartBtn.onclick=()=>{
    if(mapLinkSourceId===id) clearMapLinkSource({silent:true});
    else setMapLinkSource(id);
    closeMapPopup();
  };
  const hideFromPageBtn=document.createElement('button');
  hideFromPageBtn.className='mp-action-btn mp-action-danger mp-hide-page-btn';
  hideFromPageBtn.textContent='🙈 取消顯示';
  hideFromPageBtn.onclick=()=>{
    if(!unassignNoteFromMapPage(id)){
      showToast('無法隱藏此點');
      return;
    }
    if(mapLinkSourceId===id) clearMapLinkSource({silent:true});
    persistMapCriticalState();
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
    if(hasSubpage&&isNodeInCurrentSubpage(id)){
      const subpageBtn=document.createElement('button');
      subpageBtn.className='mp-action-btn mp-action-secondary mp-subpage-btn';
      subpageBtn.textContent='📄 進子頁';
      subpageBtn.onclick=()=>{ closeMapPopup(); enterMapSubpage(id); };
      goBtn.parentNode.insertBefore(subpageBtn,goBtn);
    }
    let auxnodeEditBtn=goBtn.parentNode.querySelector('.mp-auxnode-edit-btn');
    let auxnodeDeleteBtn=goBtn.parentNode.querySelector('.mp-auxnode-delete-btn');
    auxnodeEditBtn?.remove();auxnodeDeleteBtn?.remove();
    if(auxnode){
      auxnodeEditBtn=document.createElement('button');
      auxnodeEditBtn.className='mp-auxnode-edit-btn mp-auxnode-btn edit';
      auxnodeEditBtn.textContent='✏️ 編輯';
      auxnodeEditBtn.onclick=()=>editMapAuxnode(id);
      auxnodeDeleteBtn=document.createElement('button');
      auxnodeDeleteBtn.className='mp-auxnode-delete-btn mp-auxnode-btn delete';
      auxnodeDeleteBtn.textContent='🗑️ 刪除';
      auxnodeDeleteBtn.onclick=()=>deleteMapAuxnode(id);
      goBtn.parentNode.insertBefore(auxnodeEditBtn,goBtn);
      goBtn.parentNode.insertBefore(auxnodeDeleteBtn,goBtn);
    }
  }
  const linksEl=g('mpLinks');
  const slashLinks=extractSlashLinks(n.detail,id);
  if(!related.length&&!slashLinks.length){linksEl.innerHTML='<span class="mp-no-links">尚無關聯</span>';}
  else{
    const relationRows=[];
    related.forEach(l=>{
      const otherId=l.from===id?l.to:l.from,other=mapNodeById(otherId),name=other?other.title:'（已刪除）',relNote=normalizeRelationNote(l.note);
      relationRows.push(`<div class="mp-link-row"><span class="mp-link-badge" style="background:${LINK_COLOR}">關聯</span><span class="mp-link-name" data-nid="${otherId}">${name}</span>${relNote?`<span class="chip">${escapeHtml(relNote)}</span>`:''}</div>`);
    });
    const slashHtml=slashLinks.map(item=>`<div class="mp-link-row"><span class="mp-link-badge" style="background:#64748B">/ 連結</span><span class="mp-link-name" data-nid="${item.id}">${escapeHtml(item.title)}</span></div>`).join('');
    linksEl.innerHTML=relationRows.join('')+slashHtml;
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
function extractLawLines(text){
  return safeStr(text).split('\n').map(v=>v.trim()).filter(v=>/^第.+條/.test(v)).slice(0,2);
}
function renderMapReviewCard(){
  const root=g('mpReview');
  if(root) root.innerHTML='';
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
  const sch=g('mapFilterGroup'),ssc=g('mapFilterPart'),sd=g('mapDepthSel');
  if(appStateFacadeMap) appStateFacadeMap.updateMapFilter({sub:'all',group:'all',part:'all'});
  mapFilter.sub='all';
  mapFilter.group='all';
  mapFilter.part='all';
  if(sch){sch.innerHTML='<option value="all">全部</option>';sch.value='all';}
  if(ssc){ssc.innerHTML='<option value="all">全部</option>';ssc.value='all';}
  if(sd)sd.value=['all','1','2','3'].includes(mapDepth)?mapDepth:'all';
  updateMapPinnedGroup();
}
function laneContextLabelText(){ return '目前篩選：全部'; }
function ensureLanePanel(){
  const existing=g('lanePanel');if(existing)return existing;
  const canvas=g('mapCanvas');if(!canvas)return null;
  const panel=document.createElement('div');panel.id='lanePanel';
  panel.innerHTML=`<div class="lane-panel-head"><span class="lane-panel-title">泳道設定</span><button class="pcls" id="lanePanelClose">×</button></div><div class="lane-panel-desc">可依「目前篩選」分開設定泳道名稱。</div><div id="laneContextLabel"></div><div class="lane-count-row"><label for="laneCountInput">泳道數量</label><input id="laneCountInput" type="number" min="${MIN_LANE_COUNT}" max="${MAX_LANE_COUNT}" value="${DEFAULT_LANE_NAMES.length}"></div><div id="laneInputs"></div><div class="lane-panel-actions"><button class="fbtn bcl" id="laneResetBtn">恢復預設</button><button class="fbtn bsv" id="laneSaveBtn">儲存</button></div>`;
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
  else if(cmd==='auxnode'){
    showToast('「」功能已移除');
  }
  else if(cmd==='map') toggleMapView(!isMapOpen);
  else if(cmd==='calendar') toggleCalendarView(currentView!=='calendar');
  else if(cmd==='duplicate') duplicateMapNode();
  else if(cmd==='delete') deleteMapNode();
}
function bindTouchQuickActions(){
  const treeFilterInput=g('mapTreeFilterInput');
  if(treeFilterInput){
    treeFilterInput.value=mapTreeFilterQ||'';
    treeFilterInput.addEventListener('input',debounce(()=>{
      mapTreeFilterQ=safeStr(treeFilterInput.value||'');
      if(isMapOpen) buildMapTreeIndex(visibleNotes());
    },120));
  }
  try{ mapTreeSidebarOpen=localStorage.getItem(MAP_TREE_SIDEBAR_OPEN_KEY)==='1'; }catch(e){ mapTreeSidebarOpen=false; }
  setMapTreeSidebarOpen(mapTreeSidebarOpen);
  // 保留路徑樹展開/收合狀態，避免每次重新載入都重置。
  on('mapTreeToggleBtn','click',()=>{
    const sidebar=g('mapTreeSidebar');
    const willOpen=!(sidebar&&sidebar.classList.contains('open'));
    setMapTreeSidebarOpen(willOpen);
  });
  on('mapTreeCloseBtn','click',()=>{
    setMapTreeSidebarOpen(false);
  });
}

function bindCoreButtons(){
  const bind=(id,fn)=>{const el=g(id);if(el)el.onclick=fn;};
  bind('addBtn',()=>openForm(false));
  bind('editBtn',()=>{if(!openId){showToast('請先開啟一筆筆記');return;}openForm(true);});
  bind('copyBtn',copyNoteToClipboard);
  bind('dupBtn',duplicateNote);
  bind('dpClose',closeDetail);bind('fpClose',closeForm);
  bind('fpSave',saveNote);bind('delBtn',deleteNote);
  bind('fpDeleteBtn',()=>deleteMapNode(openId));
  bind('fpDuplicateBtn',()=>duplicateMapNode(openId));
  bind('fpCopyBtn',()=>copyNoteToClipboard(openId));
}
function bindPathManagerNav(){
  g('pathCategoryNav')?.addEventListener('click',ev=>{
    const btn=ev.target.closest('.tag-nav-btn');
    if(!btn) return;
    activePathCategory=btn.dataset.category||'type';
    renderPathLists();
  });
  on('tagSettingsBtn','click',()=>g('tagGlobalOptions')?.classList.toggle('open'));
}

// ==================== AI 功能 ====================
function renderAiModelOptions(){
  const provider=getAiProvider();
  const list=provider==='groq'?GROQ_MODELS:AI_MODELS;
  const sel=g('aiModelSel');
  if(!sel) return;
  const fallback=list[0]?.id||'';
  const saved=getAiModel();
  const selected=list.some(m=>m.id===saved)?saved:fallback;
  sel.innerHTML=list.map(m=>`<option value="${m.id}"${m.id===selected?' selected':''}>${m.label}</option>`).join('');
}
function openAiSettings(){ g('aiKeyInput').value=getAiKey();const psel=g('aiProviderSel');if(psel)psel.value=getAiProvider();renderAiModelOptions();_aiPendingAction=null;g('aiKeyModal').classList.add('open'); }
function requireAiKey(action){ const k=getAiKey();if(k){action(k);return;}_aiPendingAction=action;g('aiKeyInput').value='';const psel=g('aiProviderSel');if(psel)psel.value=getAiProvider();renderAiModelOptions();g('aiKeyModal').classList.add('open'); }
