import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function PointCloud() {
  const pointsRef = useRef<THREE.Points>(null);
  const mousePosition = useRef({ x: 0, y: 0 });

  // Generate galaxy-like particle positions
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(2000 * 3);

    for (let i = 0; i < 2000; i++) {
      const i3 = i * 3;

      // Create a spiral galaxy shape
      const radius = Math.random() * 5;
      const spinAngle = radius * 2;
      const branchAngle = ((i % 3) / 3) * Math.PI * 2;

      const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;
      const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;
      const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;

      positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
      positions[i3 + 1] = randomY * 0.3;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;
    }

    return positions;
  }, []);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePosition.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animate rotation and respond to mouse
  useFrame((state, delta) => {
    if (pointsRef.current) {
      // Slow auto-rotation
      pointsRef.current.rotation.y += delta * 0.05;

      // Subtle mouse interaction
      const targetRotationX = mousePosition.current.y * 0.2;
      const targetRotationY = mousePosition.current.x * 0.2;

      pointsRef.current.rotation.x += (targetRotationX - pointsRef.current.rotation.x) * 0.02;
      pointsRef.current.rotation.y += (targetRotationY - pointsRef.current.rotation.y) * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#ffffff"
        transparent
        opacity={0.15}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function PointCloudBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <PointCloud />
      </Canvas>
    </div>
  );
}
