/*!
MIT License

Copyright (c) 2023 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
var QQMusicCodec=(()=>{var k=Object.defineProperty;var Ar=Object.getOwnPropertyDescriptor;var Mr=Object.getOwnPropertyNames;var Sr=Object.prototype.hasOwnProperty;var Ur=(r,n)=>{for(var t in n)k(r,t,{get:n[t],enumerable:!0})},Fr=(r,n,t,e)=>{if(n&&typeof n=="object"||typeof n=="function")for(let i of Mr(n))!Sr.call(r,i)&&i!==t&&k(r,i,{get:()=>n[i],enumerable:!(e=Ar(n,i))||e.enumerable});return r};var Tr=r=>Fr(k({},"__esModule",{value:!0}),r);var Nr={};Ur(Nr,{strFromU8:()=>gr,strToU8:()=>pr,unzlibSync:()=>cr});var l=Uint8Array,U=Uint16Array,Dr=Int32Array,or=new l([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),sr=new l([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),Cr=new l([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),fr=function(r,n){for(var t=new U(31),e=0;e<31;++e)t[e]=n+=1<<r[e-1];for(var i=new Dr(t[30]),e=1;e<30;++e)for(var u=t[e];u<t[e+1];++u)i[u]=u-t[e]<<5|e;return{b:t,r:i}},hr=fr(or,2),ur=hr.b,Ir=hr.r;ur[28]=258,Ir[258]=28;var lr=fr(sr,0),Zr=lr.b,kr=lr.r,j=new U(32768);for(o=0;o<32768;++o)x=(o&43690)>>1|(o&21845)<<1,x=(x&52428)>>2|(x&13107)<<2,x=(x&61680)>>4|(x&3855)<<4,j[o]=((x&65280)>>8|(x&255)<<8)>>1;var x,o,I=(function(r,n,t){for(var e=r.length,i=0,u=new U(n);i<e;++i)r[i]&&++u[r[i]-1];var v=new U(n);for(i=1;i<n;++i)v[i]=v[i-1]+u[i-1]<<1;var h;if(t){h=new U(1<<n);var m=15-n;for(i=0;i<e;++i)if(r[i])for(var f=i<<4|r[i],y=n-r[i],a=v[r[i]-1]++<<y,s=a|(1<<y)-1;a<=s;++a)h[j[a]>>m]=f}else for(h=new U(e),i=0;i<e;++i)r[i]&&(h[i]=j[v[r[i]-1]++]>>15-r[i]);return h}),Z=new l(288);for(o=0;o<144;++o)Z[o]=8;var o;for(o=144;o<256;++o)Z[o]=9;var o;for(o=256;o<280;++o)Z[o]=7;var o;for(o=280;o<288;++o)Z[o]=8;var o,vr=new l(32);for(o=0;o<32;++o)vr[o]=5;var o;var Br=I(Z,9,1);var Er=I(vr,5,1),W=function(r){for(var n=r[0],t=1;t<r.length;++t)r[t]>n&&(n=r[t]);return n},g=function(r,n,t){var e=n/8|0;return(r[e]|r[e+1]<<8)>>(n&7)&t},Y=function(r,n){var t=n/8|0;return(r[t]|r[t+1]<<8|r[t+2]<<16)>>(n&7)},Gr=function(r){return(r+7)/8|0},K=function(r,n,t){return(n==null||n<0)&&(n=0),(t==null||t>r.length)&&(t=r.length),new l(r.subarray(n,t))};var Or=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],p=function(r,n,t){var e=new Error(n||Or[r]);if(e.code=r,Error.captureStackTrace&&Error.captureStackTrace(e,p),!t)throw e;return e},qr=function(r,n,t,e){var i=r.length,u=e?e.length:0;if(!i||n.f&&!n.l)return t||new l(0);var v=!t,h=v||n.i!=2,m=n.i;v&&(t=new l(i*3));var f=function(tr){var er=t.length;if(tr>er){var ir=new l(Math.max(er*2,tr));ir.set(t),t=ir}},y=n.f||0,a=n.p||0,s=n.b||0,A=n.l,B=n.d,F=n.m,T=n.n,G=i*8;do{if(!A){y=g(r,a,1);var O=g(r,a+1,3);if(a+=3,O)if(O==1)A=Br,B=Er,F=9,T=5;else if(O==2){var P=g(r,a,31)+257,Q=g(r,a+10,15)+4,V=P+g(r,a+5,31)+1;a+=14;for(var D=new l(V),$=new l(19),c=0;c<Q;++c)$[Cr[c]]=g(r,a+c*3,7);a+=Q*3;for(var X=W($),yr=(1<<X)-1,wr=I($,X,1),c=0;c<V;){var d=wr[g(r,a,yr)];a+=d&15;var w=d>>4;if(w<16)D[c++]=w;else{var M=0,E=0;for(w==16?(E=3+g(r,a,3),a+=2,M=D[c-1]):w==17?(E=3+g(r,a,7),a+=3):w==18&&(E=11+g(r,a,127),a+=7);E--;)D[c++]=M}}var b=D.subarray(0,P),z=D.subarray(P);F=W(b),T=W(z),A=I(b,F,1),B=I(z,T,1)}else p(1);else{var w=Gr(a)+4,q=r[w-4]|r[w-3]<<8,L=w+q;if(L>i){m&&p(0);break}h&&f(s+q),t.set(r.subarray(w,L),s),n.b=s+=q,n.p=a=L*8,n.f=y;continue}if(a>G){m&&p(0);break}}h&&f(s+131072);for(var mr=(1<<F)-1,xr=(1<<T)-1,H=a;;H=a){var M=A[Y(r,a)&mr],S=M>>4;if(a+=M&15,a>G){m&&p(0);break}if(M||p(2),S<256)t[s++]=S;else if(S==256){H=a,A=null;break}else{var _=S-254;if(S>264){var c=S-257,C=or[c];_=g(r,a,(1<<C)-1)+ur[c],a+=C}var N=B[Y(r,a)&xr],R=N>>4;N||p(3),a+=N&15;var z=Zr[R];if(R>3){var C=sr[R];z+=Y(r,a)&(1<<C)-1,a+=C}if(a>G){m&&p(0);break}h&&f(s+131072);var rr=s+_;if(s<z){var nr=u-z,zr=Math.min(z,rr);for(nr+s<0&&p(3);s<zr;++s)t[s]=e[nr+s]}for(;s<rr;++s)t[s]=t[s-z]}}n.l=A,n.p=H,n.b=s,n.f=y,A&&(y=1,n.m=F,n.d=B,n.n=T)}while(!y);return s!=t.length&&v?K(t,0,s):t.subarray(0,s)};var Lr=new l(0);var Pr=function(r,n){return((r[0]&15)!=8||r[0]>>4>7||(r[0]<<8|r[1])%31)&&p(6,"invalid zlib data"),(r[1]>>5&1)==+!n&&p(6,"invalid zlib data: "+(r[1]&32?"need":"unexpected")+" dictionary"),(r[1]>>3&4)+2};function cr(r,n){return qr(r.subarray(Pr(r,n&&n.dictionary),-4),{i:2},n&&n.out,n&&n.dictionary)}var ar=typeof TextEncoder!="undefined"&&new TextEncoder,J=typeof TextDecoder!="undefined"&&new TextDecoder,$r=0;try{J.decode(Lr,{stream:!0}),$r=1}catch{}var Hr=function(r){for(var n="",t=0;;){var e=r[t++],i=(e>127)+(e>223)+(e>239);if(t+i>r.length)return{s:n,r:K(r,t-1)};i?i==3?(e=((e&15)<<18|(r[t++]&63)<<12|(r[t++]&63)<<6|r[t++]&63)-65536,n+=String.fromCharCode(55296|e>>10,56320|e&1023)):i&1?n+=String.fromCharCode((e&31)<<6|r[t++]&63):n+=String.fromCharCode((e&15)<<12|(r[t++]&63)<<6|r[t++]&63):n+=String.fromCharCode(e)}};function pr(r,n){if(n){for(var t=new l(r.length),e=0;e<r.length;++e)t[e]=r.charCodeAt(e);return t}if(ar)return ar.encode(r);for(var i=r.length,u=new l(r.length+(r.length>>1)),v=0,h=function(y){u[v++]=y},e=0;e<i;++e){if(v+5>u.length){var m=new l(v+8+(i-e<<1));m.set(u),u=m}var f=r.charCodeAt(e);f<128||n?h(f):f<2048?(h(192|f>>6),h(128|f&63)):f>55295&&f<57344?(f=65536+(f&1047552)|r.charCodeAt(++e)&1023,h(240|f>>18),h(128|f>>12&63),h(128|f>>6&63),h(128|f&63)):(h(224|f>>12),h(128|f>>6&63),h(128|f&63))}return K(u,0,v)}function gr(r,n){if(n){for(var t="",e=0;e<r.length;e+=16384)t+=String.fromCharCode.apply(null,r.subarray(e,e+16384));return t}else{if(J)return J.decode(r);var i=Hr(r),u=i.s,t=i.r;return t.length&&p(8),u}}return Tr(Nr);})();

(() => {
  let result = {};
  try {
    const request = globalThis.$request;
    if (!request || request.method !== "POST" ||
        !/^https:\/\/(?:szu6|u6)\.y\.qq\.com\/cgi-bin\/musics\.fcg(?:\?[^#]*)?$/.test(request.url) ||
        !(request.body instanceof Uint8Array) || !request.body.length || request.body.length > 65536) {
      return $done(result);
    }
    const raw = request.body;
    const bytes = raw[0] === 0x7b ? raw : QQMusicCodec.unzlibSync(raw.subarray(5));
    const payload = JSON.parse(QQMusicCodec.strFromU8(bytes));
    if (String(payload.comm?.br) !== "1") return $done(result);
    const keys = Object.keys(payload).filter(key => key !== "comm");
    if (keys.length !== 1) return $done(result);
    const key = keys[0];
    const item = payload[key];
    const service = item?.module + "." + item?.method;
    let kind;
    let data;
    if (service === "music.yiflow.Nexus.GetAds" &&
        item.param?.appID === 1 && item.param?.adposID === 899374 && item.param?.scene === 2) {
      kind = "welfare";
      data = {code:0,msg:"",ad:{enabled:false,ID:0,name:"",biz:"",schema:0,legacy:"",hippyConfig:{ID:0,ios_md5:"",ios_bundle:"",android_md5:"",android_bundle:"",entry:"",h5_url:"",delay:0,version:"",timestamp:0,bundle_version:0,force_update:0,preload_res:"",need_pack:0,preRequest:0,preRequestParam:"",server_md5:"",ssr_switch:0,chunk_list:"",extra:"",status:0},context:null,materialsData:"",remaining:0,clientFreqCtrl:false,refreshIntervalInSeconds:0,styleID:"",adType:0,labels:null},traceID:"",decision:null};
    } else if (service === "music.longRadio.LongRadioOperationBannerSvr.GetRecShelfVipBanner" &&
               item.param?.source === 8) {
      kind = "audiobook";
      data = {banner:null,popupCnt:3};
    } else if (service === "music.venus.VenusMusicAiSongCoversApi.HandleGetPlayPageIcon") {
      kind = "ai";
      data = {id:"aihelpsing",icon:"",text:"",scheme:"",pag:"",expId:0,clickId:0,ext:"",enable:0,extra:{},bizReport:"",icons:[],intervalMs:0};
    } else if (service === "music.iotSmartDevice.IotSmartDeviceSvr.GetEntry") {
      kind = "iot";
      data = {hasDevice:false,title:"",subTitle:"",url:"",hasEntry:false};
    } else {
      return $done(result);
    }
    const now = Date.now();
    const response = {code:0,ts:now,start_ts:now,traceid:"",[key]:{code:0,data}};
    result = {
      response: {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Loon-QQMusic": "20261017-3; " + kind,
        },
        body: storeBrotli(QQMusicCodec.strToU8(JSON.stringify(response))),
      },
    };
  } catch (_) {
    result = {};
  }
  $done(result);

  function storeBrotli(data) {
    const output = new Uint8Array(data.length + Math.ceil(data.length / 65536) * 3 + 2);
    let position = 0;
    let pending = 0;
    let bits = 0;
    function write(value, width) {
      pending |= value << bits;
      bits += width;
      while (bits >= 8) {
        output[position++] = pending & 255;
        pending >>>= 8;
        bits -= 8;
      }
    }
    function align() {
      if (bits) output[position++] = pending & 255;
      bits = 0;
      pending = 0;
    }
    write(0xb, 4);
    for (let offset = 0; offset < data.length; offset += 65536) {
      const size = Math.min(65536, data.length - offset);
      write(0, 1);
      write(0, 2);
      write(size - 1, 16);
      write(1, 1);
      align();
      output.set(data.subarray(offset, offset + size), position);
      position += size;
    }
    write(3, 2);
    align();
    return output.subarray(0, position);
  }
})();
