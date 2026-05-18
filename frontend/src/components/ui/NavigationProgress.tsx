'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef(pathname);
  const prevSearchRef = useRef(searchParams.toString());

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    cleanup();
    setProgress(0);
    setVisible(true);

    let currentProgress = 0;
    intervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 12 + 3;
      if (currentProgress >= 90) {
        currentProgress = 90;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      setProgress(currentProgress);
    }, 150);
  }, [cleanup]);

  const completeProgress = useCallback(() => {
    cleanup();
    setProgress(100);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 400);
  }, [cleanup]);

  // Listen for clicks on links to start progress immediately
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Skip external links, hash links, and same-page links
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;

      // Skip if modifier keys are pressed (new tab, etc.)
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;

      // Don't start if already navigating to the same path
      const url = new URL(href, window.location.origin);
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      startProgress();
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [startProgress]);

  // Complete progress when route changes
  useEffect(() => {
    const currentSearch = searchParams.toString();
    if (prevPathRef.current !== pathname || prevSearchRef.current !== currentSearch) {
      completeProgress();
      prevPathRef.current = pathname;
      prevSearchRef.current = currentSearch;
    }
  }, [pathname, searchParams, completeProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  if (!visible) return null;

  return (
    <>
      {/* Progress bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          height: '3px',
          background: 'transparent',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
            transition: progress === 100 ? 'width 200ms ease-out, opacity 300ms ease' : 'width 300ms ease',
            opacity: progress === 100 ? 0 : 1,
            borderRadius: '0 2px 2px 0',
            boxShadow: '0 0 10px rgba(59,130,246,0.5), 0 0 5px rgba(139,92,246,0.3)',
          }}
        />
        {/* Glow effect at the tip */}
        {progress < 100 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: `${100 - progress}%`,
              width: '80px',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4))',
              transform: 'translateX(100%)',
            }}
          />
        )}
      </div>

      {/* Subtle overlay spinner for very slow loads */}
      {progress > 30 && progress < 100 && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 99998,
            pointerEvents: 'none',
            opacity: Math.min((progress - 30) / 60, 0.6),
            transition: 'opacity 300ms ease',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid rgba(59,130,246,0.15)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'nav-spin 0.8s linear infinite',
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes nav-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
