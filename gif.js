/* Tiny fixed-palette GIF encoder. Original implementation, no network or dependencies. */
(function(){
  function encodeGIF(frames,width,height,delay){
    const bytes=[], put=n=>bytes.push(n&255), word=n=>{put(n);put(n>>8);}, str=s=>{for(let i=0;i<s.length;i++)put(s.charCodeAt(i));};
    str('GIF89a');word(width);word(height);put(0xf7);put(0);put(0);
    for(let i=0;i<256;i++){put(Math.round(((i>>5)&7)*255/7));put(Math.round(((i>>2)&7)*255/7));put(Math.round((i&3)*255/3));}
    put(0x21);put(0xff);put(11);str('NETSCAPE2.0');put(3);put(1);word(0);put(0);
    frames.forEach(rgba=>{
      put(0x21);put(0xf9);put(4);put(4);word(delay);put(0);put(0);
      put(0x2c);word(0);word(0);word(width);word(height);put(0);put(8);
      const packed=[];let acc=0,bits=0,codeWidth=9,next=258,dictionary=new Map();
      const code=n=>{acc|=n<<bits;bits+=codeWidth;while(bits>=8){packed.push(acc&255);acc>>>=8;bits-=8;}};
      const pixel=i=>(rgba[i]&224)|((rgba[i+1]>>3)&28)|(rgba[i+2]>>6);
      code(256);let prefix=pixel(0);
      for(let i=4;i<rgba.length;i+=4){
        const suffix=pixel(i),key=prefix*256+suffix,found=dictionary.get(key);
        if(found!==undefined){prefix=found;continue;}
        code(prefix);
        if(next<4096){dictionary.set(key,next++);if(next>(1<<codeWidth)&&codeWidth<12)codeWidth++;}
        else{code(256);dictionary=new Map();next=258;codeWidth=9;}
        prefix=suffix;
      }
      code(prefix);
      // The decoder adds one final entry after reading the last prefix.
      if(next===(1<<codeWidth)&&codeWidth<12)codeWidth++;
      code(257);if(bits)packed.push(acc&255);
      for(let i=0;i<packed.length;i+=255){const chunk=packed.slice(i,i+255);put(chunk.length);for(const b of chunk)put(b);}put(0);
    });
    put(0x3b);return new Uint8Array(bytes);
  }
  if(typeof module!=='undefined')module.exports=encodeGIF;else window.encodeGIF=encodeGIF;
})();
