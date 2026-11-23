const seenKey='velvet-break-onboarding-v1';
const steps=[
  {title:'Aim the cue',detail:'Move your pointer or tap the felt to aim. Follow the dotted line to the first contact. Use ← and → for fine aim.'},
  {title:'Set your power',detail:'Hold on the felt (or hold Space) to charge, then release to shoot. You can also set the power slider and press Strike.'},
  {title:'Add spin',detail:'Tap or drag on the small cue ball. Top makes the cue ball follow; bottom draws it back. Left or right adds sidespin. Use Centre to reset.'},
  {title:'Change the view',detail:'In 3D, right-drag to orbit or scroll over the table to zoom. Choose Overhead for a top-down view, or open Angle for framing controls.'},
];

export function showFirstPlay(getStorage:()=>Pick<Storage,'getItem'|'setItem'>,show:()=>void){
  let storage:ReturnType<typeof getStorage>|undefined;
  try{storage=getStorage();if(storage.getItem(seenKey)==='1')return;}catch{}
  show();
  try{storage?.setItem(seenKey,'1');}catch{}
}

export function setupOnboarding(dialog:HTMLDialogElement,play:HTMLElement){
  showFirstPlay(()=>localStorage,()=>{
    const el=(id:string)=>dialog.querySelector<HTMLElement>(`#onboarding-${id}`)!;
    const back=el('back'),next=el('next'),progress=dialog.querySelectorAll('.onboarding-progress span');
    let step=0;
    function render(){
      el('count').textContent=`STEP ${step+1} OF ${steps.length} · ~30-SECOND TOUR`;
      el('title').textContent=steps[step].title;
      el('detail').textContent=steps[step].detail;
      el('next-label').textContent=step===steps.length-1?'Done':'Next';
      back.hidden=step===0;
      progress.forEach((segment,i)=>segment.classList.toggle('reached',i<=step));
    }
    back.addEventListener('click',()=>{step--;render();if(step===0)next.focus();});
    next.addEventListener('click',()=>{if(step===steps.length-1)dialog.close();else{step++;render();}});
    el('skip').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>play.focus({preventScroll:true}),{once:true});
    render();dialog.showModal();
  });
}
