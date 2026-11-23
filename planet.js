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
    ['英语沙龙', '坐一会儿，用英语分享今天的新发现。', './english.html'],
    ['实验日志', '记录每一次尝试，让小小的进步有迹可循。', './embedded.html#journal']
  ];
  let index = 0, angle = 1.2, down = false, last = 0, delta = 0;
  let paused = reduced.matches, frame = 0, lastFrame = 0, render = () => {};
  function select(n) {
    index = (n + 3) % 3;
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
    vec3 rotateY(vec3 p,float a){return vec3(cos(a)*p.x+sin(a)*p.z,p.y,-sin(a)*p.x+cos(a)*p.z);}
    void main(){
      vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*2.65;
      float r=length(uv);
      vec3 light=normalize(vec3(-.65,.65,.65));
      if(r>1.){
        float glow=exp(-(r-1.)*24.)*.38+exp(-(r-1.)*7.)*.06;
        float side=.55+.45*dot(normalize(vec3(uv,.2)),light);
        gl_FragColor=vec4(vec3(.16,.62,1.),glow*side);return;
      }
      vec3 n=vec3(uv,sqrt(1.-r*r));
      vec3 p=rotateY(n,rotation);
      float continents=fbm(p*3.1);
      float coast=smoothstep(.46,.51,continents);
      float detail=fbm(p*22.);
      vec3 ocean=mix(vec3(.015,.065,.17),vec3(.025,.24,.38),smoothstep(.32,.49,continents));
      vec3 land=mix(vec3(.035,.19,.19),vec3(.24,.40,.30),detail);
      land=mix(land,vec3(.54,.58,.49),smoothstep(.61,.75,continents));
      vec3 surface=mix(ocean,land,coast);
      float polar=smoothstep(.84,.98,abs(p.y)+detail*.08);
      surface=mix(surface,vec3(.65,.78,.85),polar);
      vec3 cloudP=rotateY(n,rotation*.92+.13);
      float clouds=smoothstep(.48,.69,fbm(cloudP*6.+fbm(cloudP*3.)*1.4));
      float diffuse=max(dot(n,light),0.);
      vec3 color=surface*(.06+diffuse*1.4);
      color=mix(color,vec3(.78,.88,1.)*(.10+diffuse*1.1),clouds*.88);
      float spec=pow(max(dot(reflect(-light,n),vec3(0,0,1)),0.),48.);
      color+=vec3(.4,.72,.9)*spec*(1.-coast)*.7;
      float rim=pow(1.-n.z,3.5);
      color+=vec3(.12,.55,1.)*rim*(.15+diffuse*1.7);
      color+=vec3(.35,.16,.5)*pow(1.-n.z,4.)*max(dot(n,normalize(vec3(.9,-.1,.2))),0.)*.6;
      color=pow(color,vec3(.86));
      gl_FragColor=vec4(color,(1.-smoothstep(.995,1.,r)));
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
    render = () => { gl.uniform2f(size,canvas.width,canvas.height); gl.uniform1f(turn,angle); gl.drawArrays(gl.TRIANGLES,0,6); };
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

