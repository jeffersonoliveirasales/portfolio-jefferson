import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  ViewChild,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { gsap } from 'gsap';
import { Flip, ScrollTrigger } from 'gsap/all';

import * as THREE from 'three';
import type {
  Euler,
  Material,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

gsap.registerPlugin(ScrollTrigger, Flip);

type Pose = {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
};

@Component({
  selector: 'app-scroll-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scroll-3d.component.html',
  styleUrls: ['./scroll-3d.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Scroll3DComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasWrap', { static: true }) private canvasWrapRef!: ElementRef<HTMLElement>;

  private readonly triggers: ScrollTrigger[] = [];

  private renderer?: WebGLRenderer;
  private scene?: Scene;
  private camera?: PerspectiveCamera;

  private modelRoot?: Object3D;

  private readonly rotBase = { x: 0, y: 0, z: 0 };
  private readonly rotOffset = { x: 0, y: 0 };

  private raf = 0;
  private ro?: ResizeObserver;
  private resizeFn?: () => void;

  private refreshRaf = 0;

  private mq?: MediaQueryList;
  private mqHandler?: () => void;

  private prefersReducedMotion = false;

  private t0 = performance.now();
  private drift = { x: 0, y: 0 };

  private slotTargets: Array<{ section: HTMLElement; slot: HTMLElement; index: number }> = [];

  private readonly modelScale = 0.24;
  private readonly modelPosOffset = new THREE.Vector3(0.25, -0.2, 0);
  private readonly modelRotYOffset = Math.PI + 0.15;

  private poseFor(index: number): Pose {
    const variant = index % 3;

    const applyGlobal = (pose: Pose): Pose => ({
      position: pose.position.clone().add(this.modelPosOffset),
      rotation: new THREE.Euler(pose.rotation.x, pose.rotation.y + this.modelRotYOffset, pose.rotation.z),
      scale: pose.scale.clone().multiplyScalar(this.modelScale)
    });

    if (variant === 0) {
      return applyGlobal({
        position: new THREE.Vector3(0, -0.15, 0),
        rotation: new THREE.Euler(0, 0.25, 0),
        scale: new THREE.Vector3(1, 1, 1)
      });
    }

    if (variant === 1) {
      return applyGlobal({
        position: new THREE.Vector3(0.12, -0.1, 0),
        rotation: new THREE.Euler(0.3, -0.35, 0),
        scale: new THREE.Vector3(1.08, 1.08, 1.08)
      });
    }

    return applyGlobal({
      position: new THREE.Vector3(-0.1, -0.2, 0),
      rotation: new THREE.Euler(-0.15, 0.55, 0.12),
      scale: new THREE.Vector3(0.98, 0.98, 0.98)
    });
  }

  private discoverSlots(): Array<{ section: HTMLElement; slot: HTMLElement; index: number }> {
    const container = document.querySelector<HTMLElement>('[data-scroll-container]');
    if (!container) return [];

    const slots = Array.from(container.querySelectorAll<HTMLElement>('[data-3d-slot]'));
    const mapped = slots
      .map((slot, index) => {
        const section = slot.closest<HTMLElement>('[data-section]');
        if (!section) return null;
        return { section, slot, index };
      })
      .filter((x): x is { section: HTMLElement; slot: HTMLElement; index: number } => x !== null);

    mapped.sort((a, b) => a.section.getBoundingClientRect().top - b.section.getBoundingClientRect().top);

    return mapped.map((t, i) => ({ ...t, index: i }));
  }

  ngAfterViewInit(): void {
    this.prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

    this.zone.runOutsideAngular(() => {
      this.initThree();
      this.setupResize();
      this.setupScroll();
      this.startRAF();
    });

    this.destroyRef.onDestroy(() => {
      this.zone.runOutsideAngular(() => this.cleanup());
    });
  }

  private refreshST(): void {
    if (this.refreshRaf) return;
    this.refreshRaf = requestAnimationFrame(() => {
      this.refreshRaf = 0;
      ScrollTrigger.refresh();
    });
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance'
    });

    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x00060a, 2.2, 8.5);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.15, 2.4);

    const key = new THREE.DirectionalLight(0x9ad8ff, 1.15);
    key.position.set(2.6, 2.2, 3.2);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x00b2ff, 1.55);
    rim.position.set(-3.4, 1.6, -2.6);
    scene.add(rim);

    const fill = new THREE.AmbientLight(0xffffff, 0.18);
    scene.add(fill);

    const accent = new THREE.PointLight(0x6c7cff, 1.2, 7);
    accent.position.set(0.8, 0.4, 1.2);
    scene.add(accent);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const loader = new GLTFLoader();
    loader.load(
      '/assets/models/letra-j.glb',
      (gltf: any) => {
        const model = gltf.scene as Object3D;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        const pose0 = this.poseFor(0);
        model.position.copy(pose0.position);
        model.rotation.copy(pose0.rotation);
        model.scale.copy(pose0.scale);

        this.rotBase.x = model.rotation.x;
        this.rotBase.y = model.rotation.y;
        this.rotBase.z = model.rotation.z;
        this.rotOffset.x = 0;
        this.rotOffset.y = 0;

        this.modelRoot = model;
        scene.add(model);

        model.traverse((obj: any) => {
          if (!obj?.isMesh) return;
          const mat = obj.material;
          if (!mat) return;

          if ('metalness' in mat) mat.metalness = 0.55;
          if ('roughness' in mat) mat.roughness = 0.28;
          if ('envMapIntensity' in mat) mat.envMapIntensity = 0.9;
          if ('color' in mat) mat.color.setHex(0xd7f3ff);
        });

        this.refreshST();
      },
      undefined,
      (err: any) => {
        console.warn('[Scroll3D] Failed to load /assets/models/letra-j.glb', err);
      }
    );
  }

  private setupResize(): void {
    const target = this.canvasWrapRef.nativeElement;

    const resize = () => {
      const renderer = this.renderer;
      const camera = this.camera;
      if (!renderer || !camera) return;

      const rect = target.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));

      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h, false);

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    this.resizeFn = resize;

    this.ro = new ResizeObserver(() => resize());
    this.ro.observe(target);

    window.addEventListener('resize', resize, { passive: true });
    this.destroyRef.onDestroy(() => window.removeEventListener('resize', resize));

    resize();
  }

  private setupScroll(): void {
    const getScroller = () =>
      window.matchMedia('(max-width: 900px)').matches
        ? undefined
        : (document.querySelector<HTMLElement>('[data-scroll-container]') ?? undefined);

    const rebuild = () => {
      this.triggers.forEach((t) => t.kill());
      this.triggers.length = 0;
      this.slotTargets = this.discoverSlots();
      this.setupScrollInternal(getScroller());
      this.refreshST();
    };

    this.mq = window.matchMedia('(max-width: 900px)');
    this.mqHandler = () => rebuild();
    this.mq.addEventListener?.('change', this.mqHandler);
    this.destroyRef.onDestroy(() => this.mq?.removeEventListener?.('change', this.mqHandler!));

    rebuild();
  }

  private setupScrollInternal(scroller: HTMLElement | undefined): void {
    const sections = this.slotTargets;
    if (sections.length === 0) return;

    const escapeSelector = (value: string): string => {
      const cssEscape = (globalThis as any)?.CSS?.escape as ((v: string) => string) | undefined;
      if (typeof cssEscape === 'function') return cssEscape(value);
      return value.replace(/"/g, '\\"');
    };

    const wrap = this.canvasWrapRef.nativeElement;
    const heroSlot =
      sections.find((s) => s.slot.getAttribute('data-3d-slot') === 'hero')?.slot ?? sections[0].slot;

    if (wrap.parentElement !== heroSlot) {
      heroSlot.appendChild(wrap);
      this.resizeFn?.();
      this.refreshST();
    }

    const moveCanvasTo = (slot: HTMLElement) => {
      const wrap = this.canvasWrapRef.nativeElement;

      if (this.prefersReducedMotion) {
        slot.appendChild(wrap);
        gsap.set(wrap, { clearProps: 'transform' });
        this.resizeFn?.();
        this.refreshST();
        return;
      }

      const state = Flip.getState(wrap);
      slot.appendChild(wrap);
      Flip.from(state, {
        duration: 0.85,
        ease: 'power2.out',
        absolute: true,
        nested: true,
        onComplete: () => {
          gsap.set(wrap, { clearProps: 'transform' });
          this.resizeFn?.();
          this.refreshST();
        }
      });
    };

    const applyPose = (pose: Pose) => {
      if (!this.modelRoot) return;

      gsap.to(this.modelRoot.position, {
        x: pose.position.x,
        y: pose.position.y,
        z: pose.position.z,
        duration: 0.8,
        ease: 'power2.out'
      });

      gsap.to(this.rotBase, {
        x: pose.rotation.x,
        y: pose.rotation.y,
        z: pose.rotation.z,
        duration: 0.8,
        ease: 'power2.out'
      });

      gsap.to(this.modelRoot.scale, {
        x: pose.scale.x,
        y: pose.scale.y,
        z: pose.scale.z,
        duration: 0.8,
        ease: 'power2.out'
      });
    };

    sections.forEach(({ section, slot, index }) => {
      const pose = this.poseFor(index);
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top center',
        end: 'bottom center',
        scroller,
        onEnter: () => {
          moveCanvasTo(slot);
          applyPose(pose);
        },
        onEnterBack: () => {
          moveCanvasTo(slot);
          applyPose(pose);
        }
      });

      this.triggers.push(trigger);

      const slotName = slot.getAttribute('data-3d-slot') ?? '';
      const wps = Array.from(
        section.querySelectorAll<HTMLElement>(`[data-3d-waypoint="${escapeSelector(slotName)}"]`)
      );

      const readWp = (el: HTMLElement) => ({
        x: Number(el.dataset['x'] ?? 70),
        y: Number(el.dataset['y'] ?? 35),
        s: Number(el.dataset['s'] ?? 1),
        z: Number(el.dataset['z'] ?? 4)
      });

      if (!this.prefersReducedMotion && wps.length >= 2) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            scroller
          }
        });

        const first = readWp(wps[0]!);
        gsap.set(slot, {
          left: `${first.x}%`,
          top: `${first.y}%`,
          scale: first.s,
          zIndex: first.z
        });

        wps.forEach((wpEl, i) => {
          const wp = readWp(wpEl);
          tl.set(
            slot,
            {
              zIndex: wp.z
            },
            i
          );
          tl.to(
            slot,
            {
              left: `${wp.x}%`,
              top: `${wp.y}%`,
              scale: wp.s,
              ease: 'none',
              duration: 1
            },
            i
          );
        });

        tl.to(this.rotOffset, { x: -0.18, y: 0.35, ease: 'none', duration: 1 }, 0);
        tl.to(this.rotOffset, { x: 0.22, y: -0.25, ease: 'none', duration: 1 }, 1);
        tl.to(this.rotOffset, { x: -0.1, y: 0.15, ease: 'none', duration: 1 }, 2);

        const st = tl.scrollTrigger;
        if (st) this.triggers.push(st);
        return;
      }

      if (!this.prefersReducedMotion) {
        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          scroller,
          onUpdate: (self) => {
            if (!this.modelRoot) return;
            const p = self.progress;

            this.rotOffset.y = (p - 0.5) * 0.6;
            this.rotOffset.x = (p - 0.5) * 0.25;
          }
        });

        this.triggers.push(st);
      }
    });

    this.refreshST();
  }

  private startRAF(): void {
    const tick = () => {
      this.raf = requestAnimationFrame(tick);

      const renderer = this.renderer;
      const scene = this.scene;
      const camera = this.camera;
      if (!renderer || !scene || !camera) return;

      if (this.modelRoot) {
        const t = (performance.now() - this.t0) * 0.001;

        if (!this.prefersReducedMotion) {
          this.drift.x = Math.sin(t * 0.6) * 0.06;
          this.drift.y = Math.cos(t * 0.45) * 0.04;
        } else {
          this.drift.x = 0;
          this.drift.y = 0;
        }

        this.modelRoot.rotation.x = this.rotBase.x + this.rotOffset.x + this.drift.y;
        this.modelRoot.rotation.y = this.rotBase.y + this.rotOffset.y + this.drift.x;
        this.modelRoot.rotation.z = this.rotBase.z + Math.sin(t * 0.35) * 0.03;
      }

      renderer.render(scene, camera);
    };

    this.raf = requestAnimationFrame(tick);
  }

  private cleanup(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;

    if (this.refreshRaf) cancelAnimationFrame(this.refreshRaf);
    this.refreshRaf = 0;

    this.ro?.disconnect();
    this.ro = undefined;
    this.resizeFn = undefined;

    this.triggers.forEach((t) => t.kill());

    if (this.mq && this.mqHandler) {
      this.mq.removeEventListener?.('change', this.mqHandler);
    }
    this.mq = undefined;
    this.mqHandler = undefined;

    const renderer = this.renderer;
    const scene = this.scene;

    if (scene) {
      scene.traverse((obj: any) => {
        const mesh = obj as Mesh;
        if (!mesh.isMesh) return;

        if (mesh.geometry) mesh.geometry.dispose();

        const mat = mesh.material as Material | Material[] | undefined;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat?.dispose();
        }
      });
    }

    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
    }

    this.modelRoot = undefined;
    this.scene = undefined;
    this.camera = undefined;
    this.renderer = undefined;
  }
}
