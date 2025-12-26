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

interface RocketTrail {
  position: THREE.Vector3;
  life: number;
  color: THREE.Color;
}

interface Firework {
  particles: Particle[];
  exploded: boolean;
  rocket: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: THREE.Color;
    trail: RocketTrail[];
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
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup camera - positioned to see rockets fly from bottom to top
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 80;
    camera.position.y = 20;
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
    const maxParticles = 15000;
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeometryRef.current = geometry;

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    particleMaterialRef.current = material;

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Firework colors
    const fireworkColors = [
      new THREE.Color(0xffd700), // Gold
      new THREE.Color(0xc0c0c0), // Silver
      new THREE.Color(0x9966ff), // Purple
      new THREE.Color(0xff69b4), // Pink
      new THREE.Color(0x00bfff), // Sky blue
      new THREE.Color(0xff4500), // Orange red
      new THREE.Color(0x00ff88), // Spring green
      new THREE.Color(0xff1493), // Deep pink
    ];

    const createFirework = () => {
      // Random starting position at the bottom
      const startX = (Math.random() - 0.5) * 80;
      const startY = -50;
      
      // Target position at the top (where it will explode)
      const targetY = 20 + Math.random() * 30;
      const targetX = startX + (Math.random() - 0.5) * 20;
      
      // Calculate velocity for a nice arc trajectory
      const flightTime = 1.5 + Math.random() * 0.8;
      const gravity = 25;
      
      // Physics: y = y0 + vy0*t - 0.5*g*t^2
      // At explosion: targetY = startY + vy0*flightTime - 0.5*gravity*flightTime^2
      // vy0 = (targetY - startY + 0.5*gravity*flightTime^2) / flightTime
      const vy = (targetY - startY + 0.5 * gravity * flightTime * flightTime) / flightTime;
      const vx = (targetX - startX) / flightTime;
      
      const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
      
      const firework: Firework = {
        particles: [],
        exploded: false,
        rocket: {
          position: new THREE.Vector3(startX, startY, (Math.random() - 0.5) * 20),
          velocity: new THREE.Vector3(vx, vy, 0),
          color: color.clone(),
          trail: []
        }
      };

      fireworksRef.current.push(firework);
    };

    const explodeFirework = (firework: Firework) => {
      if (!firework.rocket) return;
      
      const particleCount = 120 + Math.floor(Math.random() * 80);
      const baseColor = firework.rocket.color;
      const explosionPos = firework.rocket.position.clone();
      
      // Create main explosion sphere
      for (let i = 0; i < particleCount; i++) {
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos(2 * Math.random() - 1);
        const speed = 8 + Math.random() * 12;
        
        const vx = Math.sin(theta) * Math.cos(phi) * speed;
        const vy = Math.sin(theta) * Math.sin(phi) * speed;
        const vz = Math.cos(theta) * speed;

        const color = baseColor.clone();
        color.offsetHSL(
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );

        firework.particles.push({
          position: explosionPos.clone(),
          velocity: new THREE.Vector3(vx, vy, vz),
          color: color,
          life: 1.0,
          maxLife: 2 + Math.random() * 1.5,
          size: 0.6 + Math.random() * 0.6
        });
      }

      // Add some sparkle particles
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 15 + Math.random() * 10;
        
        firework.particles.push({
          position: explosionPos.clone(),
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed + 5,
            (Math.random() - 0.5) * speed
          ),
          color: new THREE.Color(0xffffff),
          life: 1.0,
          maxLife: 1.2 + Math.random() * 0.5,
          size: 0.4 + Math.random() * 0.3
        });
      }

      firework.rocket = null;
      firework.exploded = true;
    };

    const updateFireworks = (delta: number) => {
      const gravity = 25;

      fireworksRef.current.forEach((firework) => {
        // Update rocket
        if (firework.rocket) {
          // Apply gravity
          firework.rocket.velocity.y -= gravity * delta;
          
          // Update position
          firework.rocket.position.add(
            firework.rocket.velocity.clone().multiplyScalar(delta)
          );

          // Add trail particles
          if (Math.random() > 0.3) {
            firework.rocket.trail.push({
              position: firework.rocket.position.clone(),
              life: 1.0,
              color: firework.rocket.color.clone()
            });
          }

          // Update trail
          firework.rocket.trail.forEach(t => {
            t.life -= delta * 3;
          });
          firework.rocket.trail = firework.rocket.trail.filter(t => t.life > 0);

          // Explode when rocket starts falling (velocity.y becomes negative or very slow)
          if (firework.rocket.velocity.y < 5) {
            explodeFirework(firework);
          }
        }

        // Update explosion particles
        firework.particles.forEach((particle) => {
          particle.velocity.y -= gravity * delta * 0.3;
          particle.velocity.multiplyScalar(0.98);
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
      const maxParticles = 15000;

      fireworksRef.current.forEach(firework => {
        // Draw rocket
        if (firework.rocket && particleIndex < maxParticles) {
          // Draw rocket head (bright)
          positions.setXYZ(
            particleIndex,
            firework.rocket.position.x,
            firework.rocket.position.y,
            firework.rocket.position.z
          );
          colors.setXYZ(particleIndex, 1, 1, 1);
          sizes.setX(particleIndex, 2.0);
          particleIndex++;

          // Draw rocket trail
          firework.rocket.trail.forEach(trail => {
            if (particleIndex >= maxParticles) return;
            
            const alpha = trail.life * 0.7;
            positions.setXYZ(
              particleIndex,
              trail.position.x,
              trail.position.y,
              trail.position.z
            );
            colors.setXYZ(
              particleIndex,
              trail.color.r * alpha,
              trail.color.g * alpha,
              trail.color.b * alpha
            );
            sizes.setX(particleIndex, 0.8 * trail.life);
            particleIndex++;
          });
        }

        // Draw explosion particles
        firework.particles.forEach(particle => {
          if (particleIndex >= maxParticles) return;
          
          const alpha = Math.pow(particle.life, 0.7);
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
      for (let i = particleIndex; i < maxParticles; i++) {
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
      if (fireworkTimer > 0.6 + Math.random() * 1.0) {
        createFirework();
        // Sometimes launch multiple at once
        if (Math.random() > 0.6) {
          setTimeout(() => createFirework(), 150 + Math.random() * 300);
        }
        if (Math.random() > 0.8) {
          setTimeout(() => createFirework(), 300 + Math.random() * 400);
        }
        fireworkTimer = 0;
      }

      updateFireworks(delta);
      updateParticleGeometry();

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Launch initial fireworks
    setTimeout(() => createFirework(), 200);
    setTimeout(() => createFirework(), 600);
    setTimeout(() => createFirework(), 1000);

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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
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
