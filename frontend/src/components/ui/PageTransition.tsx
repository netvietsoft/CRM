'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'idle'>('enter');
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      // New page is mounting - trigger enter animation
      setTransitionStage('enter');
      setDisplayChildren(children);
      prevPathRef.current = pathname;

      // After animation completes, set to idle
      const timer = setTimeout(() => {
        setTransitionStage('idle');
      }, 500);

      return () => clearTimeout(timer);
    } else {
      // Same page, just update children
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  // Initial mount - trigger enter
  useEffect(() => {
    const timer = setTimeout(() => {
      setTransitionStage('idle');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        animation: transitionStage === 'enter' ? 'pageEnter 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards' : 'none',
        willChange: transitionStage === 'enter' ? 'opacity, transform' : 'auto',
      }}
    >
      {displayChildren}

      <style>{`
        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
