'use strict';
const EXAMPLE = `# Student course enrollment
# A many-to-many relationship, resolved.

| Entity | Attribute | Type | Constraints |
| --- | --- | --- | --- |
| Student | student_id | INT | PK |
| | student_name | VARCHAR | NOT NULL |
| | email | VARCHAR | UNIQUE |
| Enrollment | enrollment_id | INT | PK |
| | student_id | INT | FK (Student.student_id) |
| | course_id | INT | FK (Course.course_id) |
| | enrolled_at | DATE | NOT NULL |
| Course | course_id | INT | PK |
| | course_title | VARCHAR | NOT NULL |
| | credits | INT | |
`;
const clean = s => s.replace(/[*`]/g, '').replace(/\$|\\rightarrow/g, m => m === '$' ? '' : '→').trim();
function parseMarkdown(source) {
  const entities = [], warnings = []; let current = null, headers = null, fence = false;
  const entity = name => { name = clean(name).replace(/\s*\([^)]*\)\s*$/, '').trim(); current = entities.find(e => e.name === name); if (!current) {current = {name, fields:[]}; entities.push(current);} };
  const field = (name, type, constraints, line) => {
    name = clean(name).replace(/^[🔑🔗👤📚\s]+/u, '').trim(); if (!name || !current) return;
    if (current.fields.some(f => f.name === name)) {warnings.push(`Line ${line}: duplicate attribute ${current.name}.${name}.`);return;}
    const c = clean(constraints); const fk = c.match(/\bFK\b\s*(?:\(\s*|(?:->|→)\s*)?([\w-]+)\.([\w-]+)/i);
    if (/\bFK\b/i.test(c) && !fk) warnings.push(`Line ${line}: use FK (Entity.attribute).`);
    current.fields.push({name,type:clean(type)||'—',pk:/\bPK\b/i.test(c),fk:fk ? {entity:fk[1],field:fk[2]} : null,constraints:c});
  };
  source.split('\n').forEach((raw,index) => {
    const s=raw.trim(), n=index+1;
    if (s.startsWith('```')) {fence=!fence;return;} if(fence || !s) return;
    if(s.startsWith('|')) {
      const cells=s.replace(/^\||\|$/g,'').split('|').map(clean);
      if(cells.every(c=>/^:?-+:?$/.test(c))) return;
      if(cells.some(c=>/^entity$/i.test(c)) && cells.some(c=>/^attribute$/i.test(c))) {headers=cells.map(c=>c.toLowerCase());return;}
      if(!headers) {warnings.push(`Line ${n}: table needs Entity and Attribute headers.`);return;}
      const get=k=>cells[headers.indexOf(k)]||'';
      if(get('entity')) entity(get('entity'));
      if(!current) warnings.push(`Line ${n}: specify an entity first.`);
      field(get('attribute'),get('type'),get('constraints'),n);return;
    }
    const label=clean(s.replace(/^[-*+]\s+/,''));
    const tagged=label.match(/^\[(?:Entity|Junction Table)\]\s+([\w-]+)/i);
    const heading=s.match(/^#{2,3}\s+(.+)/);
    if(tagged || heading) {entity(tagged?tagged[1]:heading[1]);return;}
    if(/^[-*+]\s/.test(s) && !/^Relationship:/i.test(label)) {
      const value=label.replace(/^[🔑🔗👤📚\s]+/u,''); const match=value.match(/^([\w-]+)(?:\s+([A-Za-z]+(?:\([^)]*\))?))?(.*)$/);
      if(match) {let type=match[2]||'', rest=match[3]||'';if(/^(PK|FK|NOT|UNIQUE)$/i.test(type)){rest=type+rest;type='';}field(match[1],type,rest,n);}
    }
  });
  for(const e of entities) for(const f of e.fields) if(f.fk && !entities.some(t=>t.name===f.fk.entity && t.fields.some(a=>a.name===f.fk.field))) warnings.push(`Unresolved reference: ${e.name}.${f.name} → ${f.fk.entity}.${f.fk.field}`);
  if(!entities.length && source.trim()) warnings.push('No entities found. Use a Markdown table or ## Entity headings.');
  return {entities,warnings};
}
const W=258, rowH=32, TABLE_GAP=64, height=e=>58+e.fields.length*rowH+12;
// Keep a 32-unit clear margin around each table (64 units between tables).
function overlaps(a, b) {
  return a.x < b.x + W + TABLE_GAP && a.x + W + TABLE_GAP > b.x &&
    a.y < b.y + b.h + TABLE_GAP && a.y + a.h + TABLE_GAP > b.y;
}
function freePosition(entity, desired, occupied) {
  const box={...desired,h:height(entity)};
  if (!occupied.some(other=>overlaps(box,other))) return desired;
  const xs=[desired.x], ys=[desired.y];
  for(const other of occupied){xs.push(other.x-W-TABLE_GAP,other.x+W+TABLE_GAP);ys.push(other.y-box.h-TABLE_GAP,other.y+other.h+TABLE_GAP);}
  let best=null, distance=Infinity;
  for(const x of xs) for(const y of ys){const d=(x-desired.x)**2+(y-desired.y)**2;if(d<distance&&!occupied.some(other=>overlaps({x,y,h:box.h},other))){best={x,y};distance=d;}}
  return best;
}
function separateTables(entities, positions) {
  const occupied=[];
  for(const entity of entities){const p=freePosition(entity,positions[entity.name],occupied);positions[entity.name]=p;occupied.push({...p,h:height(entity)});}
}
function connectedSequence(entities, start) {
  const neighbors=new Map(entities.map(e=>[e.name,new Set()]));
  for(const entity of entities) for(const field of entity.fields){const target=field.fk&&entities.find(e=>e.name===field.fk.entity&&e.fields.some(f=>f.name===field.fk.field));if(target){neighbors.get(entity.name).add(target.name);neighbors.get(target.name).add(entity.name);}}
  const visited=new Set(), pending=neighbors.has(start)?[start]:[];
  while(pending.length){const name=pending.pop();if(visited.has(name))continue;visited.add(name);for(const next of neighbors.get(name))if(!visited.has(next))pending.push(next);}
  return visited;
}
function searchSchema(entities,query){
  const term=query.trim().toLowerCase();
  if(!term)return [];
  return entities.flatMap(entity=>{
    const fields=entity.fields.filter(field=>field.name.toLowerCase().includes(term));
    return entity.name.toLowerCase().includes(term)||fields.length?[{name:entity.name,fields:fields.map(f=>f.name)}]:[];
  });
}
const $=id=>document.getElementById(id), editor=$('editor'), canvas=$('canvas'), world=$('world');
let positions={}, model, view={x:0,y:0,k:1}, history=[], cursor=-1, timer, gesture, toastTimer, selectedRelationship=null, searchQuery='', searchMatches=[], searchFocused=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const short=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s;
function state(){return {markdown:editor.value,positions:JSON.parse(JSON.stringify(positions))};}
function save(){try{localStorage.setItem('relate.project.v1',JSON.stringify(state()));$('saveStatus').textContent='Saved on this device';}catch{$('saveStatus').textContent='Storage unavailable — export to save';}}
function remember(){const s=JSON.stringify(state());if(history[cursor]===s)return;history=history.slice(0,cursor+1);history.push(s);if(history.length>80)history.shift();cursor=history.length-1;buttons();save();}
function buttons(){$('undo').disabled=cursor<=0;$('redo').disabled=cursor>=history.length-1;}
function restore(delta){clearTimeout(timer);if(editor.value!==JSON.parse(history[cursor]).markdown)update();const next=cursor+delta;if(next<0||next>=history.length)return;cursor=next;const s=JSON.parse(history[cursor]);editor.value=s.markdown;positions=s.positions;update(false);buttons();save();}
function update(record=true){model=parseMarkdown(editor.value);model.entities.forEach((e,i)=>{if(!Object.hasOwn(positions,e.name))Object.defineProperty(positions,e.name,{value:{x:60+(i%3)*350,y:90+Math.floor(i/3)*320},writable:true,enumerable:true,configurable:true});});separateTables(model.entities,positions);searchMatches=searchSchema(model.entities,searchQuery);if(searchFocused&&!searchMatches.some(m=>m.name===searchFocused))searchFocused=null;renderSearchResults();if(selectedRelationship&&!model.entities.some(e=>e.name===selectedRelationship.entity&&e.fields.some(f=>f.name===selectedRelationship.field&&f.fk?.entity===selectedRelationship.target&&f.fk?.field===selectedRelationship.targetField)))selectedRelationship=null;$('diagnostics').textContent=model.warnings.join('\n');$('stats').textContent=`${model.entities.length} entities  /  ${model.entities.reduce((n,e)=>n+e.fields.length,0)} attributes  /  ${model.entities.reduce((n,e)=>n+e.fields.filter(f=>f.fk).length,0)} relationships`;$('empty').hidden=!!model.entities.length;render();if(record)remember();}
function render(){
 let links='', cards='';
 const matchNames=new Set(searchMatches.map(m=>m.name));
 const sequence=connectedSequence(model.entities,selectedRelationship?.entity);
 $('selectionStatus').textContent=selectedRelationship?`${selectedRelationship.entity}.${selectedRelationship.field} → ${selectedRelationship.target}.${selectedRelationship.targetField} · ${sequence.size} connected tables`:'';
 $('selectionBar').hidden=!selectedRelationship;
 for(const e of model.entities){const p=positions[e.name];for(const [i,f] of e.fields.entries()) {if(!f.fk)continue;const target=model.entities.find(t=>t.name===f.fk.entity);if(!target)continue;const j=target.fields.findIndex(a=>a.name===f.fk.field);if(j<0)continue;const q=positions[target.name],right=q.x>=p.x;let x=p.x+(right?W:0),y=p.y+74+i*rowH,tx=q.x+(right?0:W),ty=q.y+74+j*rowH;let path;
 if(target===e){x=p.x+W;tx=x;path=`M ${x} ${y} C ${x+85} ${y}, ${tx+85} ${ty}, ${tx} ${ty}`;}else{const bend=Math.max(65,Math.abs(tx-x)/2);path=`M ${x} ${y} C ${x+(right?bend:-bend)} ${y}, ${tx+(right?-bend:bend)} ${ty}, ${tx} ${ty}`;}
 const active=sequence.has(e.name), picked=selectedRelationship?.entity===e.name&&selectedRelationship?.field===f.name;
 const label=`${e.name}.${f.name} → ${target.name}.${f.fk.field}`;
 links+=`<g class="relationship" data-entity="${esc(e.name)}" data-field="${esc(f.name)}" data-target="${esc(target.name)}" data-target-field="${esc(f.fk.field)}" role="button" tabindex="0" aria-label="Highlight connected sequence: ${esc(label)}" aria-pressed="${picked}" opacity="${selectedRelationship&&!active?0.2:1}"><title>${esc(label)} — click to highlight connected sequence</title><path class="relationship-hit" d="${path}" fill="none" stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke" pointer-events="stroke"/><path class="relationship-line" d="${path}" fill="none" stroke="${picked?'#b86b19':active?'#39764d':'#90a580'}" stroke-width="${picked?4:active?3:1.7}"  pointer-events="none"/><circle cx="${tx}" cy="${ty}" r="3" fill="${active?'#39764d':'#739066'}"/><text x="${x+(right?13:-21)}" y="${y-9}" fill="#648058" font-size="11">N</text><text x="${tx+(right?-17:10)}" y="${ty-9}" fill="#648058" font-size="11">1</text></g>`;

 }
 cards+=`<g class="entity" opacity="${(selectedRelationship&&!sequence.has(e.name))||(searchQuery.trim()&&!matchNames.has(e.name))?0.25:1}" data-name="${esc(e.name)}" transform="translate(${p.x} ${p.y})"><title>${esc(e.name)} — drag to move</title><rect x="0" y="4" width="${W}" height="${height(e)}" rx="10" fill="#294c3510"/><rect class="card-border" width="${W}" height="${height(e)}" rx="10" fill="white" stroke="${searchFocused===e.name?'#b86b19':matchNames.has(e.name)||sequence.has(e.name)?'#39764d':'#d8e1d0'}" stroke-width="${matchNames.has(e.name)||sequence.has(e.name)?2.5:1}"/><path d="M 10 0 H ${W-10} Q ${W} 0 ${W} 10 V 48 H 0 V 10 Q 0 0 10 0" fill="#eaf0df"/><rect x="16" y="16" width="15" height="15" rx="3" fill="none" stroke="#7f9867"/><path d="M 16 21 H31 M21 16 V31" stroke="#7f9867"/><text x="41" y="30" font-size="14" font-weight="600" fill="#304a2d">${esc(short(e.name,23))}</text><text x="${W-19}" y="29" font-size="11" text-anchor="end" fill="#8fa07d">${e.fields.length}</text>`;
 e.fields.forEach((f,i)=>{const y=74+i*rowH;cards+=`<g>${searchQuery.trim()&&f.name.toLowerCase().includes(searchQuery.trim().toLowerCase())?`<rect x="8" y="${y-17}" width="${W-16}" height="27" rx="4" fill="#f6e9bf"/>`:''}<title>${esc(f.name+' '+f.type+' '+f.constraints)}</title>${i?`<line x1="15" y1="${y-19}" x2="${W-15}" y2="${y-19}" stroke="#f0f3ed"/>`:''}<text x="16" y="${y}" font-size="9" font-weight="700" fill="${f.pk?'#9a9950':'#639480'}">${f.pk?'PK':f.fk?'FK':'·'}</text><text x="42" y="${y}" font-size="11" fill="#425344">${esc(short(f.name,22))}</text><text x="${W-16}" y="${y}" font-size="9" text-anchor="end" fill="#95a08d">${esc(short(f.type,11))}</text></g>`;});cards+='</g>';
 }
 world.innerHTML=links+cards;transform();
}
function transform(){world.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.k})`);$('zoomReset').textContent=Math.round(view.k*100)+'%';}
function bounds(){if(!model.entities.length)return{x:0,y:0,w:600,h:400};const ps=model.entities.map(e=>({...positions[e.name],h:height(e)}));const x=Math.min(...ps.map(p=>p.x))-50,y=Math.min(...ps.map(p=>p.y))-50;return{x,y,w:Math.max(...ps.map(p=>p.x+W+90))-x,h:Math.max(...ps.map(p=>p.y+p.h))-y+50};}
function fit(){const b=bounds();view.k=Math.min(1.25,Math.max(.15,Math.min((canvas.clientWidth-50)/b.w,(canvas.clientHeight-80)/b.h)));view.x=(canvas.clientWidth-b.w*view.k)/2-b.x*view.k;view.y=(canvas.clientHeight-b.h*view.k)/2-b.y*view.k;transform();}
function zoom(factor,x=canvas.clientWidth/2,y=canvas.clientHeight/2){const k=Math.max(.15,Math.min(3,view.k*factor));view.x=x-(x-view.x)*k/view.k;view.y=y-(y-view.y)*k/view.k;view.k=k;transform();}
function layout(){let y=80;for(let i=0;i<model.entities.length;i+=3){const group=model.entities.slice(i,i+3);group.forEach((e,j)=>positions[e.name]={x:50+j*350,y});y+=Math.max(...group.map(height))+90;}render();remember();fit();}
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',3000);}
editor.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(update,350);});
canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0 || e.target.closest('button') || e.target.closest('.relationship'))return;canvas.focus();const card=e.target.closest('.entity');gesture={id:e.pointerId,x:e.clientX,y:e.clientY,name:card?.dataset.name,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture.x=e.clientX;gesture.y=e.clientY;gesture.moved ||= Math.abs(dx)+Math.abs(dy)>0;if(gesture.name){const entity=model.entities.find(e=>e.name===gesture.name);const occupied=model.entities.filter(e=>e.name!==gesture.name).map(e=>({...positions[e.name],h:height(e)}));const desired={x:positions[gesture.name].x+dx/view.k,y:positions[gesture.name].y+dy/view.k};if(!occupied.some(p=>overlaps({...desired,h:height(entity)},p)))positions[gesture.name]=desired;render();}else{view.x+=dx;view.y+=dy;transform();}});
function endGesture(){if(gesture?.name&&gesture.moved)remember();if(gesture&&!gesture.name&&!gesture.moved)clearSelection();gesture=null;}canvas.addEventListener('pointerup',endGesture);canvas.addEventListener('pointercancel',endGesture);
function clearSelection(){selectedRelationship=null;render();}
function selectRelationship(element){const {entity,field,target,targetField}=element.dataset;if(searchQuery.trim())clearSearch();selectedRelationship={entity,field,target,targetField};render();const replacement=[...world.querySelectorAll('.relationship')].find(el=>el.dataset.entity===entity&&el.dataset.field===field);replacement?.focus({preventScroll:true});}
canvas.addEventListener('click',e=>{const line=e.target.closest('.relationship');if(line)selectRelationship(line);});
canvas.addEventListener('keydown',e=>{if(e.key==='Escape'){clearSelection();canvas.focus();}const line=e.target.closest('.relationship');if(line&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectRelationship(line);}});
$('clearSelection').onclick=clearSelection;
canvas.addEventListener('keydown',e=>{if(e.target!==canvas)return;const moves={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]};if(moves[e.key]){e.preventDefault();view.x+=moves[e.key][0];view.y+=moves[e.key][1];transform();}if(e.key==='+'||e.key==='=')zoom(1.2);if(e.key==='-')zoom(1/1.2);if(e.key==='0')fit();});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restore(e.shiftKey?1:-1);}});
$('undo').onclick=()=>restore(-1);$('redo').onclick=()=>restore(1);$('fit').onclick=fit;$('layout').onclick=layout;$('zoomIn').onclick=()=>zoom(1.2);$('zoomOut').onclick=()=>zoom(1/1.2);$('zoomReset').onclick=()=>zoom(1/view.k);
$('example').onclick=()=>{editor.value=EXAMPLE;positions={};update();fit();toast('Example loaded · Undo to restore your work');};
$('help').onclick=$('syntax').onclick=()=>$('helpModal').showModal();$('export').onclick=()=>{clearTimeout(timer);update();$('exportModal').showModal();};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
function download(data,type,ext){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download='schema.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function svgExport(){const b=bounds();return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(b.w)}" height="${Math.ceil(b.h)}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" font-family="Arial, sans-serif"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#f5f7f2"/>${world.innerHTML}</svg>`;}
function textArt(){const blocks=model.entities.map(e=>{const rows=[e.name,...e.fields.map(f=>`${f.pk?'PK':f.fk?'FK':'  '} ${f.name} : ${f.type}`)];const w=Math.max(...rows.map(s=>s.length));const line='+'+'-'.repeat(w+2)+'+';return[line,`| ${rows[0].padEnd(w)} |`,line,...rows.slice(1).map(s=>`| ${s.padEnd(w)} |`),line].join('\n');});const links=model.entities.flatMap(e=>e.fields.filter(f=>f.fk).map(f=>`${f.fk.entity}.${f.fk.field} (1) ───< (N) ${e.name}.${f.name}`));return blocks.join('\n\n')+'\n\nRELATIONSHIPS\n'+links.join('\n')+'\n';}
async function exportFile(format){try{if(format==='md')download(editor.value,'text/markdown','md');if(format==='json')download(JSON.stringify({version:1,...state()},null,2),'application/json','json');if(format==='txt')download(textArt(),'text/plain','txt');if(format==='svg')download(svgExport(),'image/svg+xml','svg');if(format==='png'){const b=bounds();if(b.w*b.h*4>32e6||b.w*2>16000||b.h*2>16000)throw new Error('Diagram is too large for PNG. Use SVG instead.');const url=URL.createObjectURL(new Blob([svgExport()],{type:'image/svg+xml'}));try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});const c=document.createElement('canvas');c.width=Math.ceil(b.w*2);c.height=Math.ceil(b.h*2);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)throw new Error('PNG export failed. Try SVG.');download(blob,'image/png','png');}finally{URL.revokeObjectURL(url);}}$('exportModal').close();toast('Export ready');}catch(e){toast(e.message||'Export failed. Try SVG.');}}
document.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>exportFile(b.dataset.format));
function validateProject(data){if(!data||typeof data.markdown!=='string'||!data.positions||typeof data.positions!=='object'||Array.isArray(data.positions))throw new Error('Invalid project: expected markdown and positions.');const result={};for(const [key,p] of Object.entries(data.positions)){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>1e6||Math.abs(p.y)>1e6)throw new Error('Invalid table position.');Object.defineProperty(result,key,{value:{x:p.x,y:p.y},enumerable:true,writable:true,configurable:true});}return{markdown:data.markdown,positions:result};}
$('import').onclick=()=>$('file').click();$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>2e6)throw new Error('Please use a file smaller than 2 MB.');const source=await f.text();const data=f.name.toLowerCase().endsWith('.json')?validateProject(JSON.parse(source)):{markdown:source,positions:{}};clearTimeout(timer);update();editor.value=data.markdown;positions=data.positions;update();fit();toast('Imported · Undo to restore your work');}catch(err){toast(err.message);}finally{e.target.value='';}};
try{const saved=localStorage.getItem('relate.project.v1');if(saved){const s=validateProject(JSON.parse(saved));editor.value=s.markdown;positions=s.positions;}else editor.value=EXAMPLE;}catch{editor.value=EXAMPLE;}
update();requestAnimationFrame(fit);window.addEventListener('resize',fit);window.addEventListener('beforeunload',()=>{clearTimeout(timer);save();});

function setEditorCollapsed(collapsed){
  document.querySelector('main').classList.toggle('editor-collapsed',collapsed);
  $('editorPanel').inert=collapsed;
  $('toggleEditor').setAttribute('aria-expanded',String(!collapsed));
  $('toggleEditor').textContent=collapsed?'◧ Show editor':'◧ Hide editor';
  $('toggleEditor').title=collapsed?'Expand Markdown editor':'Collapse Markdown editor';
  requestAnimationFrame(fit);
}
$('toggleEditor').onclick=()=>{
  const collapsed=$('toggleEditor').getAttribute('aria-expanded')==='true';
  setEditorCollapsed(collapsed);
  try{localStorage.setItem('relate.editorCollapsed',String(collapsed));}catch{}
};
try{setEditorCollapsed(localStorage.getItem('relate.editorCollapsed')==='true');}catch{}

function renderSearchResults(){
  const active=!!searchQuery.trim();
  $('clearSearch').hidden=!active;
  $('searchCount').textContent=active?`${searchMatches.length} matching table${searchMatches.length===1?'':'s'}`:'';
  $('searchResults').hidden=!active;
  $('searchResults').innerHTML=searchMatches.length?searchMatches.map((match,i)=>`<button type="button" data-result="${i}">${esc(match.name)}<small>${match.fields.length?esc(match.fields.join(', ')):'Table name match'}</small></button>`).join(''):'<p>No matching tables or columns.</p>';
}
function jumpToSearchResult(index){
  const match=searchMatches[index];if(!match)return;
  searchFocused=match.name;selectedRelationship=null;
  const entity=model.entities.find(e=>e.name===match.name),p=positions[match.name];
  view.k=Math.max(.15,Math.min(1.25,(canvas.clientWidth-70)/W,(canvas.clientHeight-110)/height(entity)));
  view.x=canvas.clientWidth/2-(p.x+W/2)*view.k;view.y=canvas.clientHeight/2-(p.y+height(entity)/2)*view.k;
  render();$('searchResults').hidden=true;canvas.focus();
}
function clearSearch(){searchQuery='';searchMatches=[];searchFocused=null;$('schemaSearch').value='';renderSearchResults();render();}
$('schemaSearch').addEventListener('input',()=>{
  clearTimeout(timer);searchQuery=$('schemaSearch').value;searchFocused=null;selectedRelationship=null;update();
});
$('schemaSearch').addEventListener('focus',()=>{if(searchQuery.trim())renderSearchResults();});
$('schemaSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();jumpToSearchResult(0);}if(e.key==='Escape'){clearSearch();canvas.focus();}});
$('searchResults').addEventListener('click',e=>{const button=e.target.closest('[data-result]');if(button)jumpToSearchResult(Number(button.dataset.result));});
$('clearSearch').onclick=()=>{clearSearch();$('schemaSearch').focus();};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.search-toolbar'))$('searchResults').hidden=true;});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('schemaSearch').focus();$('schemaSearch').select();}if(e.key==='Escape'&&searchQuery.trim())clearSearch();});
