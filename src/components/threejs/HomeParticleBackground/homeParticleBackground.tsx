import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import './homeParticleBackground.less'
import * as THREE from 'three'

function FloatingParticles() {
  const groupRef = useRef<THREE.Group>(null)

  const particles = useMemo(() => {
    return Array.from({ length: 600 }, () => {
      const position = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      )
        .normalize()
        .multiplyScalar(2 + Math.random() * 16)

      return {
        position,
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ] as [number, number, number],
      }
    })
  }, [])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y -= 0.0015
    }
  })

  return (
    <group ref={groupRef}>
      {particles.map((particle, index) => (
        <mesh
          key={index}
          position={particle.position}
          rotation={particle.rotation}
        >
          <tetrahedronGeometry args={[0.035, 0]} />
          <meshStandardMaterial color="#aaa" flatShading />
        </mesh>
      ))}
    </group>
  )
}

function CenterShape() {
  const wireRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (wireRef.current) {
      wireRef.current.rotation.x -= 0.001
      wireRef.current.rotation.y += 0.002
    }
  })

  return (
    <>
      <mesh ref={wireRef} scale={1.8}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#555" wireframe />
      </mesh>
    </>
  )
}

export default function ThreeBackground() {
  return (
    <div className="three-background">
      <Canvas camera={{ position: [0, 0, 8], fov: 75 }}>

        <ambientLight intensity={1} color="white" />
        <directionalLight position={[0.75, 1, 0.5]} intensity={1} color="hotpink" />
        <directionalLight position={[-0.75, -1, 0.5]} intensity={1} color="blue" />

        <FloatingParticles />
        <CenterShape />
      </Canvas>
    </div>
  )
}