"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, Center, Environment, useGLTF } from "@react-three/drei";
import { Group, MathUtils } from "three";

type ModelViewerProps = {
  modelPath: string;
};

function Model({ modelPath }: ModelViewerProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(modelPath);

  useFrame(({ pointer }) => {
    if (!groupRef.current) return;

    groupRef.current.rotation.y = MathUtils.lerp(
      groupRef.current.rotation.y,
      pointer.x * 0.45,
      0.08,
    );
    groupRef.current.rotation.x = MathUtils.lerp(
      groupRef.current.rotation.x,
      -pointer.y * 0.18,
      0.08,
    );
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

export default function ModelViewer({ modelPath }: ModelViewerProps) {
  return (
    <Canvas camera={{ position: [0, 1.2, 4], fov: 35 }} dpr={[1, 2]}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.2}>
          <Center>
            <Model modelPath={modelPath} />
          </Center>
        </Bounds>
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload("/models/character_1.glb");
