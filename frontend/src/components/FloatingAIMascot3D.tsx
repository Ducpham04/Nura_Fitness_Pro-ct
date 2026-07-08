import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type FloatingAIMascot3DProps = {
  dark?: boolean;
  onClick?: () => void;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function makeRoundedPanel(width: number, height: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 4,
  });
}

export default function FloatingAIMascot3D({ dark = true, onClick }: FloatingAIMascot3DProps) {
  const hostRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    let raf = 0;
    let disposed = false;
    const reduced = prefersReducedMotion();

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 8.2);

    const rig = new THREE.Group();
    scene.add(rig);

    const lime = new THREE.Color('#CCFF00');
    const white = new THREE.Color('#F8F8F8');
    const graphite = new THREE.Color('#0F1115');
    const graphite2 = new THREE.Color('#1B1E25');
    const electric = new THREE.Color('#007AFF');

    const shellMat = new THREE.MeshPhysicalMaterial({
      color: graphite2,
      roughness: 0.28,
      metalness: 0.28,
      clearcoat: 0.8,
      clearcoatRoughness: 0.18,
    });
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: lime,
      emissive: lime,
      emissiveIntensity: dark ? 0.65 : 0.28,
      roughness: 0.18,
      metalness: 0.18,
      transmission: 0.15,
      thickness: 0.7,
    });
    const faceMat = new THREE.MeshStandardMaterial({
      color: graphite,
      roughness: 0.2,
      metalness: 0.42,
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: white,
      roughness: 0.42,
      metalness: 0.04,
    });
    const blueMat = new THREE.MeshStandardMaterial({
      color: electric,
      emissive: electric,
      emissiveIntensity: dark ? 0.22 : 0.08,
      roughness: 0.34,
      metalness: 0.2,
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: lime,
      transparent: true,
      opacity: dark ? 0.78 : 0.5,
    });
    const shadowMat = new THREE.MeshBasicMaterial({
      color: dark ? '#000000' : '#0F172A',
      transparent: true,
      opacity: dark ? 0.18 : 0.08,
      depthWrite: false,
    });

    const add = <T extends THREE.Object3D>(object: T, position: [number, number, number], scale?: [number, number, number]) => {
      object.position.set(...position);
      if (scale) object.scale.set(...scale);
      rig.add(object);
      return object;
    };

    const aura = add(new THREE.Mesh(new THREE.SphereGeometry(1.38, 48, 32), new THREE.MeshBasicMaterial({
      color: lime,
      transparent: true,
      opacity: dark ? 0.08 : 0.045,
      depthWrite: false,
    })), [0, 0, -0.15], [1.08, 1.08, 1.08]);

    const shadow = add(new THREE.Mesh(new THREE.CircleGeometry(1.28, 64), shadowMat), [0, -1.55, -0.35], [1.25, 0.22, 1]);
    shadow.rotation.x = -Math.PI / 2;

    add(new THREE.Mesh(new THREE.SphereGeometry(0.98, 64, 40), shellMat), [0, 0, 0], [1, 1.02, 0.86]);
    const core = add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 48, 32), coreMat), [0, 0.02, 0.42], [1, 0.88, 0.34]);

    const face = add(new THREE.Mesh(makeRoundedPanel(1.08, 0.42, 0.18), faceMat), [0, 0.16, 0.92]);
    face.rotation.x = 0.02;
    const eyeLeft = add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 12), coreMat), [-0.24, 0.19, 1.03]);
    const eyeRight = add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 12), coreMat), [0.24, 0.19, 1.03]);
    const smile = add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 32, Math.PI), coreMat), [0, 0.06, 1.04]);
    smile.rotation.z = Math.PI;

    const topCap = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 18), whiteMat), [0, 1.05, 0.02], [1.4, 0.32, 0.8]);
    const antenna = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 12), blueMat), [0.02, 1.24, 0.02]);
    antenna.rotation.z = -0.16;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), coreMat), [-0.02, 1.42, 0.04]);

    const orbitA = add(new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.012, 8, 128), ringMat), [0, 0, 0]);
    orbitA.rotation.x = Math.PI / 2.62;
    orbitA.rotation.y = -0.34;
    const orbitB = add(new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.009, 8, 128), new THREE.MeshBasicMaterial({
      color: electric,
      transparent: true,
      opacity: dark ? 0.34 : 0.2,
    })), [0, 0, 0]);
    orbitB.rotation.x = Math.PI / 2.1;
    orbitB.rotation.y = 0.7;

    const satelliteA = add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 14), coreMat), [1.2, 0.2, 0.1]);
    const satelliteB = add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), blueMat), [-1.08, -0.36, 0.2]);

    const sideLeft = add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 18), whiteMat), [-0.92, 0.04, 0.06], [0.55, 0.9, 0.65]);
    const sideRight = add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 18), whiteMat), [0.92, 0.04, 0.06], [0.55, 0.9, 0.65]);

    const key = new THREE.DirectionalLight(0xffffff, dark ? 2.4 : 1.9);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xccff00, dark ? 1.1 : 0.45);
    rim.position.set(-3, 2, 3);
    scene.add(rim);
    const fill = new THREE.AmbientLight(0xffffff, dark ? 0.68 : 1.05);
    scene.add(fill);

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const size = Math.max(92, Math.round(rect.width));
      renderer.setSize(size, size, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };

    const moveHost = (t: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 768;
      const size = isMobile ? 88 : 118;
      host.style.width = `${size}px`;
      host.style.height = `${size}px`;

      if (reduced) {
        host.style.transform = `translate3d(${vw - size - 16}px, ${Math.min(vh - size - 96, 520)}px, 0)`;
        return;
      }

      const safeTop = isMobile ? 104 : 124;
      const safeBottom = isMobile ? 126 : 52;
      const safeLeft = isMobile ? 14 : 34;
      const safeRight = isMobile ? 16 : 40;
      const maxX = Math.max(safeLeft, vw - size - safeRight);
      const maxY = Math.max(safeTop, vh - size - safeBottom);
      const x = isMobile
        ? maxX - Math.sin(t * 0.00062) * 10
        : safeLeft + (maxX - safeLeft) * (0.74 + 0.16 * Math.sin(t * 0.00016));
      const yBase = isMobile ? 0.58 : 0.24;
      const y = safeTop + (maxY - safeTop) * (yBase + 0.26 * ((Math.sin(t * 0.00018 + 0.8) + 1) / 2));
      host.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const animate = (t: number) => {
      if (disposed) return;
      moveHost(t);
      const speed = reduced ? 0 : t;
      rig.position.y = reduced ? 0 : Math.sin(speed * 0.002) * 0.1;
      rig.rotation.y = Math.sin(speed * 0.001) * 0.28;
      rig.rotation.x = -0.04 + Math.sin(speed * 0.0014) * 0.05;
      orbitA.rotation.z = speed * 0.0011;
      orbitB.rotation.z = -speed * 0.00085;
      satelliteA.position.x = Math.cos(speed * 0.0012) * 1.22;
      satelliteA.position.y = Math.sin(speed * 0.0012) * 0.34;
      satelliteB.position.x = Math.cos(speed * 0.0012 + Math.PI) * 1.06;
      satelliteB.position.y = Math.sin(speed * 0.0012 + Math.PI) * 0.28;
      aura.scale.setScalar(1.08 + Math.sin(speed * 0.0025) * 0.025);
      core.scale.set(1 + Math.sin(speed * 0.0027) * 0.035, 0.88 + Math.sin(speed * 0.0027) * 0.03, 0.34);
      eyeLeft.scale.setScalar(1 + Math.sin(speed * 0.006) * 0.09);
      eyeRight.scale.copy(eyeLeft.scale);
      topCap.rotation.z = Math.sin(speed * 0.002) * 0.08;
      sideLeft.rotation.z = Math.sin(speed * 0.002 + 1) * 0.12;
      sideRight.rotation.z = -Math.sin(speed * 0.002 + 1) * 0.12;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      scene.traverse((object) => {
        if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) object.geometry.dispose();
        if ('material' in object) {
          const material = object.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else if (material instanceof THREE.Material) material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [dark]);

  return (
    <button
      ref={hostRef}
      type="button"
      aria-label="Mở AI Coach"
      title="AI Coach"
      onClick={onClick}
      className="fixed left-0 top-0 z-40 rounded-[28px] outline-none transition-opacity duration-200 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-lime"
      style={{
        pointerEvents: onClick ? 'auto' : 'none',
        filter: dark
          ? 'drop-shadow(0 18px 28px rgba(0,0,0,0.52)) drop-shadow(0 0 18px rgba(204,255,0,0.16))'
          : 'drop-shadow(0 16px 24px rgba(15,23,42,0.16))',
        willChange: 'transform',
      }}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        aria-hidden="true"
        data-testid="floating-ai-mascot-3d"
      />
    </button>
  );
}
