"use client";

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor, ContactShadows, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { TOKENS } from "@velvique/content";
import { LABEL, LED, SCENE_SCALE, breath, type DeviceTier } from "./bottle";
import { BottleModel } from "./BottleModel";

export type BottleSceneProps = {
  tier: Exclude<DeviceTier, 3>;
  onDecline: () => void;
  /** Off-screen canvases stop rendering entirely. */
  active: boolean;
  /** Show a dark table plane that catches the LED spill (la-botella, 4 AM). Hero floats instead. */
  table?: boolean;
  /** 0..1 scroll progress written by a ScrollTrigger; turns the bottle. */
  spin?: MutableRefObject<number>;
  /** 0..1 written by the hero timeline: the camera dollies through the glass into the lit label. */
  dive?: MutableRefObject<number>;
  /**
   * true: orbit all the way around and zoom; the bottle stays put (no pan).
   * "turn": grab and spin the bottle by hand, with inertia. No zoom, vertical swipes still scroll the page (hero).
   */
  interactive?: boolean | "turn";
  cameraZ?: number;
  /** Fires once the model is decoded and its first frame is on screen. */
  onReady?: () => void;
  /** Weak or struggling GPU: no post-processing, 1x pixels. The label still reads (emissive, untonemapped). */
  lite?: boolean;
};

export default function BottleScene({ tier, onDecline, active, table = false, spin, dive, interactive = false, cameraZ = 4.4, onReady, lite = false }: BottleSceneProps) {
  const orbit = interactive === true;
  // Touch screens: one finger must still scroll the page past an orbit canvas. Vertical swipes go to the page,
  // horizontal drags orbit, pinch zooms (pan-y leaves pinch to the canvas). Mouse users keep full orbit.
  const coarse = useMemo(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches, []);
  const turn = interactive === "turn";
  const grab = useRef<Grab>({ down: false, x: 0, t: 0, offset: 0, velocity: 0 });
  const release = (e: ReactPointerEvent<HTMLDivElement>) => {
    grab.current.down = false;
    e.currentTarget.style.cursor = "grab";
  };
  const turnHandlers = turn
    ? {
        onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.style.cursor = "grabbing";
          Object.assign(grab.current, { down: true, x: e.clientX, t: e.timeStamp, velocity: 0 });
        },
        onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
          const g = grab.current;
          if (!g.down) return;
          const delta = (e.clientX - g.x) * 0.012;
          const dt = Math.max((e.timeStamp - g.t) / 1000, 1 / 240);
          g.offset += delta;
          g.velocity = THREE.MathUtils.clamp(THREE.MathUtils.lerp(g.velocity, delta / dt, 0.5), -14, 14);
          g.x = e.clientX;
          g.t = e.timeStamp;
        },
        onPointerUp: release,
        onPointerCancel: release,
      }
    : {};

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={lite ? 1 : tier === 1 ? [1, 2] : [1, 1.25]}
      gl={{ antialias: tier === 1 && !lite, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 1.35, cameraZ], fov: 30, near: 0.1, far: 50 }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.9;
        camera.lookAt(0, 1.25, 0);
      }}
      style={{ touchAction: orbit && !coarse ? "none" : interactive ? "pan-y" : "auto", cursor: interactive ? "grab" : undefined }}
      {...turnHandlers}
    >
      <PerformanceMonitor onDecline={onDecline} flipflops={2} />
      <Suspense fallback={null}>
        <Rig spin={spin} dive={dive} orbit={orbit} grab={turn ? grab : undefined} table={table} />
        {onReady ? <Ready onReady={onReady} /> : null}
      </Suspense>
      {dive && !orbit ? <Dolly dive={dive} cameraZ={cameraZ} /> : null}
      {orbit ? (
        <OrbitControls
          makeDefault
          target={[0, ORBIT_TARGET_Y, 0]}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          zoomSpeed={0.8}
          minDistance={1.1}
          maxDistance={9}
          minPolarAngle={0.15}
          // With a table, stop just above it; floating, the camera may go underneath.
          maxPolarAngle={table ? Math.PI / 2 - 0.04 : Math.PI - 0.15}
        />
      ) : null}
      {/* Near-black environment with one warm practical far behind, so black glass still reads as a shape. */}
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={0.8} color="#4EA9D5" position={[-3.5, 2.2, -6]} scale={[2.4, 1.2, 1]} />
        <Lightformer form="rect" intensity={0.35} color="#ffffff" position={[3, 2.6, 2.5]} scale={[0.4, 4, 1]} />
        <Lightformer form="rect" intensity={0.15} color="#ffffff" position={[-3, 1.2, 2]} scale={[0.3, 3, 1]} />
      </Environment>
      <ambientLight intensity={0.02} />
      {table ? (
        <>
          <Table />
          <ContactShadows position={[0, 0.001, 0]} opacity={0.7} scale={3} blur={2.4} far={1.2} resolution={tier === 1 && !lite ? 512 : 256} />
        </>
      ) : null}
      {lite ? null : (
        <EffectComposer multisampling={tier === 1 ? 4 : 0} enableNormalPass={false} resolutionScale={tier === 1 ? 1 : 0.75}>
          {/* Selective bloom: only the toneMapped:false LED label exceeds threshold 1. */}
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.15} intensity={tier === 1 ? 0.95 : 0.7} radius={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

/** Dark table that fades out radially, so a full-width canvas never shows its rim. */
function Table() {
  const fade = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, "#fff");
      g.addColorStop(0.35, "#fff");
      g.addColorStop(1, "#000");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => fade.dispose(), [fade]);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
      <circleGeometry args={[9, 64]} />
      <meshStandardMaterial color="#0c0c0f" roughness={0.5} metalness={0.15} alphaMap={fade} transparent depthWrite={false} />
    </mesh>
  );
}

/** Bottle mid-height in scene units (2.75 tall); orbit and zoom pivot here. */
const ORBIT_TARGET_Y = 1.3;

/** Hand-turn state, written by pointer events and read per frame. */
type Grab = { down: boolean; x: number; t: number; offset: number; velocity: number };

/** Mounts only after Suspense resolves (model decoded); waits for two drawn frames so shaders are compiled. */
function Ready({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current > 2) return;
    frames.current += 1;
    if (frames.current === 2) onReady();
  });
  return null;
}

const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Bottle height in scene units (0.33 m GLB x SCENE_SCALE); the tilt pivots on its middle. */
const BOTTLE_H = 0.33 * SCENE_SCALE;
const PIVOT_Y = BOTTLE_H / 2;
/** Once tipped toward the lens, the mouth sits on the camera axis at this depth. */
const MOUTH_Z = BOTTLE_H / 2;

/** How far the bottle has tipped its mouth toward the lens: all of it happens before the push commits. */
const tiltAt = (d: number) => smooth(0.04, 0.52, d);

const ease = {
  inOut: (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  in: (x: number) => x * x,
};

/**
 * The dive. The bottle tips its mouth toward us (Rig) while the camera drifts in and drops onto its axis;
 * then the camera commits and rushes the opening, crosses the mouth plane around d = 0.8, and keeps going
 * down the neck. The lens widens through the last stretch, so the entry reads as speed, not a zoom.
 */
function Dolly({ dive, cameraZ }: { dive: MutableRefObject<number>; cameraZ: number }) {
  const from = useMemo(() => ({ y: 1.35, look: new THREE.Vector3(0, 1.25, 0) }), []);
  const to = useMemo(() => ({ look: new THREE.Vector3(0, PIVOT_Y, -6) }), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const last = useRef(-1);

  useFrame(({ camera }) => {
    const d = dive.current;
    if (d === last.current) return;
    last.current = d;
    // Depth keyframes: approach while the bottle turns, then rush the mouth, then into the neck.
    const approach = cameraZ - 1.5;
    const rim = MOUTH_Z + 0.04;
    const inside = MOUTH_Z - 0.6;
    const z =
      d < 0.5
        ? THREE.MathUtils.lerp(cameraZ, approach, ease.inOut(d / 0.5))
        : d < 0.8
          ? THREE.MathUtils.lerp(approach, rim, ease.in((d - 0.5) / 0.3))
          : THREE.MathUtils.lerp(rim, inside, (d - 0.8) / 0.2);
    const aim = smooth(0, 0.5, d);
    camera.position.set(0, THREE.MathUtils.lerp(from.y, PIVOT_Y, aim), z);
    look.lerpVectors(from.look, to.look, aim);
    camera.lookAt(look);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 30 + 26 * ease.in(smooth(0.45, 1, d));
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

function Rig({
  spin,
  dive,
  orbit,
  grab,
  table,
}: {
  spin?: MutableRefObject<number>;
  dive?: MutableRefObject<number>;
  orbit: boolean;
  grab?: MutableRefObject<Grab>;
  table: boolean;
}) {
  const led = useRef<THREE.MeshStandardMaterial | null>(null);
  const spill = useRef<THREE.PointLight>(null);
  const turn = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  // Coast after a hand turn is released; the pointer handlers only record the drag itself.
  const coast = useRef({ offset: 0, velocity: 0, wasDown: false });

  // R3F's model: Three objects are mutated per frame outside React.
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const b = breath(t, TOKENS.ledBreathSeconds);
    if (led.current) led.current.emissiveIntensity = 1.5 + 1.7 * b;
    if (spill.current) spill.current.intensity = (table ? 2.2 : 1.4) + (table ? 3 : 1.6) * b;

    const g = turn.current;
    // Orbit: OrbitControls moves the camera; the bottle holds still.
    if (!g || orbit) return;
    // Dive: the bottle tips forward on its middle until the mouth points straight at the lens.
    if (tilt.current) tilt.current.rotation.x = (Math.PI / 2) * tiltAt(dive?.current ?? 0);
    const hand = grab?.current;
    const held = Boolean(hand?.down);
    const c = coast.current;
    // Let go: the spin coasts out like a bottle turned on a bar top.
    if (c.wasDown && !held) c.velocity = hand?.velocity ?? 0;
    if (held) c.velocity = 0;
    c.wasDown = held;
    if (c.velocity !== 0) {
      c.offset += c.velocity * dt;
      c.velocity = THREE.MathUtils.damp(c.velocity, 0, 2.2, dt);
      if (Math.abs(c.velocity) < 0.002) c.velocity = 0;
    }
    const scroll = spin?.current ?? 0;
    const idle = Math.sin(t * 0.18) * 0.22;
    const follow = held ? 0 : state.pointer.x * 0.3;
    const free = idle + follow + scroll * Math.PI * 1.2 + (hand?.offset ?? 0) + c.offset;
    // Diving: whatever turn it was left at, the label comes round to face the lens.
    const front = smooth(0, 0.35, dive?.current ?? 0);
    const facing = Math.round(free / (Math.PI * 2)) * Math.PI * 2;
    const target = THREE.MathUtils.lerp(free, facing, front);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, target, held && front === 0 ? 14 : 4, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, held ? 0 : -state.pointer.y * 0.04, 3, dt);
  });

  return (
    <group position-y={PIVOT_Y}>
      <group ref={tilt}>
        <group ref={turn} position-y={-PIVOT_Y}>
          <BottleModel ledRef={led} />
          {/* Spill: the label lights the table and nearby hands. */}
          <pointLight ref={spill} color={LED} intensity={2.5} distance={3.2} decay={2} position={[0, LABEL.y, LABEL.z + 0.35]} />
        </group>
      </group>
    </group>
  );
}
