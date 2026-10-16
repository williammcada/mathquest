from pathlib import Path
from PIL import Image
import numpy as np
import json
root=Path('art-source/journey')
manifest=json.loads((root/'stage4-repair-manifest.json').read_text())
audit=json.loads((root/'frame-bounds-audit.json').read_text())
results=[]
for hero,frames in manifest.items():
 assert sorted(map(int,frames))==sorted(audit[hero]['uniformFallbackFrames'])
 im=Image.open(root/(hero+'-repair-stage4.png'))
 assert im.mode=='RGBA' and im.size==(1536,1024)
 a=np.array(im)[:,:,3]
 for frame,b in frames.items():
  x,y,w,h=b['source'];yy,xx=np.where(a[y:y+h,x:x+w]>50)
  margins=[int(xx.min()),int(yy.min()),int(w-1-xx.max()),int(h-1-yy.max())]
  assert len(xx)>2000 and min(margins)>=6,(hero,frame,margins)
  results.append(dict(hero=hero,frame=frame,margins=margins))
print(json.dumps(dict(passed=True,poses=len(results),threshold=50,results=results)))
