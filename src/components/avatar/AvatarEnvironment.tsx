import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { StageTheme } from '../../types/avatar';

interface AvatarEnvironmentProps {
  theme: StageTheme;
}

/**
 * Child-friendly 3D Environment with optimized lighting, thematic platforms, and floating sparkles
 */
export const AvatarEnvironment: React.FC<AvatarEnvironmentProps> = ({ theme }) => {
  const particlesRef = useRef<THREE.Points>(null);

  // Sparkle particle positions
  const particleGeo = useMemo(() => {
    const count = 45;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 6;
      positions[i + 1] = Math.random() * 3.5 - 0.5;
      positions[i + 2] = (Math.random() - 0.5) * 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  // Slowly rotate sparkles
  useFrame((_, delta) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.08;
    }
  });

  // Theme color palettes
  const themeConfig = useMemo(() => {
    switch (theme) {
      case 'forest':
        return {
          ambientColor: '#ecfdf5',
          ambientIntensity: 0.9,
          dirLightColor: '#fef08a',
          dirLightIntensity: 1.3,
          fillColor: '#86efac',
          platformColor: '#bbf7d0',
          particleColor: '#fef08a',
          hasPlatform: true,
        };
      case 'cosmic':
        return {
          ambientColor: '#312e81',
          ambientIntensity: 0.75,
          dirLightColor: '#c084fc',
          dirLightIntensity: 1.5,
          fillColor: '#38bdf8',
          platformColor: '#1e1b4b',
          particleColor: '#38bdf8',
          hasPlatform: true,
        };
      case 'toyroom':
        return {
          ambientColor: '#fffbeb',
          ambientIntensity: 0.95,
          dirLightColor: '#fde047',
          dirLightIntensity: 1.2,
          fillColor: '#f472b6',
          platformColor: '#fed7aa',
          particleColor: '#fbcfe8',
          hasPlatform: true,
        };
      case 'transparent':
        return {
          ambientColor: '#ffffff',
          ambientIntensity: 0.95,
          dirLightColor: '#ffffff',
          dirLightIntensity: 1.2,
          fillColor: '#e2e8f0',
          platformColor: '#000000',
          particleColor: '#f59e0b',
          hasPlatform: false, // Clean transparent shadow catcher
        };
      case 'studio':
        return {
          ambientColor: '#ffffff',
          ambientIntensity: 0.9,
          dirLightColor: '#ffffff',
          dirLightIntensity: 1.1,
          fillColor: '#cbd5e1',
          platformColor: '#f1f5f9',
          particleColor: '#94a3b8',
          hasPlatform: true,
        };
      case 'playground':
      default:
        return {
          ambientColor: '#ffffff',
          ambientIntensity: 0.9,
          dirLightColor: '#fffbeb',
          dirLightIntensity: 1.3,
          fillColor: '#fed7aa',
          platformColor: '#fef3c7',
          particleColor: '#fbbf24',
          hasPlatform: true,
        };
    }
  }, [theme]);

  return (
    <>
      {/* 1. Ambient Illumination */}
      <ambientLight color={themeConfig.ambientColor} intensity={themeConfig.ambientIntensity} />

      {/* 2. Key Sun/Directional Light with Soft Shadows */}
      <directionalLight
        position={[3, 5, 3.5]}
        intensity={themeConfig.dirLightIntensity}
        color={themeConfig.dirLightColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={3}
        shadow-camera-bottom={-1}
      />

      {/* 3. Soft Warm Fill Light */}
      <pointLight position={[-3, 2, 2]} intensity={0.65} color={themeConfig.fillColor} />

      {/* 4. Subtle Back/Rim Light for cartoon silhouette definition */}
      <directionalLight position={[0, 4, -4]} intensity={0.4} color="#ffffff" />

      {/* 5. Theme Floor Platform */}
      {themeConfig.hasPlatform ? (
        <mesh position={[0, -0.7, 0]} receiveShadow>
          <cylinderGeometry args={[1.7, 1.9, 0.18, 32]} />
          <meshStandardMaterial
            color={themeConfig.platformColor}
            roughness={0.6}
            metalness={0.08}
          />
        </mesh>
      ) : (
        /* Transparent Contact Shadow Receiver */
        <mesh position={[0, -0.7, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[6, 6]} />
          <shadowMaterial opacity={0.25} />
        </mesh>
      )}

      {/* 6. Floating Sparkles */}
      {theme !== 'transparent' && (
        <points ref={particlesRef} geometry={particleGeo}>
          <pointsMaterial
            color={themeConfig.particleColor}
            size={0.075}
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
    </>
  );
};
