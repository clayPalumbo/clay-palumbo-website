import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const { camera } = useThree();

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouse({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Generate particle field
  const particleData = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Spread particles in 3D space
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 30 - 10; // Bias toward back

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Gradient colors based on depth (closer = warmer)
      const depth = (z + 25) / 40; // Normalize z to 0-1
      const color = new THREE.Color();

      // Cool blue (far) to warm cyan/white (close)
      color.setHSL(0.55 - depth * 0.15, 0.6 - depth * 0.3, 0.4 + depth * 0.3);

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Size based on depth (closer = bigger)
      sizes[i] = 1 + depth * 3;

      // Slow drift velocity
      velocities[i3] = (Math.random() - 0.5) * 0.005;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.008;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
    }

    return { positions, colors, sizes, velocities, count };
  }, []);

  // Animate particles and camera
  useFrame(() => {
    if (pointsRef.current) {
      const positionAttribute = pointsRef.current.geometry.attributes.position;

      // Move particles
      for (let i = 0; i < particleData.count; i++) {
        const i3 = i * 3;

        positionAttribute.array[i3] += particleData.velocities[i3];
        positionAttribute.array[i3 + 1] += particleData.velocities[i3 + 1];
        positionAttribute.array[i3 + 2] += particleData.velocities[i3 + 2];

        // Wrap around boundaries
        if (positionAttribute.array[i3] > 20) positionAttribute.array[i3] = -20;
        if (positionAttribute.array[i3] < -20) positionAttribute.array[i3] = 20;
        if (positionAttribute.array[i3 + 1] > 20) positionAttribute.array[i3 + 1] = -20;
        if (positionAttribute.array[i3 + 1] < -20) positionAttribute.array[i3 + 1] = 20;
        if (positionAttribute.array[i3 + 2] > 5) positionAttribute.array[i3 + 2] = -25;
        if (positionAttribute.array[i3 + 2] < -25) positionAttribute.array[i3 + 2] = 5;
      }

      positionAttribute.needsUpdate = true;
    }

    // Parallax camera movement based on mouse
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 2, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouse.y * 2, 0.05);
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      {/* Glow layer - larger, more transparent */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleData.count}
            array={particleData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleData.count}
            array={particleData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particleData.count}
            array={particleData.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.2}
          vertexColors={true}
          sizeAttenuation={true}
          transparent={true}
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Core layer - smaller, brighter */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleData.count}
            array={particleData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleData.count}
            array={particleData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particleData.count}
            array={particleData.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          vertexColors={true}
          sizeAttenuation={true}
          transparent={true}
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}

export default function PointCloudBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ParticleField />
      </Canvas>
    </div>
  );
}
