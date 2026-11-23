/* Original procedural planet: spherical terrain, moving clouds and two studio lights.
   No external runtime, textures, analytics or network dependency. */
(() => {
  const canvas = document.querySelector('#globe');
  if (!canvas) return;
  const tabs = [...document.querySelectorAll('[data-destination]')];
  const motion = document.querySelector('#planet-motion');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const destinations = [
    ['嵌入式开发', '电路、代码，以及把想法做出来的过程。', './embedded.html'],
    ['英语沙龙', '坐一会儿，用英语分享今天的新发现。', './english.html']
  ];
  let index = 0, angle = 1.2, down = false, last = 0, delta = 0;
  let paused = reduced.matches, frame = 0, lastFrame = 0, render = () => {};
  function select(n) {
    index = (n + destinations.length) % destinations.length;
    const [title, description, url] = destinations[index];
    document.querySelector('#destination-label').textContent = title;
    document.querySelector('#destination-description').textContent = description;
    document.querySelector('#destination-enter').href = url;
    tabs.forEach((tab, i) => tab.setAttribute('aria-pressed', String(i === index)));
  }
  tabs.forEach((tab, i) => tab.addEventListener('click', () => { select(i); angle = 1.2 + i * 1.9; render(); }));
  canvas.addEventListener('pointerdown', e => {
    if(e.pointerType === 'mouse' && e.button !== 0) return;
    down = true; last = e.clientX; delta = 0; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - last; last = e.clientX; delta += dx;
    angle += dx * .007; render();
  });
  canvas.addEventListener('pointerup', () => { if (!down) return; down = false; if (Math.abs(delta) > 28) select(index + (delta < 0 ? 1 : -1)); });
  canvas.addEventListener('pointercancel', () => { down = false; });
  canvas.addEventListener('lostpointercapture', () => { down = false; });
  canvas.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); const dir = e.key === 'ArrowRight' ? 1 : -1;
    select(index + dir); angle += dir * .6; render();
  });
  // Navigation remains functional if WebGL is unavailable; CSS provides the static planet.
  const gl = canvas.getContext('webgl', {alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power'});
  if (!gl) return;
  const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragment = `
    precision highp float;
    uniform vec2 resolution;
    uniform float rotation;
    float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(p);p=p*2.03+vec3(7.1,2.7,3.4);a*=.5;}return s;}
    uniform sampler2D earthTexture;
    uniform float textureReady;
    vec3 rotateY(vec3 p,float a){return vec3(cos(a)*p.x+sin(a)*p.z,p.y,-sin(a)*p.x+cos(a)*p.z);}
    void main(){
      vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*2.65;
      float r=length(uv);
      vec3 light=normalize(vec3(-.65,.65,.65));
      if(r>1.){discard;}
      vec3 n=vec3(uv,sqrt(max(0.,1.-r*r)));
      vec3 p=rotateY(n,rotation);
      float continents=fbm(p*2.7);
      float detail=fbm(p*10.);
      float fine=fbm(p*34.);
      float coast=smoothstep(.475,.51,continents);
      float depth=smoothstep(.29,.49,continents);
      float arid=smoothstep(.55,.76,detail)*smoothstep(.12,.5,abs(p.y))*(1.-smoothstep(.78,.92,abs(p.y)));
      float hx=fbm(p*8.+vec3(.012,0,0))-fbm(p*8.-vec3(.012,0,0));
      float hy=fbm(p*8.+vec3(0,.012,0))-fbm(p*8.-vec3(0,.012,0));
      vec3 relief=normalize(n+vec3(hx,hy,0.)*1.15);
      vec3 ocean=mix(vec3(.004,.02,.06),vec3(.015,.08,.16),depth);
      vec3 land=mix(vec3(.05,.13,.07),vec3(.16,.25,.12),detail);
      land=mix(land,vec3(.30,.25,.16),arid*.65);
      land=mix(land,vec3(.45,.44,.36),smoothstep(.70,.90,detail)*.25);
      vec3 proceduralSurface=mix(ocean,land,coast);
      float PI=3.14159265;
      float lon=atan(p.z,p.x);
      float lat=asin(clamp(p.y,-1.,1.));
      vec2 earthUv=vec2(lon/(2.*PI)+.5,.5-lat/PI);
      vec3 mapped=texture2D(earthTexture,earthUv).rgb;
      vec3 surface=mix(proceduralSurface,mapped,textureReady);
      float water=mix(1.-coast,smoothstep(.02,.13,mapped.b-mapped.r),textureReady);
      vec3 cloudP=rotateY(n,rotation*.92+.13);
      float clouds=smoothstep(.50,.67,fbm(cloudP*5.+fbm(cloudP*2.3)*.8));
      float ndl=max(dot(n,light),0.);
      float reliefNdl=max(dot(relief,light),0.);
      float lit=mix(mix(ndl,reliefNdl,coast),ndl,textureReady);
      float day=smoothstep(-.06,.20,dot(n,light));
      vec3 color=surface*(.012+lit*1.45);
      color*=.90+.16*fine*coast*(1.-textureReady);
      float cloudAmount=mix(1.,.32,textureReady);
      color*=1.-clouds*.20*day*cloudAmount;
      float spec=pow(max(dot(reflect(-light,n),vec3(0,0,1)),0.),90.);
      color+=vec3(1.,.95,.85)*spec*water*day*.9;
      vec3 cloudColor=vec3(.86,.89,.92)*(.03+day*1.08);
      color=mix(color,cloudColor,clouds*(.55*day+.03)*cloudAmount);
      color*=1.-pow(1.-n.z,2.)*.20;
      color*=mix(vec3(1.),vec3(1.06,1.,.92),day);
      color=pow(max(color,0.),vec3(.9));
      gl_FragColor=vec4(color,1.-smoothstep(.992,1.,r));
    }`;
  try {
    const compile = (type, source) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error('Planet shader unavailable');
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Planet renderer unavailable');
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const size = gl.getUniformLocation(program,'resolution'), turn = gl.getUniformLocation(program,'rotation');
    render = () => {
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(size,canvas.width,canvas.height);
      gl.uniform1f(turn,angle);
      gl.drawArrays(gl.TRIANGLES,0,6);
    };
    const earthUniform=gl.getUniformLocation(program,'earthTexture');
    const readyUniform=gl.getUniformLocation(program,'textureReady');
    const texture=gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([12,24,44,255]));
    gl.uniform1i(earthUniform,0);
    gl.uniform1f(readyUniform,0);
    const earthImage=new Image();
    earthImage.onload=()=>{
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,earthImage);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.uniform1f(readyUniform,1);
      render();
    };
    earthImage.src='./assets/earth-blue-marble.jpg';
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1,1.5);
      canvas.width = Math.round(canvas.clientWidth*dpr); canvas.height = Math.round(canvas.clientHeight*dpr);
      gl.viewport(0,0,canvas.width,canvas.height); render();
    };
    new ResizeObserver(resize).observe(canvas); resize();
    canvas.parentElement.classList.add('rendered'); motion.hidden = false;
    function syncMotion() { motion.textContent = paused ? '开启自转' : '暂停自转'; motion.setAttribute('aria-pressed', String(paused)); }
    function tick(now) {
      frame = 0;
      if(paused || document.hidden) return;
      if(now-lastFrame>=33){if(!down){angle+=Math.min(now-lastFrame,60)*.000055;render();}lastFrame=now;}
      frame=requestAnimationFrame(tick);
    }
    function start(){cancelAnimationFrame(frame);lastFrame=performance.now();if(!paused&&!document.hidden)frame=requestAnimationFrame(tick);}
    motion.onclick=()=>{paused=!paused;syncMotion();start();};
    reduced.addEventListener('change',()=>{paused=reduced.matches;syncMotion();start();});
    document.addEventListener('visibilitychange',start);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);canvas.parentElement.classList.remove('rendered');motion.hidden=true;render=()=>{};});
    syncMotion();start();
  } catch {canvas.parentElement.classList.remove('rendered');motion.hidden=true;}
})();

