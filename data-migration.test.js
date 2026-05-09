const test=require('node:test');
const assert=require('node:assert/strict');
const { backfillNoteUids, migratePathOverridesIntoNotes, clearLegacyDomainsFromNotes, detectIdentityDriftRisk }=require('./data/migrations.js');

function createLocalStorage(seed={}){
  const map=new Map(Object.entries(seed));
  return {
    getItem(k){ return map.has(k)?map.get(k):null; },
    setItem(k,v){ map.set(k,String(v)); },
    removeItem(k){ map.delete(k); }
  };
}

test('migratePathOverridesIntoNotes migrates matching note and aux-node paths once', ()=>{
  const localStorage=createLocalStorage();
  const notes=[{id:1,path:''},{id:2,path:'already'}];
  const mapAuxNodes=[{id:3,path:''}];
  const removed=[];
  const toasts=[];
  const changed=migratePathOverridesIntoNotes({
    localStorage,
    readJSON:(key,def)=>key==='klaws_note_paths_v1'?{'1':'A > B','3':'M > N','9':'Z'}:def,
    notesRef:{value:notes},
    mapAuxNodesRef:{value:mapAuxNodes},
    normalizePathText:(v)=>String(v).replace(/\s+/g,''),
    removeLocal:(k)=>removed.push(k),
    writeLocal:(k,v)=>localStorage.setItem(k,v),
    showToast:(msg)=>toasts.push(msg)
  });

  assert.equal(changed,true);
  assert.equal(notes[0].path,'A>B');
  assert.equal(notes[1].path,'already');
  assert.equal(mapAuxNodes[0].path,'M>N');
  assert.deepEqual(removed,['klaws_note_paths_v1']);
  assert.equal(localStorage.getItem('klaws_path_override_migrated_v1'),'1');
  assert.equal(toasts.length,1);

  const secondRun=migratePathOverridesIntoNotes({
    localStorage,
    readJSON:()=>({}),
    notesRef:{value:notes},
    mapAuxNodesRef:{value:mapAuxNodes},
    normalizePathText:(v)=>v,
    removeLocal:()=>assert.fail('removeLocal should not run on rerun'),
    writeLocal:()=>assert.fail('writeLocal should not run on rerun'),
    showToast:()=>assert.fail('showToast should not run on rerun')
  });
  assert.equal(secondRun,false);
});

test('clearLegacyDomainsFromNotes clears legacy fields and resets domain filters', ()=>{
  const notes=[{id:1,domain:'civil',domains:['civil']},{id:2,domain:'',domains:[]}];
  const mapAuxNodes=[{id:3,domain:'criminal',domains:['criminal']}];
  const domainsRef={value:[{key:'civil'}]};
  const mapFilterRef={value:{sub:'civil',group:'all',part:'all'}};

  const changed=clearLegacyDomainsFromNotes({
    notesRef:{value:notes},
    mapAuxNodesRef:{value:mapAuxNodes},
    safeStr:(v)=>typeof v==='string'?v:String(v??''),
    domainsRef,
    mapFilterRef
  });

  assert.equal(changed,true);
  assert.equal(notes[0].domain,'');
  assert.deepEqual(notes[0].domains,[]);
  assert.equal(mapAuxNodes[0].domain,'');
  assert.deepEqual(mapAuxNodes[0].domains,[]);
  assert.deepEqual(domainsRef.value,[]);
  assert.equal(mapFilterRef.value.sub,'all');

  const noChange=clearLegacyDomainsFromNotes({
    notesRef:{value:notes},
    mapAuxNodesRef:{value:mapAuxNodes},
    safeStr:(v)=>typeof v==='string'?v:String(v??''),
    domainsRef,
    mapFilterRef
  });
  assert.equal(noChange,false);
});


test('backfillNoteUids assigns uid to legacy records', ()=>{
  const notes=[{id:1},{id:2,uid:'u2'}];
  const mapAuxNodes=[{id:3}];
  const changed=backfillNoteUids({notesRef:{value:notes},mapAuxNodesRef:{value:mapAuxNodes},ensureNoteUid:(n)=>n.uid||`uid_${n.id}`});
  assert.equal(changed,true);
  assert.equal(notes[0].uid,'uid_1');
  assert.equal(notes[1].uid,'u2');
  assert.equal(mapAuxNodes[0].uid,'uid_3');
});


test('migratePathOverridesIntoNotes prefers uid across reorder/reindex/import merge scenarios', ()=>{
  const localStorage=createLocalStorage();
  const notes=[
    {id:2,uid:'uid_a',path:''},
    {id:1,uid:'uid_b',path:''}
  ];
  const changed=migratePathOverridesIntoNotes({
    localStorage,
    readJSON:(key,def)=>key==='klaws_note_paths_v1'?{uid_a:'Path>A',uid_b:'Path>B','1':'Wrong>B','2':'Wrong>A'}:def,
    notesRef:{value:notes},
    mapAuxNodesRef:{value:[]},
    normalizePathText:v=>String(v),
    removeLocal:()=>{},
    writeLocal:(k,v)=>localStorage.setItem(k,v),
    showToast:()=>{}
  });
  assert.equal(changed,true);
  assert.equal(notes[0].path,'Path>A');
  assert.equal(notes[1].path,'Path>B');
});


test('integration flow keeps note paths stable across sort/save/reload/import-merge/reload', ()=>{
  const localStorage=createLocalStorage();
  const overrides={uid_note:'Law>Civil',uid_aux:'Map>Inbox'};
  const sortByIdDesc=list=>list.slice().sort((a,b)=>b.id-a.id);
  let notes=[{id:10,uid:'uid_note',path:'',title:'A'},{id:5,uid:'uid_other',path:'Other'}];
  let mapAuxNodes=[{id:77,uid:'uid_aux',path:''}];
  migratePathOverridesIntoNotes({localStorage,readJSON:(k,d)=>k==='klaws_note_paths_v1'?overrides:d,notesRef:{value:notes},mapAuxNodesRef:{value:mapAuxNodes},normalizePathText:v=>v,removeLocal:()=>{},writeLocal:(k,v)=>localStorage.setItem(k,v),showToast:()=>{}});
  notes=sortByIdDesc(notes);
  const saved=JSON.parse(JSON.stringify({notes,mapAuxNodes,links:[{id:1,from:10,to:77,rel:'ref'}]}));
  notes=JSON.parse(JSON.stringify(saved.notes));
  mapAuxNodes=JSON.parse(JSON.stringify(saved.mapAuxNodes));
  const imported={notes:[{id:1,uid:'uid_note',path:'Wrong>Path'}],mapAuxNodes:[{id:2,uid:'uid_aux',path:'Wrong>Aux'}],links:[{id:2,from:1,to:2,rel:'ref'}]};
  const byUid=new Map([...notes,...mapAuxNodes].map(n=>[n.uid,n.path]));
  [...imported.notes,...imported.mapAuxNodes].forEach(n=>{ if(byUid.has(n.uid)) n.path=byUid.get(n.uid); });
  const merged={notes:[...notes,...imported.notes],mapAuxNodes:[...mapAuxNodes,...imported.mapAuxNodes],links:[...saved.links,...imported.links]};
  const reloaded=JSON.parse(JSON.stringify(merged));
  const finalByUid=new Map([...reloaded.notes,...reloaded.mapAuxNodes].map(n=>[n.uid,n.path]));
  assert.equal(finalByUid.get('uid_note'),'Law>Civil');
  assert.equal(finalByUid.get('uid_aux'),'Map>Inbox');
});

test('detectIdentityDriftRisk flags mixed notes/mapAux conflicts and broken links', ()=>{
  const out=detectIdentityDriftRisk({
    notesRef:{value:[{id:1,uid:'dup',path:'A'}]},
    mapAuxNodesRef:{value:[{id:9,uid:'dup',path:'B'}]},
    linksRef:{value:[{id:3,from:1,to:99}]},
    safeStr:(v)=>typeof v==='string'?v:String(v??'')
  });
  assert.equal(out.ok,false);
  assert.equal(out.issues.some(x=>x.type==='uid-conflict'),true);
  assert.equal(out.issues.some(x=>x.type==='broken-links'),true);
});

test('migratePathOverridesIntoNotes does not apply A path to B after id changes', ()=>{
  const localStorage=createLocalStorage();
  const notes=[{id:1,uid:'uid_B',path:'B0'},{id:2,uid:'uid_A',path:'A0'}];
  migratePathOverridesIntoNotes({
    localStorage,
    readJSON:(k,d)=>k==='klaws_note_paths_v1'?{'1':'Path-A-old-id','uid_A':'Path-A-new','uid_B':'Path-B-new'}:d,
    notesRef:{value:notes},
    mapAuxNodesRef:{value:[]},
    normalizePathText:v=>String(v),
    removeLocal:()=>{},
    writeLocal:(k,v)=>localStorage.setItem(k,v),
    showToast:()=>{}
  });
  assert.equal(notes[0].path,'Path-B-new');
  assert.equal(notes[1].path,'Path-A-new');
});
