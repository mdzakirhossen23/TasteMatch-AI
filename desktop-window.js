(() => {
  'use strict';
  const win = document.getElementById('desktopWindow');
  const workspace = document.getElementById('desktopWorkspace');
  const dimensions = document.getElementById('windowDimensions');
  const closed = document.getElementById('closedWindow');
  const normal = document.getElementById('windowNormal');
  const max = document.getElementById('windowMax');
  const close = document.getElementById('windowClose');
  const reopen = document.getElementById('reopenWindow');
  let saved = null;
  let maximized = false;
  const minimum = () => ({width: Math.min(350,workspace.clientWidth),height:Math.min(260,workspace.clientHeight)});
  const bounds = () => ({width:workspace.clientWidth-24,height:workspace.clientHeight-24});
  function updateDimensions(){dimensions.textContent = `${Math.round(win.getBoundingClientRect().width)} × ${Math.round(win.getBoundingClientRect().height)}`;}
  function setSize(w,h){const b=bounds(),min=minimum();win.style.width=`${Math.max(min.width,Math.min(Math.max(min.width,b.width),w))}px`;win.style.height=`${Math.max(min.height,Math.min(Math.max(min.height,b.height),h))}px`;updateDimensions();}
  function maximize(){if(maximized)return; saved={w:win.offsetWidth,h:win.offsetHeight};maximized=true;win.classList.add('is-maximized');win.style.width='100%';win.style.height='100%';max.setAttribute('aria-label','Restore normal size');max.title='Restore normal size';updateDimensions();}
  function restore(){if(!maximized){setSize(Math.min(1100,bounds().width),Math.min(760,bounds().height));return;} maximized=false;win.classList.remove('is-maximized');setSize(saved?.w||1100,saved?.h||760);max.setAttribute('aria-label','Maximize window');max.title='Maximize window';}
  normal.addEventListener('click',restore);
  max.addEventListener('click',()=>maximized?restore():maximize());
  close.addEventListener('click',()=>{win.hidden=true;win.style.display='none';closed.hidden=false;});
  reopen.addEventListener('click',()=>{closed.hidden=true;win.hidden=false;win.style.display='flex';updateDimensions();});
  document.querySelectorAll('.resize-grip').forEach(grip=>{
    grip.addEventListener('pointerdown',e=>{
      if(maximized || e.button!==0)return;
      e.preventDefault();
      const dir=grip.dataset.dir;
      const start={x:e.clientX,y:e.clientY,w:win.offsetWidth,h:win.offsetHeight};
      win.classList.add('is-resizing');
      grip.setPointerCapture(e.pointerId);
      const move=ev=>{
        const factorX=dir.includes('e')?1:dir.includes('w')?-1:0;
        const factorY=dir.includes('s')?1:dir.includes('n')?-1:0;
        setSize(start.w + (ev.clientX-start.x)*factorX*2,start.h+(ev.clientY-start.y)*factorY*2);
      };
      const end=()=>{win.classList.remove('is-resizing');grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end);};
      grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
    });
  });
  new ResizeObserver(updateDimensions).observe(win);
  window.addEventListener('resize',()=>{if(!maximized)setSize(win.offsetWidth,win.offsetHeight);else updateDimensions();});
  updateDimensions();
})();

