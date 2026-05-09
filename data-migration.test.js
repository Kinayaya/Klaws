const test=require('node:test');
const assert=require('node:assert/strict');
const { backfillNoteUids, migratePathOverridesIntoNotes, clearLegacyDomainsFromNotes }=require('./data/migrations.js');

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
