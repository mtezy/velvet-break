import { ball, type Ball } from './physics.ts';
export interface Mission {
  title: string; chapter: string; act: number; difficulty: string; shots: number; par: number;
  objective: string; tip: string; layout: number[][]; rule?: 'bank' | 'order' | 'called' | 'eight'; pocket?: number; time?: number;
}
export const missions: Mission[] = [
  {title:'First contact', chapter:'Find your feel', act:1, difficulty:'Rookie', shots:3, par:1, objective:'Pot the yellow 1 ball.', tip:'Aim through the 1 ball toward the top-left pocket. About 35% power is plenty. Keep spin centred to start; top follows, back draws, side changes banks.', layout:[[0,590,330],[1,340,210]]},
  {title:'Double trouble', chapter:'Find your feel', act:1, difficulty:'Rookie', shots:4, par:2, objective:'Clear both balls in 4 shots.', tip:'Plan your second shot before taking your first. A soft touch keeps the cue ball close.', layout:[[0,500,330],[1,315,198],[2,875,450]]},
  {title:'Three is a crowd', chapter:'Find your feel', act:1, difficulty:'Rookie', shots:5, par:3, objective:'Clear all 3 balls.', tip:'Each ball has a nearby pocket. Aim for the center of the pocket, not the rail.', layout:[[0,420,370],[1,260,180],[2,870,190],[3,870,470]]},
  {title:'Off the wall', chapter:'Work the angles', act:2, difficulty:'Hustler', shots:5, par:2, rule:'bank', objective:'Bank the 4 ball off a cushion, then pot it.', tip:'The purple ball must hit a cushion during the shot it drops. Think of the cushion as a mirror.', layout:[[0,430,395],[4,660,270]]},
  {title:'Corner office', chapter:'Work the angles', act:2, difficulty:'Hustler', shots:4, par:1, rule:'called', pocket:2, objective:'Pot the 5 ball in the glowing top-right pocket.', tip:'Only the highlighted pocket counts. Find a line from the cue through the orange ball.', layout:[[0,560,365],[5,900,195]]},
  {title:'In good order', chapter:'Work the angles', act:2, difficulty:'Hustler', shots:6, par:3, rule:'order', objective:'Pot 1 → 2 → 3, in that order.', tip:'The lowest numbered ball must drop first. You may hit any ball, but only pot the next one.', layout:[[0,510,330],[1,300,198],[2,870,200],[3,855,450]]},
  {title:'After-hours rush', chapter:'Make your mark', act:3, difficulty:'Shark', shots:8, par:3, time:75, objective:'Clear 3 balls before 75 seconds run out.', tip:'The clock starts on your first shot. Take a breath and plan your opening before you strike.', layout:[[0,430,330],[3,270,180],[5,900,180],[6,900,470]]},
  {title:'Double bank', chapter:'Make your mark', act:3, difficulty:'Shark', shots:8, par:4, rule:'bank', objective:'Pot both balls with cushion bank shots.', tip:'A bank only counts when the object ball touches a cushion in the same shot it is potted.', layout:[[0,430,350],[4,680,240],[6,830,430]]},
  {title:'The long game', chapter:'Make your mark', act:3, difficulty:'Shark', shots:7, par:4, rule:'order', objective:'Pot 1 → 2 → 3 → 4, in order.', tip:'Leave room for the next shot. Overpowering one pot can make the next much harder.', layout:[[0,460,330],[1,280,180],[2,890,190],[3,880,460],[4,280,465]]},
  {title:'Middle ground', chapter:'Become a legend', act:4, difficulty:'Legend', shots:6, par:2, rule:'called', pocket:1, objective:'Pot both balls into the top-middle pocket.', tip:'Both balls must drop in the glowing pocket. Use soft shots to create your angle.', layout:[[0,420,440],[2,550,245],[5,740,350]]},
  {title:'Eight after midnight', chapter:'Become a legend', act:4, difficulty:'Legend', shots:7, par:4, rule:'eight', objective:'Clear the colors, then pot the 8 ball last.', tip:'The black 8 is the finale. Pot it before every colored ball is cleared and the mission ends.', layout:[[0,440,330],[1,280,190],[3,900,190],[6,880,455],[8,660,350]]},
  {title:'Velvet legend', chapter:'Become a legend', act:4, difficulty:'Legend', shots:10, par:6, rule:'eight', objective:'Clear all 6 balls. Save the 8 for last.', tip:'The final table rewards everything you have learned. Keep the 8 safe and make each shot intentional.', layout:[[0,350,330],[1,570,270],[2,690,190],[3,890,275],[4,745,440],[6,450,460],[8,670,340]]},
];
export function createLayout(mission: Mission): Ball[] { return mission.layout.map(([id,x,y]) => ball(id,x,y)); }
export function practiceLayout(): Ball[] {
  const balls = [ball(0,360,330)]; let id=1;
  for (let row=0;row<5;row++) for(let col=0;col<=row;col++) {
    const number = row===2 && col===1 ? 8 : id===8 ? 15 : id===15 ? 1 : id;
    balls.push(ball(number,785+row*22,330+(col-row/2)*25)); id++;
  }
  // A standard rack contains each numbered ball exactly once, with the 8 at its center.
  const objects=balls.slice(1); const eightIndex=objects.findIndex(b=>b.id===8);
  const ids=[1,2,3,4,5,6,7,9,10,11,12,13,14,15]; let n=0;
  objects.forEach((b,i)=>{ if(i!==eightIndex) b.id=ids[n++]; });
  return balls;
}
