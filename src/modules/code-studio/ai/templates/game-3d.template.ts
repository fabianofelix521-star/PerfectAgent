import type { TemplateDefinition } from "../../types";
import {
  REACT_BASE_DEPS,
  REACT_BASE_DEV_DEPS,
  buildReactBaseFiles,
} from "./_reactBase";

const sceneCss = `body { @apply bg-slate-950 text-white; }\ncanvas { display: block; outline: none; }\n.hud { position: absolute; top: 1rem; left: 1rem; z-index: 10; pointer-events: none; }\n`;

const cubeScene = `import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float } from '@react-three/drei';
import { useRef } from 'react';
import type { Mesh } from 'three';

function SpinningCube({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => { if (!ref.current) return; ref.current.rotation.x += delta * 0.6; ref.current.rotation.y += delta * 0.8; });
  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={1}>
      <mesh ref={ref} position={position} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.2} />
      </mesh>
    </Float>
  );
}

export function CubeScene() {
  return (
    <Canvas shadows camera={{ position: [4, 3, 6], fov: 55 }} className="absolute inset-0">
      <color attach="background" args={['#020617']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <Stars radius={120} depth={50} count={3000} factor={4} fade />
      <SpinningCube position={[-2, 0, 0]} color="#6366f1" />
      <SpinningCube position={[0, 0.5, 0]} color="#22d3ee" />
      <SpinningCube position={[2, 0, 0]} color="#f472b6" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <OrbitControls enableDamping makeDefault />
    </Canvas>
  );
}
`;

const planetScene = `import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';

function Planet({ orbit, size, color, speed }: { orbit: number; size: number; color: string; speed: number }) {
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * speed;
    if (mesh.current) mesh.current.rotation.y += delta * 0.5;
  });
  return (
    <group ref={group}>
      <mesh ref={mesh} position={[orbit, 0, 0]}>
        <sphereGeometry args={[size, 48, 48]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  );
}

export function PlanetScene() {
  return (
    <Canvas camera={{ position: [0, 5, 10], fov: 55 }} className="absolute inset-0">
      <color attach="background" args={['#020617']} />
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={3} color="#fde68a" />
      <Stars radius={150} depth={60} count={4000} factor={5} fade />
      <mesh>
        <sphereGeometry args={[1.2, 48, 48]} />
        <meshBasicMaterial color="#fde68a" />
      </mesh>
      <Planet orbit={3} size={0.4} color="#94a3b8" speed={0.6} />
      <Planet orbit={4.5} size={0.55} color="#22d3ee" speed={0.4} />
      <Planet orbit={6.5} size={0.7} color="#f97316" speed={0.3} />
      <Planet orbit={8.5} size={0.45} color="#a78bfa" speed={0.22} />
      <OrbitControls enableDamping makeDefault />
    </Canvas>
  );
}
`;

const particleScene = `import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import type { Points } from 'three';
import * as THREE from 'three';

function ParticleField({ count = 4000 }: { count?: number }) {
  const points = useRef<Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 4;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(p) * Math.cos(t);
      arr[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      arr[i * 3 + 2] = r * Math.cos(p);
    }
    return arr;
  }, [count]);
  useFrame((_, delta) => { if (points.current) points.current.rotation.y += delta * 0.1; });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color={new THREE.Color('#22d3ee')} sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

export function ParticleScene() {
  return (
    <Canvas camera={{ position: [0, 0, 12], fov: 55 }} className="absolute inset-0">
      <color attach="background" args={['#020617']} />
      <ParticleField />
      <OrbitControls enableDamping makeDefault autoRotate autoRotateSpeed={0.4} />
    </Canvas>
  );
}
`;

const hud = `import type { ReactNode } from 'react';
export function Hud({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="hud">
      <p className="text-xs uppercase tracking-widest text-cyan-300">NEXUS · 3D Sandbox</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
      {children}
    </div>
  );
}
`;

const sceneSelector = `import type { SceneId } from '../scenes/scenes';
import { SCENES } from '../scenes/scenes';
export function SceneSelector({ active, onChange }: { active: SceneId; onChange: (s: SceneId) => void }) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 rounded-2xl bg-slate-900/80 backdrop-blur border border-slate-700 p-1.5 pointer-events-auto">
      {SCENES.map((s) => (
        <button key={s.id} type="button" onClick={() => onChange(s.id)} className={'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ' + (active === s.id ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800')}>{s.label}</button>
      ))}
    </div>
  );
}
`;

const fpsCounter = `import { useEffect, useState } from 'react';
export function FpsCounter() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0; let last = performance.now(); let raf = 0;
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) { setFps(Math.round((frames * 1000) / (now - last))); frames = 0; last = now; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur border border-slate-700 text-xs font-mono text-cyan-300">
      {fps} FPS
    </div>
  );
}
`;

const useKeyboard = `import { useEffect, useState } from 'react';
export function useKeyboard(): Set<string> {
  const [keys, setKeys] = useState<Set<string>>(new Set());
  useEffect(() => {
    const down = (e: KeyboardEvent) => setKeys((k) => { const n = new Set(k); n.add(e.key.toLowerCase()); return n; });
    const up = (e: KeyboardEvent) => setKeys((k) => { const n = new Set(k); n.delete(e.key.toLowerCase()); return n; });
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);
  return keys;
}
`;

const scenesIndex = `import { CubeScene } from './CubeScene';
import { PlanetScene } from './PlanetScene';
import { ParticleScene } from './ParticleScene';
import type { ComponentType } from 'react';

export type SceneId = 'cubes' | 'planets' | 'particles';
export interface SceneEntry { id: SceneId; label: string; description: string; component: ComponentType }
export const SCENES: SceneEntry[] = [
  { id: 'cubes', label: 'Cubos', description: 'Três cubos flutuantes com sombras e estrelas.', component: CubeScene },
  { id: 'planets', label: 'Planetas', description: 'Mini sistema solar em órbita.', component: PlanetScene },
  { id: 'particles', label: 'Partículas', description: 'Campo esférico de 4000 partículas em ciânico.', component: ParticleScene },
];
`;

const readme = `# Nexus 3D Sandbox

Mini-engine 3D com três cenas (cubos, planetas, partículas), HUD configurável, contador de FPS e seletor de cena.

## Stack
- three.js
- @react-three/fiber
- @react-three/drei

## Controles
- Arraste para orbitar
- Scroll para zoom
- Use o seletor inferior para trocar de cena
`;

const gitignore = `node_modules\ndist\n.DS_Store\n*.log\n.env\n.env.local\n`;

const app = `import { useState } from 'react';\nimport { SCENES, type SceneId } from './scenes/scenes';\nimport { Hud } from './components/Hud';\nimport { SceneSelector } from './components/SceneSelector';\nimport { FpsCounter } from './components/FpsCounter';\n\nexport default function App() {\n  const [active, setActive] = useState<SceneId>('cubes');\n  const entry = SCENES.find((s) => s.id === active) ?? SCENES[0];\n  const SceneComponent = entry.component;\n  return (\n    <div className="relative w-screen h-screen overflow-hidden">\n      <SceneComponent />\n      <Hud title={entry.label} subtitle={entry.description} />\n      <FpsCounter />\n      <SceneSelector active={active} onChange={setActive} />\n    </div>\n  );\n}\n`;

export const game3dTemplate: TemplateDefinition = {
  id: "game-3d",
  name: "Cena 3D",
  description:
    "Sandbox interativa em 3D com Three.js, react-three-fiber e drei.",
  framework: "react",
  tags: ["3d", "three", "game", "webgl"],
  dependencies: {
    ...REACT_BASE_DEPS,
    three: "^0.166.0",
    "@react-three/fiber": "^8.16.0",
    "@react-three/drei": "^9.108.0",
  },
  devDependencies: { ...REACT_BASE_DEV_DEPS, "@types/three": "^0.166.0" },
  commands: ["npm install", "npm run dev"],
  files: [
    ...buildReactBaseFiles({
      packageName: "nexus-3d",
      extraDeps: {
        three: "^0.166.0",
        "@react-three/fiber": "^8.16.0",
        "@react-three/drei": "^9.108.0",
      },
      extraDevDeps: { "@types/three": "^0.166.0" },
    }),
    {
      path: "src/index.css",
      content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n${sceneCss}\n`,
    },
    { path: "src/scenes/CubeScene.tsx", content: cubeScene },
    { path: "src/scenes/PlanetScene.tsx", content: planetScene },
    { path: "src/scenes/ParticleScene.tsx", content: particleScene },
    { path: "src/scenes/scenes.ts", content: scenesIndex },
    { path: "src/components/Hud.tsx", content: hud },
    { path: "src/components/SceneSelector.tsx", content: sceneSelector },
    { path: "src/components/FpsCounter.tsx", content: fpsCounter },
    { path: "src/hooks/useKeyboard.ts", content: useKeyboard },
    { path: "src/App.tsx", content: app },
    { path: "README.md", content: readme },
    { path: ".gitignore", content: gitignore },
  ],
};
