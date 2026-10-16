"""Inspect supplemental alpha boundaries without modifying image pixels."""
from pathlib import Path
from PIL import Image
import numpy as np
import json
im=Image.open(Path('art-source/journey/bajie-repair-stage3.png'))
assert im.mode=='RGBA' and im.size==(1536,1024)
a=np.array(im)[:,:,3]
rows=[0,341,683,1024]
result=[]
for i in range(12):
 row,col=divmod(i,4)
 cell=a[rows[row]:rows[row+1],col*384:(col+1)*384]
 y,x=np.where(cell>50)
 assert len(x)>2000, f'Empty pose {i}'
 margins=[int(x.min()),int(y.min()),int(383-x.max()),int(cell.shape[0]-1-y.max())]
 assert min(margins)>=12, f'Artwork approaches boundary in pose {i}: {margins}'
 result.append({'pose':i,'margins':margins})
print(json.dumps({'passed':True,'threshold':50,'requiredMargin':12,'poses':result}))
