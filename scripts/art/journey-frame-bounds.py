"""Analyze alpha to propose isolated source rectangles; never rewrite image pixels.
Requires Pillow, NumPy and SciPy. Unsafe/merged poses keep their original cells.
"""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import label,find_objects
import json
root=Path('art-source/journey');frames={};summary={}
for hero,file in [('wukong','wukong-stage1.png'),('bajie','bajie-stage2.png'),('wujing','wujing-stage2.png'),('tang','tang-stage2.png'),('prince','prince-stage2.png')]:
 a=np.array(Image.open(root/file))[:,:,3];labels,n=label(a>100);parts=[]
 for ident,sl in enumerate(find_objects(labels),1):
  if sl is None:continue
  area=int(np.count_nonzero(labels[sl]==ident))
  if area>1500:parts.append((ident,sl,area))
 ids={p[0] for p in parts};poses={};unsafe=[]
 for ident,sl,area in parts:
  x,y,r,b=sl[1].start,sl[0].start,sl[1].stop,sl[0].stop
  col=min(5,int((x+r)/2)//256);row=min(3,int((y+b)/2)//256);index=row*6+col
  if r-x>360 or b-y>310:unsafe.append(index);continue
  left,top,right,bottom=max(0,x-2),max(0,y-2),min(1536,r+2),min(1024,b+2)
  nearby=labels[top:bottom,left:right];other=sum(int(np.count_nonzero(nearby==j)) for j in ids if j!=ident)
  if other>20 or index in poses:unsafe.append(index);continue
  poses[index]={'source':[left,top,right-left,bottom-top],'pivot':[col*256+128-left,row*256+245.76-top]}
 for i in unsafe:poses.pop(i,None)
 frames[hero]=poses;summary[hero]={'isolatedFrames':len(poses),'uniformFallbackFrames':[i for i in range(24) if i not in poses]}
Path('public/games/journey/frame-bounds.js').write_text('// Alpha-analysis rectangles; ambiguous overlapping poses retain original cells.\nexport const FRAME_BOUNDS='+json.dumps(frames,separators=(',',':'))+';\n')
(root/'frame-bounds-audit.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
