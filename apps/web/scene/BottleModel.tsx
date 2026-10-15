"use client";

import { useEffect, useMemo, type MutableRefObject } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { BOTTLE_GLB, SCENE_SCALE } from "./bottle";

type BottleGLTF = {
  nodes: { bottle: THREE.Mesh };
  materials: { label: THREE.MeshStandardMaterial };
};

/**
 * Generated with gltfjsx (`--transform`) from the client's bottle, then hand-tuned. The GLB is meshopt-encoded
 * (`gltf-transform meshopt --level high`), not Draco: three's meshopt decoder is inline JS, so loading never
 * waits on the ~340 KB Draco WASM fetched from gstatic. Draco is switched off below so a stray Draco file fails
 * loudly instead of quietly re-adding that round trip.
 * the single baked texture is both the print and the LED mask (emissive), so the label is the light.
 * The material is cloned so breathing writes never touch useGLTF's shared cache.
 */
export function BottleModel({ ledRef }: { ledRef: MutableRefObject<THREE.MeshStandardMaterial | null> }) {
  const { nodes, materials } = useGLTF(BOTTLE_GLB, false, true) as unknown as BottleGLTF;

  const material = useMemo(() => {
    const m = materials.label.clone();
    // Black glass rather than glTF's default rough metal; dark body pixels stay far below the bloom threshold.
    m.metalness = 0.1;
    m.roughness = 0.28;
    m.envMapIntensity = 1.2;
    m.emissive = new THREE.Color("#ffffff");
    m.emissiveIntensity = 2.2;
    m.toneMapped = false; // lets the LED exceed 1.0 so selective bloom catches only the label
    m.side = THREE.DoubleSide; // the hero dive enters through the mouth: the neck's inner wall has to exist
    return m;
  }, [materials]);

  useEffect(() => {
    ledRef.current = material;
    return () => {
      ledRef.current = null;
      material.dispose();
    };
  }, [ledRef, material]);

  const { geometry, position, scale } = nodes.bottle;

  return (
    <group scale={SCENE_SCALE} dispose={null}>
      <mesh geometry={geometry} material={material} position={position} scale={scale} castShadow />
    </group>
  );
}

useGLTF.preload(BOTTLE_GLB, false, true);
