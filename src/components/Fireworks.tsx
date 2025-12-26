import { useEffect, useRef, useCallback } from 'react';
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
  const initRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Prevent double initialization in Strict Mode
    if (initRef.current || !containerRef.current) return;
    initRef.current = true;

    const container = containerRef.current;
    
    // Setup scene
    const scene = new THREE.Scene();

    // Calculate aspect ratio
    const aspect = window.innerWidth / window.innerHeight;
    
    // Setup orthographic camera for 2D-like view
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

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Particle system setup
    const maxParticles = 15000;
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Firework state
    const fireworks: Firework[] = [];

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
      
      const startX = (Math.random() - 0.5) * screenWidth * 0.8;
      const startY = -frustumSize / 2 - 5;
      
      const targetY = frustumSize / 2 * (0.3 + Math.random() * 0.5);
      const targetX = startX + (Math.random() - 0.5) * 30;
      
      const flightTime = 1.2 + Math.random() * 0.6;
      const gravity = 40;
      
      const vy = (targetY - startY + 0.5 * gravity * flightTime * flightTime) / flightTime;
      const vx = (targetX - startX) / flightTime;
      
      const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
      
      fireworks.push({
        particles: [],
        exploded: false,
        rocket: {
          position: new THREE.Vector3(startX, startY, 0),
          velocity: new THREE.Vector3(vx, vy, 0),
          color: color.clone(),
          trail: []
        }
      });
    };

    const explodeFirework = (firework: Firework) => {
      if (!firework.rocket) return;
      
      const particleCount = 100 + Math.floor(Math.random() * 60);
      const baseColor = firework.rocket.color;
      const explosionPos = firework.rocket.position.clone();
      
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
          size: 3 + Math.random() * 2
        });
      }

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
          size: 4 + Math.random() * 2
        });
      }

      firework.rocket = null;
      firework.exploded = true;
    };

    const updateFireworks = (delta: number) => {
      const gravity = 40;

      for (let i = fireworks.length - 1; i >= 0; i--) {
        const firework = fireworks[i];
        
        if (firework.rocket) {
          firework.rocket.velocity.y -= gravity * delta;
          firework.rocket.position.add(
            firework.rocket.velocity.clone().multiplyScalar(delta)
          );

          if (Math.random() > 0.2) {
            firework.rocket.trail.push({
              position: firework.rocket.position.clone(),
              life: 1.0,
              color: firework.rocket.color.clone()
            });
          }

          for (let j = firework.rocket.trail.length - 1; j >= 0; j--) {
            firework.rocket.trail[j].life -= delta * 4;
            if (firework.rocket.trail[j].life <= 0) {
              firework.rocket.trail.splice(j, 1);
            }
          }

          if (firework.rocket.velocity.y < 8) {
            explodeFirework(firework);
          }
        }

        for (let j = firework.particles.length - 1; j >= 0; j--) {
          const particle = firework.particles[j];
          particle.velocity.y -= gravity * delta * 0.25;
          particle.velocity.multiplyScalar(0.97);
          particle.position.add(
            particle.velocity.clone().multiplyScalar(delta)
          );
          particle.life -= delta / particle.maxLife;
          
          if (particle.life <= 0) {
            firework.particles.splice(j, 1);
          }
        }

        if (!firework.rocket && firework.particles.length === 0) {
          fireworks.splice(i, 1);
        }
      }
    };

    const updateParticleGeometry = () => {
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
      const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;

      let idx = 0;

      for (const firework of fireworks) {
        if (firework.rocket && idx < maxParticles) {
          posAttr.setXYZ(idx, firework.rocket.position.x, firework.rocket.position.y, firework.rocket.position.z);
          colAttr.setXYZ(idx, 1, 1, 1);
          sizeAttr.setX(idx, 6);
          idx++;

          for (const trail of firework.rocket.trail) {
            if (idx >= maxParticles) break;
            const alpha = trail.life;
            posAttr.setXYZ(idx, trail.position.x, trail.position.y, trail.position.z);
            colAttr.setXYZ(idx, trail.color.r * alpha, trail.color.g * alpha * 0.7, trail.color.b * alpha * 0.3);
            sizeAttr.setX(idx, 3 * trail.life);
            idx++;
          }
        }

        for (const particle of firework.particles) {
          if (idx >= maxParticles) break;
          const alpha = Math.pow(particle.life, 0.5);
          posAttr.setXYZ(idx, particle.position.x, particle.position.y, particle.position.z);
          colAttr.setXYZ(idx, particle.color.r * alpha, particle.color.g * alpha, particle.color.b * alpha);
          sizeAttr.setX(idx, particle.size * alpha);
          idx++;
        }
      }

      for (let i = idx; i < maxParticles; i++) {
        posAttr.setXYZ(i, 0, -1000, 0);
        sizeAttr.setX(i, 0);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    };

    // Animation
    let lastTime = performance.now();
    let fireworkTimer = 0;
    let animationId: number;
    let isRunning = true;

    const animate = () => {
      if (!isRunning) return;
      
      const currentTime = performance.now();
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      fireworkTimer += delta;
      if (fireworkTimer > 0.5 + Math.random() * 0.8) {
        createFirework();
        if (Math.random() > 0.5) {
          setTimeout(() => { if (isRunning) createFirework(); }, 100 + Math.random() * 200);
        }
        fireworkTimer = 0;
      }

      updateFireworks(delta);
      updateParticleGeometry();
      renderer.render(scene, camera);

      animationId = requestAnimationFrame(animate);
    };

    // Start
    createFirework();
    setTimeout(() => { if (isRunning) createFirework(); }, 300);
    setTimeout(() => { if (isRunning) createFirework(); }, 600);
    animate();

    // Resize handler
    const handleResize = () => {
      const newAspect = window.innerWidth / window.innerHeight;
      camera.left = (frustumSize * newAspect) / -2;
      camera.right = (frustumSize * newAspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Store cleanup function
    cleanupRef.current = () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
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
