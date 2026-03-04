import { DestroyRef } from '@angular/core';

type SetupSectionVideoOptions = {
  host: HTMLElement;
  video: HTMLVideoElement;
  destroyRef: DestroyRef;
  root?: Element | null;
  threshold?: number;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  );
}

function muteVideo(video: HTMLVideoElement): void {
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.playsInline = true;
  video.controls = false;
  video.setAttribute('muted', '');
}

export function setupSectionVideo(options: SetupSectionVideoOptions): void {
  const { host, video, destroyRef, root = null, threshold = 0.15 } = options;

  muteVideo(video);

  const onVolumeChange = () => {
    if (video.volume !== 0) video.volume = 0;
    if (!video.muted) video.muted = true;
  };

  video.addEventListener('volumechange', onVolumeChange);
  destroyRef.onDestroy(() => video.removeEventListener('volumechange', onVolumeChange));

  if (prefersReducedMotion()) {
    try {
      video.pause();
    } catch {
      // ignore
    }
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;

      if (entry.isIntersecting) {
        muteVideo(video);
        const p = video.play();
        if (p && typeof (p as Promise<void>).catch === 'function') {
          (p as Promise<void>).catch(() => {});
        }
      } else {
        try {
          video.pause();
        } catch {
          // ignore
        }
      }
    },
    {
      root,
      threshold
    }
  );

  observer.observe(host);
  destroyRef.onDestroy(() => observer.disconnect());
}
