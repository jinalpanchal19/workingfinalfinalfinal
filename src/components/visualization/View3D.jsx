import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useProject } from '@/lib/ProjectContext';
import { layoutSheet } from '@/lib/layoutSelection';
import { getMaterial } from '@/lib/materials';

/* ---------- Procedural material textures ---------- */

function makeCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function woodTexture(base, edge) {
  const c = makeCanvas(512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  // grain lines
  for (let i = 0; i < 60; i++) {
    const y = (i / 60) * 512 + (Math.random() * 6 - 3);
    const alpha = 0.04 + Math.random() * 0.06;
    ctx.strokeStyle = `rgba(90,55,25,${alpha})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 16) {
      ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 4);
    }
    ctx.stroke();
  }
  // lighter streaks
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = `rgba(230,200,150,${0.05 + Math.random() * 0.05})`;
    ctx.lineWidth = 2 + Math.random() * 3;
    ctx.beginPath();
    const y = Math.random() * 512;
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + (Math.random() * 20 - 10));
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function mdfTexture(base) {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  // fine fiber noise
  const img = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function cardboardTexture(base, edge) {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  // corrugation flutes
  for (let x = 0; x < 256; x += 6) {
    ctx.fillStyle = `rgba(120,80,40,${0.12 + Math.random() * 0.08})`;
    ctx.fillRect(x, 0, 2, 256);
  }
  // paper fiber noise
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(150,110,60,${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function metalTexture(base) {
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  // brushed lines
  for (let x = 0; x < 256; x += 1) {
    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeSheetMaterial(matDef, repeat) {
  const t = matDef.three;
  const mat = new THREE.MeshStandardMaterial({ color: t.color, roughness: t.roughness, metalness: t.metalness });
  if (t.kind === 'wood') {
    const tex = woodTexture(t.color, t.edgeColor);
    tex.repeat.set(repeat.x, repeat.y);
    mat.map = tex;
  } else if (t.kind === 'mdf') {
    const tex = mdfTexture(t.color);
    tex.repeat.set(repeat.x, repeat.y);
    mat.map = tex;
  } else if (t.kind === 'cardboard') {
    const tex = cardboardTexture(t.color, t.edgeColor);
    tex.repeat.set(repeat.x, repeat.y);
    mat.map = tex;
  } else if (t.kind === 'metal') {
    const tex = metalTexture(t.color);
    tex.repeat.set(repeat.x, repeat.y);
    mat.map = tex;
    mat.envMapIntensity = 1;
  } else if (t.kind === 'acrylic') {
    mat.transparent = true;
    mat.opacity = t.opacity;
    mat.roughness = t.roughness;
    mat.metalness = 0;
  }
  return mat;
}

function makePieceMaterial(matDef, pieceColor) {
  const t = matDef.three;
  const mat = new THREE.MeshStandardMaterial({
    color: t.color,
    roughness: t.roughness,
    metalness: t.metalness,
    emissive: new THREE.Color(pieceColor),
    emissiveIntensity: 0.14,
  });
  if (t.kind === 'wood') mat.map = woodTexture(t.color, t.edgeColor);
  else if (t.kind === 'mdf') mat.map = mdfTexture(t.color);
  else if (t.kind === 'cardboard') mat.map = cardboardTexture(t.color, t.edgeColor);
  else if (t.kind === 'metal') mat.map = metalTexture(t.color);
  else if (t.kind === 'acrylic') {
    mat.transparent = true;
    mat.opacity = t.opacity;
  }
  return mat;
}

/* ---------- Component ---------- */

export default function View3D({ layoutSource = 'layout', layoutData = null, synchronizedSheet = null, onSheetChange = null, height = 460 }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const piecesGroupRef = useRef(null);
  const pieceMeshesRef = useRef([]); // [{ mesh, edges, data }]
  const sheetRef = useRef(null);
  const sheetEdgesRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const camTargetRef = useRef({ pos: null, look: null });
  const explodedRef = useRef(0);
  const explodedTargetRef = useRef(0);

  const { layout, baseline, plans, material, matDef, selectedInstanceId, setSelectedInstanceId, activeSheetIndex, setActiveSheetIndex } = useProject();
  const source = layoutData ?? (layoutSource === 'baseline' ? baseline : layoutSource === 'layout' ? layout : plans?.[layoutSource]);

  const sheetIndex = synchronizedSheet ?? activeSheetIndex;
  const sourceSheet = layoutSheet(source,sheetIndex);
  const changeSheet = onSheetChange ?? setActiveSheetIndex;
  useEffect(() => {if (synchronizedSheet === null) setActiveSheetIndex(0);}, [source,synchronizedSheet,setActiveSheetIndex]);
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0, visible: false, text: '' });
  const [exploded, setExploded] = useState(false);
  const [explodeDist, setExplodeDist] = useState(1);
  const [view, setView] = useState('iso');

  // One-time scene setup
  useEffect(() => {
    const mount = mountRef.current;
    const w = mount.clientWidth;
    const h = height;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F4F7F5');

    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 20000);
    camera.position.set(1400, 1100, 1400);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 100;
    controls.maxDistance = 9000;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb0b8b4, 0.7);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(800, 1600, 900);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -2000;
    key.shadow.camera.right = 2000;
    key.shadow.camera.top = 2000;
    key.shadow.camera.bottom = -2000;
    key.shadow.camera.near = 100;
    key.shadow.camera.far = 6000;
    key.shadow.bias = -0.0004;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfeee6, 0.4);
    fill.position.set(-900, 700, -600);
    scene.add(fill);

    // Ground + grid
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8000, 8000),
      new THREE.MeshStandardMaterial({ color: '#E8EDE9', roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(8000, 80, 0x16a34a, 0xcbd5d0);
    grid.position.y = -1;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    scene.add(grid);

    // Axes guide
    const axes = new THREE.AxesHelper(300);
    axes.position.set(-1400, 0, -1000);
    scene.add(axes);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      // camera lerp
      const ct = camTargetRef.current;
      if (ct.pos) {
        camera.position.lerp(ct.pos, 0.12);
        if (ct.look) controls.target.lerp(ct.look, 0.12);
        if (camera.position.distanceTo(ct.pos) < 1.5) ct.pos = null;
      }
      // exploded lerp
      if (Math.abs(explodedRef.current - explodedTargetRef.current) > 0.01) {
        explodedRef.current += (explodedTargetRef.current - explodedRef.current) * 0.12;
        applyExploded();
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nw = mount.clientWidth;
      camera.aspect = nw / h;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
     
  }, [height]);

  // Build / rebuild sheet + pieces when layout or material changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous
    if (piecesGroupRef.current) {
      scene.remove(piecesGroupRef.current);
      piecesGroupRef.current.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
    if (sheetRef.current) {
      scene.remove(sheetRef.current);
      sheetRef.current.geometry.dispose();
      sheetRef.current.material.dispose();
    }

    pieceMeshesRef.current = [];
    if (sheetEdgesRef.current) {scene.remove(sheetEdgesRef.current);sheetEdgesRef.current.geometry.dispose();sheetEdgesRef.current.material.dispose();sheetEdgesRef.current=null;}
    if (!sourceSheet) return;

    const W = sourceSheet.width;
    const H = sourceSheet.height;
    const T = Math.max(material.thickness, 4);
    const def = getMaterial(material.type);

    // Sheet
    const repeat = { x: Math.max(1, W / 600), y: Math.max(1, H / 600) };
    const sheetMat = makeSheetMaterial(def, repeat);
    const sheetGeo = new THREE.BoxGeometry(W, T, H);
    const sheet = new THREE.Mesh(sheetGeo, sheetMat);
    sheet.position.y = T / 2;
    sheet.castShadow = true;
    sheet.receiveShadow = true;
    scene.add(sheet);
    sheetRef.current = sheet;

    // Sheet edge outline
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(sheetGeo),
      new THREE.LineBasicMaterial({ color: 0x123d26, transparent: true, opacity: 0.5 })
    );
    edges.position.copy(sheet.position);
    scene.add(edges);
    sheetEdgesRef.current=edges;

    // Pieces
    const group = new THREE.Group();
    const meshes = [];
    [sourceSheet].forEach((s) => {
      const sIdx=s.index;
      s.placements.forEach((p, pIdx) => {
        const pT = T; // pieces share sheet thickness
        const geo = new THREE.BoxGeometry(p.w, pT, p.h);
        const pmat = makePieceMaterial(def, p.color || '#16A34A');
        const mesh = new THREE.Mesh(geo, pmat);
        const cx = (p.x + p.w / 2) - W / 2;
        const cz = (p.y + p.h / 2) - H / 2;
        mesh.position.set(cx, T + pT / 2 + 0.5, cz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { ...p, sheet: sIdx, baseY: T + pT / 2 + 0.5, index: pIdx };
        group.add(mesh);

        // colored edge outline
        const eGeo = new THREE.EdgesGeometry(geo);
        const eMat = new THREE.LineBasicMaterial({ color: new THREE.Color(p.color || '#16A34A') });
        const eLines = new THREE.LineSegments(eGeo, eMat);
        eLines.position.copy(mesh.position);
        group.add(eLines);

        meshes.push({ mesh, edges: eLines, data: p });
      });
    });
    scene.add(group);
    piecesGroupRef.current = group;
    pieceMeshesRef.current = meshes;

    // Fit camera to content
    fitCamera();
     
  }, [sourceSheet, material.type, material.thickness]);

  // Apply exploded offsets
  function applyExploded() {
    const meshes = pieceMeshesRef.current;
    const dist = explodedRef.current;
    meshes.forEach(({ mesh }, i) => {
      const baseY = mesh.userData.baseY;
      mesh.position.y = baseY + i * dist * 40;
    });
  }

  useEffect(() => {
    explodedTargetRef.current = exploded ? explodeDist : 0;
     
  }, [exploded, explodeDist]);

  // Selection highlight
  useEffect(() => {
    pieceMeshesRef.current.forEach(({ mesh, edges, data }) => {
      const sel = data.instanceId === selectedInstanceId;
      mesh.material.emissiveIntensity = sel ? 0.5 : 0.14;
      edges.material.color.set(sel ? 0xffffff : new THREE.Color(data.color || '#16A34A'));
      edges.scale.setScalar(sel ? 1.04 : 1.0);
    });
    if (selectedInstanceId) {
      const found = pieceMeshesRef.current.find(({ data }) => data.instanceId === selectedInstanceId);
      if (found) focusOn(found.mesh);
    }
     
  }, [selectedInstanceId]);

  // Camera presets
  const setCamera = useCallback((pos, look) => {
    camTargetRef.current = { pos: new THREE.Vector3().fromArray(pos), look: new THREE.Vector3().fromArray(look) };
  }, []);

  const fitCamera = useCallback(() => {
    const W = sourceSheet?.width || material.sheetWidth || 1000;
    const H = sourceSheet?.height || material.sheetHeight || 1000;
    const d = Math.max(W, H) * 1.4;
    setCamera([d * 0.8, d * 0.7, d * 0.8], [0, 0, 0]);
     
  }, [sourceSheet, material.sheetWidth, material.sheetHeight]);

  const focusOn = useCallback((mesh) => {
    const p = mesh.position;
    setCamera([p.x + 400, p.y + 500, p.z + 400], [p.x, p.y, p.z]);
     
  }, []);

  const setViewPreset = (v) => {
    setView(v);
    const W = sourceSheet?.width || material.sheetWidth || 1000;
    const H = sourceSheet?.height || material.sheetHeight || 1000;
    const d = Math.max(W, H) * 1.6;
    if (v === 'iso') setCamera([d * 0.7, d * 0.6, d * 0.7], [0, 0, 0]);
    else if (v === 'top') setCamera([0, d, 0.01], [0, 0, 0]);
    else if (v === 'side') setCamera([0, 50, d], [0, 0, 0]);
    else if (v === 'reset') fitCamera();
  };

  // Pointer interaction
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const onMove = (e) => {
      const rect = mount.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
      const meshes = pieceMeshesRef.current.map((m) => m.mesh);
      const hits = raycasterRef.current.intersectObjects(meshes, false);
      if (hits.length) {
        const d = hits[0].object.userData;
        setHovered(d.instanceId);
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true, text: `${d.name} · ${Math.round(d.w)}×${Math.round(d.h)}mm${d.rotated ? ' · rotated' : ''}` });
        mount.style.cursor = 'pointer';
      } else {
        setHovered(null);
        setTooltip((t) => ({ ...t, visible: false }));
        mount.style.cursor = 'grab';
      }
    };
    const onClick = (e) => {
      const rect = mount.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
      const meshes = pieceMeshesRef.current.map((m) => m.mesh);
      const hits = raycasterRef.current.intersectObjects(meshes, false);
      if (hits.length) {
        setSelectedInstanceId(hits[0].object.userData.instanceId);
      } else {
        setSelectedInstanceId(null);
      }
    };
    mount.addEventListener('pointermove', onMove);
    mount.addEventListener('click', onClick);
    return () => {
      mount.removeEventListener('pointermove', onMove);
      mount.removeEventListener('click', onClick);
    };
     
  }, [source]);

  const hasLayout = !!sourceSheet;

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mountRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Camera controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-xl border border-[#E2E8E4] p-1 shadow-sm">
        {[
          { v: 'iso', label: 'Iso' },
          { v: 'top', label: 'Top' },
          { v: 'side', label: 'Side' },
          { v: 'reset', label: 'Fit' },
        ].map((b) => (
          <button
            key={b.v}
            onClick={() => setViewPreset(b.v)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              view === b.v ? 'bg-[#123D26] text-white' : 'text-[#64748B] hover:bg-[#F4F7F5]'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Exploded view */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-3 bg-white/90 backdrop-blur rounded-xl border border-[#E2E8E4] px-3 py-1.5 shadow-sm">
        <label className="flex items-center gap-2 text-xs font-medium text-[#172B21] cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-[#16A34A]" checked={exploded} onChange={(e) => setExploded(e.target.checked)} disabled={!hasLayout} />
          Exploded
        </label>
        {exploded && (
          <input
            type="range"
            min={0.2}
            max={3}
            step={0.1}
            value={explodeDist}
            onChange={(e) => setExplodeDist(Number(e.target.value))}
            className="w-20 accent-[#16A34A]"
          />
        )}
      </div>

      {source?.sheets.length > 1 && <div className="absolute bottom-3 left-3 z-10 flex gap-1 bg-white/90 rounded-xl border border-[#E2E8E4] p-1">{source.sheets.map((s,i) => <button key={s.index} onClick={() => changeSheet(i)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${i === sheetIndex ? 'bg-[#123D26] text-white' : 'text-[#64748B]'}`}>{s.stockKind==='offcut'?'Offcut':'Sheet'} {i+1}</button>)}</div>}
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-20 pointer-events-none bg-[#123D26] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.text}
        </div>
      )}

      {!hasLayout && (
        <div className="absolute inset-0 flex items-center justify-center text-[#94A3B8] text-sm bg-white/40">
          No corresponding sheet in this layout. Select another sheet or run optimization.
        </div>
      )}
    </div>
  );
}
