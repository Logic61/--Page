// 由 分支图-6.png（不透明黑底海报）生成真透明树贴图 public/巫/分支图-6.png。
// 背景：-6 与 -5 布局完全一致（四铭牌/圆盘/徽章同位），但 -6 是压平的黑底导出，
// 而 four-veins 页需要真 alpha（法阵在下层透出、树体遮挡）。
// 策略：复用设计师导出的 -5 alpha 通道做结构骨架，按设计语言修正：
//   1) 背景洪泛：从暗边界洪泛 luma<16 的连通黑区（铭牌矩形设墙），
//      清掉 -5 繁复徽章在 -6 中已删除的区域；再腐蚀 1px 防啃边。
//   2) 低饱和门控：设计师导出规律——铭牌之外低饱和(S<0.12)像素一律透明，
//      故继承的 -5 alpha 按 -6 自身饱和度软门控 (S 0.06→0.14)。
//   3) 键控生长：亮饱和金 (L>=40&&S>=0.45 / L>=58&&S>=0.32) 补出 -6 新增细节。
//   4) 小洞填实：内部透明洞 <=150px 且非暗色(平均 L<22&&S<0.18) 填为不透明；
//      暗色缝是藤蔓绞缠纹理的设计特征，保留透光。
//   5) alpha 0.6px 羽化收边。
// 用法: node scripts/gen-v6-alpha.mjs
// 验收基准：不透明近黑残斑(铭牌外, a>140 && L<8 && S<0.12) 占比 0.030%，
//           优于设计师 -5 基线 0.091%（未门控版本为 1.906%）。
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC5 = path.join(root, 'public', '巫', '分支图-5.png');
const SRC6 = path.join(root, '巫', '分支图-6.png');
const OUT = path.join(root, 'public', '巫', '分支图-6.png');

const W = 1024, H = 1536, N = W * H;
const plates = [[88,623,309,693],[716,624,938,693],[88,1059,309,1128],[715,1059,937,1128]];
const inPlate = new Uint8Array(N);
for (const [x1,y1,x2,y2] of plates) for (let y=y1;y<=y2;y++) for (let x=x1;x<=x2;x++) inPlate[y*W+x]=1;

const r5 = await sharp(SRC5).raw().toBuffer({ resolveWithObject: true });
const d5 = r5.data, C5 = r5.info.channels;
const rgb6 = await sharp(SRC6).removeAlpha().raw().toBuffer();
const lum6 = new Float32Array(N), sat6 = new Float32Array(N);
for (let i=0;i<N;i++){ const p=i*3,r=rgb6[p],g=rgb6[p+1],b=rgb6[p+2];
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
  lum6[i]=0.2126*r+0.7152*g+0.0722*b; sat6[i]=mx===0?0:(mx-mn)/mx; }

// 1) bg flood from dark borders (plaques walled), then erode 1px
const bg=new Uint8Array(N); const q=new Int32Array(N); let head=0,tail=0;
for(let x=0;x<W;x++)for(const y of[0,H-1]){const i=y*W+x;if(!inPlate[i]&&lum6[i]<16&&!bg[i]){bg[i]=1;q[tail++]=i;}}
for(let y=0;y<H;y++)for(const x of[0,W-1]){const i=y*W+x;if(!inPlate[i]&&lum6[i]<16&&!bg[i]){bg[i]=1;q[tail++]=i;}}
while(head<tail){const cur=q[head++],x=cur%W,y=(cur/W)|0;
  for(const n of[x>0?cur-1:-1,x<W-1?cur+1:-1,y>0?cur-W:-1,y<H-1?cur+W:-1]){if(n<0)continue;if(!bg[n]&&!inPlate[n]&&lum6[n]<16){bg[n]=1;q[tail++]=n;}}}
const bgE=new Uint8Array(N);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!bg[i])continue;
  if((x===0||bg[i-1])&&(x===W-1||bg[i+1])&&(y===0||bg[i-W])&&(y===H-1||bg[i+W]))bgE[i]=1;}

// 2-3) compose: inherited alpha5 (flood-cleaned, sat-gated) + luma-keyed growth
const alpha=new Float32Array(N);
for(let i=0;i<N;i++){
  if(inPlate[i]){alpha[i]=d5[i*C5+3];continue;}
  const S=sat6[i],L=lum6[i];
  let grow=0;
  if(L>=40&&S>=0.45)grow=Math.min(255,Math.round(255*(L-34)/26));
  else if(L>=58&&S>=0.32)grow=Math.round(255*(L-52)/38);
  const gate=Math.max(0,Math.min(1,(S-0.06)/(0.14-0.06)));
  alpha[i]=Math.max((bgE[i]?0:d5[i*C5+3])*gate,grow);
}

// 4) fill small bright interior holes (dark vine gaps stay transparent)
const op=new Uint8Array(N); for(let i=0;i<N;i++)op[i]=alpha[i]>110?1:0;
const vis=new Uint8Array(N); const qq=new Int32Array(N); let fh=0,ft=0;
for(let x=0;x<W;x++)for(const y of[0,H-1])if(!op[y*W+x]&&!vis[y*W+x]){vis[y*W+x]=1;qq[ft++]=y*W+x;}
for(let y=0;y<H;y++)for(const x of[0,W-1])if(!op[y*W+x]&&!vis[y*W+x]){vis[y*W+x]=1;qq[ft++]=y*W+x;}
while(fh<ft){const cur=qq[fh++],x=cur%W,y=(cur/W)|0;
  for(const n of[x>0?cur-1:-1,x<W-1?cur+1:-1,y>0?cur-W:-1,y<H-1?cur+W:-1]){if(n<0)continue;if(!op[n]&&!vis[n]){vis[n]=1;qq[ft++]=n;}}}
{ const lab=new Int32Array(N).fill(-1); let hh=0,tt=0;
  for(let s=0;s<N;s++){ if(op[s]||vis[s]||lab[s]!==-1)continue;
    hh=tt=0; lab[s]=1; qq[tt++]=s; const pxs=[];
    while(hh<tt){const cur=qq[hh++];pxs.push(cur);const x=cur%W,y=(cur/W)|0;
      for(const n of[x>0?cur-1:-1,x<W-1?cur+1:-1,y>0?cur-W:-1,y<H-1?cur+W:-1]){if(n<0)continue;if(!op[n]&&!vis[n]&&lab[n]===-1){lab[n]=1;qq[tt++]=n;}}}
    let sl=0,ss=0; for(const i of pxs){sl+=lum6[i];ss+=sat6[i];}
    if(pxs.length<=150 && !(sl/pxs.length<22 && ss/pxs.length<0.18))
      for(const i of pxs)if(!inPlate[i])alpha[i]=255;
  } }

// 5) write + feather
const out=Buffer.alloc(N*4);
for(let i=0;i<N;i++){const p=i*3,q4=i*4;out[q4]=rgb6[p];out[q4+1]=rgb6[p+1];out[q4+2]=rgb6[p+2];out[q4+3]=Math.round(alpha[i]);}
await sharp(out,{raw:{width:W,height:H,channels:4}}).blur(0.6).png({compressionLevel:9}).toFile(OUT);
console.log('written:', OUT);
