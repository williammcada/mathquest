"""Mechanical atlas normalization and original synthesized score/effects."""
from pathlib import Path
from PIL import Image
import numpy as np
import wave, subprocess
root=Path(__file__).resolve().parents[1]/'public/assets/nightfall/city'
root.mkdir(parents=True,exist_ok=True)
source=Path(__file__).resolve().parents[2]/'generated_images'
for name,file,cols,rows in [('actors','exec-58cbf09a-30d4-4a57-afbb-3d16aaacccd7.png',8,5),('props','exec-019cb62e-42a6-49bd-ac23-5ff6660fa895.png',4,4),('tiles','exec-adea91d9-9e95-4b7e-9ae3-0d36b76ba8f8.png',4,4)]:
 im=Image.open(source/file).convert('RGBA'); out=Image.new('RGBA',(cols*128,rows*128))
 boundaries=[0,416,672,976,1280] if name=='props' else [round(i*im.height/rows) for i in range(rows+1)]
 for y in range(rows):
  for x in range(cols):
   cell=im.crop((round(x*im.width/cols),boundaries[y],round((x+1)*im.width/cols),boundaries[y+1]))
   if name!='tiles':
    box=cell.getbbox()
    if box:cell=cell.crop(box)
    cell.thumbnail((116,116),Image.Resampling.LANCZOS);out.alpha_composite(cell,(x*128+(128-cell.width)//2,y*128+(128-cell.height)//2))
   else:out.alpha_composite(cell.resize((128,128)),(x*128,y*128))
 out.save(root.parents[3]/'art-source/nightfall/city'/(name+'.png'),optimize=True)  # PNG original; run scripts/art/convert-webp.py to publish WebP
sr=22050;rng=np.random.default_rng(708)
def save(name,data,mp3=True):
 data=np.tanh(data)*.85
 path=root/(name+'.wav')
 with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes((data*32767).astype('<i2').tobytes())
 if mp3:subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(path),'-b:a','96k',str(root/(name+'.mp3'))],check=True)
def note(track,start,duration,midi,amp,kind='pad'):
 n=min(int(duration*sr),len(track)-int(start*sr));t=np.arange(max(0,n))/sr
 hz=440*2**((midi-69)/12)
 if kind=='pad':v=(np.sin(2*np.pi*hz*t)+.3*np.sin(2*np.pi*hz*1.003*t)+.2*np.sin(4*np.pi*hz*t))*np.minimum(1,t/.5)*np.minimum(1,(duration-t)/.6)
 else:v=(np.sin(2*np.pi*hz*t)+.35*np.sin(4*np.pi*hz*t)+.12*np.sin(6*np.pi*hz*t))*np.exp(-t*(2 if kind=='bell' else 5))
 track[int(start*sr):int(start*sr)+n]+=v*amp
for name,bpm,bars in [('ambient',76,16),('danger',112,16),('ending',76,8)]:
 beat=60/bpm;duration=bars*4*beat;track=np.zeros(int(duration*sr));chords=[[38,45,50,53],[34,41,46,50],[41,48,53,57],[36,43,48,52]]
 for bar in range(bars):
  start=bar*4*beat;chord=chords[(bar//2)%4]
  for m in chord:note(track,start,4*beat,m,.045)
  for b in range(4):
   note(track,start+b*beat,beat,chord[0]-12,.15,'bass')
   if name!='ending':
    at=int((start+b*beat)*sr);n=min(int(.22*sr),len(track)-at);t=np.arange(n)/sr;track[at:at+n]+=.18*np.sin(2*np.pi*(42*t+2*(1-np.exp(-t*35))))*np.exp(-t*19)
   if name=='danger':
    for half in [0,.5]:
     at=int((start+(b+half)*beat)*sr);n=min(1600,len(track)-at);track[at:at+n]+=rng.normal(0,.035,n)*np.exp(-np.arange(n)/270)
  for j,m in enumerate([chord[2]+12,chord[3]+12,chord[1]+12,chord[2]+12]):note(track,start+j*beat+.15,beat*1.5,m,.085 if name=='ending' else .055,'bell')
 t=np.arange(len(track))/sr;track*=np.minimum(1,t/.4)*np.minimum(1,(duration-t)/.5);save(name,track)
effects=np.zeros(sr*14)
for i in range(14):
 t=np.arange(int(.8*sr))/sr;noise=rng.normal(0,1,len(t))
 if i==0:v=(noise*.4+np.sin(2*np.pi*85*t)*.6)*np.exp(-t*28)
 elif i in [2,4,5]:v=(np.sin(2*np.pi*(75*t+8*t*t))+.35*noise)*np.exp(-t*4)*.4
 elif i in [3,7,12,13,1]:v=(noise*.25+np.sin(2*np.pi*(180+i*40)*t)*.2)*np.exp(-t*(25 if i!=13 else 8))
 elif i==11:v=(np.sin(2*np.pi*(35*t+40*t*t))+.1*noise)*np.minimum(1,t*10)*.35
 elif i==10:v=(np.sin(2*np.pi*(60*t+250*t*t))+.1*noise)*np.sin(np.pi*t/.8)*.2
 else:v=sum(np.sin(2*np.pi*f*t) for f in [440,554,660])*np.exp(-t*6)*.1
 effects[i*sr:i*sr+len(t)]=v
save('effects',effects,False)
