/**
 * First-paint splash loader. Rendered as the FIRST child of <body> in the initial
 * server HTML with fully self-contained inline critical CSS (gradient + static logo)
 * plus a small inline vanilla-JS script that runs the REAL Claude Design beaded
 * double-helix canvas animation (the exact draw routine from Splash.tsx) right away,
 * before the app bundle. This avoids every prior failure mode: no video (so no
 * buffering, no poster stage, no software-decode stutter) and no CSS keyframe
 * animation (so nothing the browser/OS can freeze, and it is a real rotating helix,
 * not a sliding image). The logo is STATIC.
 *
 * The canvas draws 52 nodes across the width as two strands (blue A, red B) with
 * teal dashed rungs, depth-sorted, phase = t * 1.7. It runs on requestAnimationFrame
 * from the moment the inline script parses. Removal is event-based (window `load`),
 * never a timer, and shows on every load: the loader fades out and cancels the rAF
 * when the page has loaded. Emitted via one dangerouslySetInnerHTML on a
 * <div suppressHydrationWarning> so the inline script can removeChild #alb-pre with
 * no hydration mismatch.
 */

const STYLE = `
#alb-pre{position:fixed;inset:0;z-index:10001;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;background:radial-gradient(120% 80% at 50% 40%,#FFFFFF,#EAF0F8);pointer-events:none;}
#alb-pre img.alb-logo{height:56px;width:auto;display:block;}
#alb-pre canvas.alb-dna{display:block;}
@media (max-width:520px){#alb-pre{gap:26px;}#alb-pre img.alb-logo{height:auto;width:min(260px,72vw);}}
`.trim();

const SCRIPT = `
(function(){
  var pre=document.getElementById('alb-pre');
  var cv=document.getElementById('alb-dna-cv');
  if(!cv||!cv.getContext){return;}
  var ctx=cv.getContext('2d');
  var RED=[208,24,31],REDL=[237,28,36],BLUE=[29,58,130],BLUEL=[46,84,156],TEAL=[46,138,160];
  var cw=0,ch=0;
  function size(){
    var dpr=Math.min(window.devicePixelRatio||1,2);
    cw=Math.min(760,Math.round((window.innerWidth||760)*0.86))||760; ch=210;
    cv.style.width=cw+'px'; cv.style.height=ch+'px';
    cv.width=Math.round(cw*dpr); cv.height=Math.round(ch*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function rgba(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}
  function mix(a,b,m){return [a[0]+(b[0]-a[0])*m,a[1]+(b[1]-a[1])*m,a[2]+(b[2]-a[2])*m];}
  function draw(t){
    var w=cw,h=ch,cy=h/2,amp=h*0.34,N=(w<520?40:52),periods=(w<520?1.6:2.6),phase=t*1.7,i;
    ctx.clearRect(0,0,w,h);
    var nodes=[];
    for(i=0;i<N;i++){var fx=i/(N-1);var x=8+fx*(w-16);var th=fx*periods*Math.PI*2+phase;nodes.push({x:x,yA:cy+amp*Math.sin(th),yB:cy-amp*Math.sin(th),z:Math.cos(th)});}
    ctx.setLineDash([2,4]);ctx.lineWidth=1.4;
    for(i=0;i<N;i++){var n=nodes[i];var d=Math.abs(n.z);ctx.strokeStyle=rgba(TEAL,0.18+0.4*(1-d));ctx.beginPath();ctx.moveTo(n.x,n.yA);ctx.lineTo(n.x,n.yB);ctx.stroke();}
    ctx.setLineDash([]);
    var beads=[];
    for(i=0;i<N;i++){var n2=nodes[i];beads.push({x:n2.x,y:n2.yA,z:n2.z,s:0});beads.push({x:n2.x,y:n2.yB,z:-n2.z,s:1});}
    beads.sort(function(a,b){return a.z-b.z;});
    for(i=0;i<beads.length;i++){var b=beads[i];var dn=(b.z+1)/2;var r=(2.6+4.4*dn)*(w<520?0.7:1);var a=0.4+0.6*dn;var col=b.s===0?mix(BLUE,BLUEL,dn):mix(RED,REDL,dn);ctx.beginPath();ctx.fillStyle=rgba(col,a);ctx.arc(b.x,b.y,r,0,Math.PI*2);ctx.fill();}
  }
  size();
  var start=performance.now();
  var raf=0,running=true;
  function loop(now){ if(!running)return; draw((now-start)/1000); raf=requestAnimationFrame(loop); }
  draw(0); raf=requestAnimationFrame(loop);
  window.addEventListener('resize',size);
  function hide(){
    if(!pre){running=false;return;}
    pre.style.transition='opacity .45s ease';pre.style.opacity='0';
    pre.addEventListener('transitionend',function(){running=false;if(raf)cancelAnimationFrame(raf);if(pre.parentNode)pre.parentNode.removeChild(pre);});
  }
  if(document.readyState==='complete')hide();
  else window.addEventListener('load',hide,{once:true});
})();
`.trim();

export function InlineSplash() {
  const html =
    `<style>${STYLE}</style>` +
    `<div id="alb-pre" aria-hidden="true">` +
    `<img class="alb-logo" src="/logo.png" alt="Albatros Health Care"/>` +
    `<canvas id="alb-dna-cv" class="alb-dna" style="width:min(760px,86vw);height:210px;display:block"></canvas>` +
    `</div>` +
    `<script>${SCRIPT}</script>`;
  return <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
