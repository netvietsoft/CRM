'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'idle'>(
    pathname.startsWith('/admin/customer-care') ? 'idle' : 'enter',
  );
  const prevPathRef = useRef(pathname);
  const disableTransition = pathname.startsWith('/admin/customer-care');

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setTransitionStage(disableTransition ? 'idle' : 'enter');
      setDisplayChildren(children);
      prevPathRef.current = pathname;

      if (disableTransition) {
        return;
      }

      const timer = setTimeout(() => {
        setTransitionStage('idle');
      }, 500);

      return () => clearTimeout(timer);
    } else {
      // Same page, just update children
      setDisplayChildren(children);
    }
  }, [pathname, children, disableTransition]);

  useEffect(() => {
    if (disableTransition) return;
    const timer = setTimeout(() => {
      setTransitionStage('idle');
    }, 500);
    return () => clearTimeout(timer);
  }, [disableTransition]);

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
