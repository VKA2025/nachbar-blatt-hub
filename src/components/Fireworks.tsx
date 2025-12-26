import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

interface Firework {
  particles: Particle[];
  exploded: boolean;
  rocket: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: THREE.Color;
  } | null;
}

const Fireworks = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const fireworksRef = useRef<Firework[]>([]);
  const particleGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const particleMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    camera.position.y = 0;
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Particle system setup
    const maxParticles = 10000;
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeometryRef.current = geometry;

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    particleMaterialRef.current = material;

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // Firework colors - gold, silver, purple, pink, blue
    const fireworkColors = [
      new THREE.Color(0xffd700), // Gold
      new THREE.Color(0xc0c0c0), // Silver
      new THREE.Color(0x9966ff), // Purple
      new THREE.Color(0xff69b4), // Pink
      new THREE.Color(0x00bfff), // Deep sky blue
      new THREE.Color(0xff4500), // Orange red
      new THREE.Color(0x00ff88), // Spring green
    ];

    const createFirework = () => {
      const x = (Math.random() - 0.5) * 60;
      const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
      
      const firework: Firework = {
        particles: [],
        exploded: false,
        rocket: {
          position: new THREE.Vector3(x, -30, 0),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            15 + Math.random() * 8,
            0
          ),
          color: color
        }
      };

      fireworksRef.current.push(firework);
    };

    const explodeFirework = (firework: Firework) => {
      if (!firework.rocket) return;
      
      const particleCount = 80 + Math.floor(Math.random() * 60);
      const baseColor = firework.rocket.color;
      
      for (let i = 0; i < particleCount; i++) {
        // Spherical explosion pattern
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        const speed = 3 + Math.random() * 4;
        
        const vx = Math.sin(theta) * Math.cos(phi) * speed;
        const vy = Math.sin(theta) * Math.sin(phi) * speed;
        const vz = Math.cos(theta) * speed * 0.5;

        // Vary the color slightly
        const color = baseColor.clone();
        color.offsetHSL(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        );

        firework.particles.push({
          position: firework.rocket.position.clone(),
          velocity: new THREE.Vector3(vx, vy, vz),
          color: color,
          life: 1.0,
          maxLife: 1.5 + Math.random() * 1.5,
          size: 0.3 + Math.random() * 0.4
        });
      }

      firework.rocket = null;
      firework.exploded = true;
    };

    const updateFireworks = (delta: number) => {
      const gravity = -9.8 * delta;
      const drag = 0.98;

      fireworksRef.current.forEach((firework, fwIndex) => {
        // Update rocket
        if (firework.rocket) {
          firework.rocket.velocity.y += gravity * 0.5;
          firework.rocket.position.add(
            firework.rocket.velocity.clone().multiplyScalar(delta)
          );

          // Explode when velocity slows enough
          if (firework.rocket.velocity.y < 2) {
            explodeFirework(firework);
          }
        }

        // Update explosion particles
        firework.particles.forEach((particle) => {
          particle.velocity.y += gravity * 0.3;
          particle.velocity.multiplyScalar(drag);
          particle.position.add(
            particle.velocity.clone().multiplyScalar(delta)
          );
          particle.life -= delta / particle.maxLife;
        });

        // Remove dead particles
        firework.particles = firework.particles.filter(p => p.life > 0);
      });

      // Remove finished fireworks
      fireworksRef.current = fireworksRef.current.filter(
        fw => fw.rocket !== null || fw.particles.length > 0
      );
    };

    const updateParticleGeometry = () => {
      const positions = particleGeometryRef.current?.getAttribute('position') as THREE.BufferAttribute;
      const colors = particleGeometryRef.current?.getAttribute('color') as THREE.BufferAttribute;
      const sizes = particleGeometryRef.current?.getAttribute('size') as THREE.BufferAttribute;

      if (!positions || !colors || !sizes) return;

      let particleIndex = 0;

      fireworksRef.current.forEach(firework => {
        // Draw rocket
        if (firework.rocket && particleIndex < 10000) {
          positions.setXYZ(
            particleIndex,
            firework.rocket.position.x,
            firework.rocket.position.y,
            firework.rocket.position.z
          );
          colors.setXYZ(
            particleIndex,
            firework.rocket.color.r,
            firework.rocket.color.g,
            firework.rocket.color.b
          );
          sizes.setX(particleIndex, 1.0);
          particleIndex++;
        }

        // Draw explosion particles
        firework.particles.forEach(particle => {
          if (particleIndex >= 10000) return;
          
          const alpha = Math.pow(particle.life, 0.5);
          positions.setXYZ(
            particleIndex,
            particle.position.x,
            particle.position.y,
            particle.position.z
          );
          colors.setXYZ(
            particleIndex,
            particle.color.r * alpha,
            particle.color.g * alpha,
            particle.color.b * alpha
          );
          sizes.setX(particleIndex, particle.size * alpha);
          particleIndex++;
        });
      });

      // Hide unused particles
      for (let i = particleIndex; i < 10000; i++) {
        positions.setXYZ(i, 0, -1000, 0);
        sizes.setX(i, 0);
      }

      positions.needsUpdate = true;
      colors.needsUpdate = true;
      sizes.needsUpdate = true;
    };

    // Animation loop
    let lastTime = performance.now();
    let fireworkTimer = 0;

    const animate = () => {
      const currentTime = performance.now();
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Launch new fireworks periodically
      fireworkTimer += delta;
      if (fireworkTimer > 0.8 + Math.random() * 0.8) {
        createFirework();
        if (Math.random() > 0.5) {
          setTimeout(() => createFirework(), 100 + Math.random() * 200);
        }
        fireworkTimer = 0;
      }

      updateFireworks(delta);
      updateParticleGeometry();

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      requestAnimationFrame(animate);
    };

    animate();

    // Launch initial fireworks
    setTimeout(() => createFirework(), 100);
    setTimeout(() => createFirework(), 400);
    setTimeout(() => createFirework(), 700);

    // Handle resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10
      }}
      aria-hidden="true"
    />
  );
};

export default Fireworks;
