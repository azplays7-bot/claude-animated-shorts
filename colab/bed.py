# Music + sound-effects bed without a voice track: python bed.py <audio dir> <out.wav>  (same score and SFX as mix.py, music +3 dB, -15 LUFS)
import sys, os, time, numpy as np
sys.path.insert(0, sys.argv[1]); os.chdir(sys.argv[1])
from dsp import integrated, dbg, write_wav, true_peak
import music, sfx
t=time.time()
m, _ = music.render(music.build(), ref=-20.0); print("music", round(time.time()-t,1), "s")
s, _ = sfx.render(-20.0); print("sfx", round(time.time()-t,1), "s")
n=min(m.shape[1], s.shape[1]); y = m[:, :n]*dbg(3) + s[:, :n]
y *= dbg(-15 - integrated(y)); y /= max(1.0, np.abs(y).max()/0.89)
write_wav(sys.argv[2], y); print("bed", integrated(y), true_peak(y), y.shape)
