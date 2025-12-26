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
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
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

    // Calculate aspect ratio
    const aspect = window.innerWidth / window.innerHeight;
    
    // Setup orthographic camera for 2D-like view that fills the screen
    const frustumSize = 100;
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    camera.position.z = 100;
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
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false
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
      const screenWidth = frustumSize * aspect;
      
      // Random starting position at the bottom of the screen
      const startX = (Math.random() - 0.5) * screenWidth * 0.8;
      const startY = -frustumSize / 2 - 5; // Start below screen
      
      // Target position in upper portion of screen
      const targetY = frustumSize / 2 * (0.3 + Math.random() * 0.5); // Upper 30-80% of screen
      const targetX = startX + (Math.random() - 0.5) * 30;
      
      // Calculate velocity for arc trajectory
      const flightTime = 1.2 + Math.random() * 0.6;
      const gravity = 40;
      
      const vy = (targetY - startY + 0.5 * gravity * flightTime * flightTime) / flightTime;
      const vx = (targetX - startX) / flightTime;
      
      const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
      
      const firework: Firework = {
        particles: [],
        exploded: false,
        rocket: {
          position: new THREE.Vector3(startX, startY, 0),
          velocity: new THREE.Vector3(vx, vy, 0),
          color: color.clone(),
          trail: []
        }
      };

      fireworksRef.current.push(firework);
    };

    const explodeFirework = (firework: Firework) => {
      if (!firework.rocket) return;
      
      const particleCount = 100 + Math.floor(Math.random() * 60);
      const baseColor = firework.rocket.color;
      const explosionPos = firework.rocket.position.clone();
      
      // Create main explosion - circular pattern
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
        const speed = 15 + Math.random() * 20;
        
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const color = baseColor.clone();
        color.offsetHSL(
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );

        firework.particles.push({
          position: explosionPos.clone(),
          velocity: new THREE.Vector3(vx, vy, 0),
          color: color,
          life: 1.0,
          maxLife: 1.5 + Math.random() * 1.0,
          size: 2.5 + Math.random() * 1.5
        });
      }

      // Add sparkle particles in center
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 5 + Math.random() * 10;
        
        firework.particles.push({
          position: explosionPos.clone(),
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            0
          ),
          color: new THREE.Color(0xffffff),
          life: 1.0,
          maxLife: 0.8 + Math.random() * 0.4,
          size: 3 + Math.random() * 2
        });
      }

      firework.rocket = null;
      firework.exploded = true;
    };

    const updateFireworks = (delta: number) => {
      const gravity = 40;

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
          if (Math.random() > 0.2) {
            firework.rocket.trail.push({
              position: firework.rocket.position.clone(),
              life: 1.0,
              color: firework.rocket.color.clone()
            });
          }

          // Update trail - fade faster
          firework.rocket.trail.forEach(t => {
            t.life -= delta * 4;
          });
          firework.rocket.trail = firework.rocket.trail.filter(t => t.life > 0);

          // Explode when rocket slows down enough
          if (firework.rocket.velocity.y < 8) {
            explodeFirework(firework);
          }
        }

        // Update explosion particles
        firework.particles.forEach((particle) => {
          particle.velocity.y -= gravity * delta * 0.25;
          particle.velocity.multiplyScalar(0.97);
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
          // Draw rocket head (bright white)
          positions.setXYZ(
            particleIndex,
            firework.rocket.position.x,
            firework.rocket.position.y,
            firework.rocket.position.z
          );
          colors.setXYZ(particleIndex, 1, 1, 1);
          sizes.setX(particleIndex, 4);
          particleIndex++;

          // Draw rocket trail
          firework.rocket.trail.forEach(trail => {
            if (particleIndex >= maxParticles) return;
            
            const alpha = trail.life;
            positions.setXYZ(
              particleIndex,
              trail.position.x,
              trail.position.y,
              trail.position.z
            );
            colors.setXYZ(
              particleIndex,
              trail.color.r * alpha,
              trail.color.g * alpha * 0.7,
              trail.color.b * alpha * 0.3
            );
            sizes.setX(particleIndex, 2.5 * trail.life);
            particleIndex++;
          });
        }

        // Draw explosion particles
        firework.particles.forEach(particle => {
          if (particleIndex >= maxParticles) return;
          
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
      if (fireworkTimer > 0.5 + Math.random() * 0.8) {
        createFirework();
        // Sometimes launch multiple at once
        if (Math.random() > 0.5) {
          setTimeout(() => createFirework(), 100 + Math.random() * 200);
        }
        if (Math.random() > 0.7) {
          setTimeout(() => createFirework(), 200 + Math.random() * 300);
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

    // Launch initial fireworks immediately
    createFirework();
    setTimeout(() => createFirework(), 300);
    setTimeout(() => createFirework(), 600);
    setTimeout(() => createFirework(), 900);

    // Handle resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      const newAspect = window.innerWidth / window.innerHeight;
      
      if (cameraRef.current instanceof THREE.OrthographicCamera) {
        cameraRef.current.left = (frustumSize * newAspect) / -2;
        cameraRef.current.right = (frustumSize * newAspect) / 2;
        cameraRef.current.top = frustumSize / 2;
        cameraRef.current.bottom = frustumSize / -2;
        cameraRef.current.updateProjectionMatrix();
      }
      
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
        zIndex: 9999
      }}
      aria-hidden="true"
    />
  );
};

export default Fireworks;
