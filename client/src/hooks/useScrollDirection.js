import { useState, useEffect } from 'react';
export function useScrollDirection() {
  const [dir, setDir] = useState('up');
  useEffect(() => {
    let last = window.scrollY;
    const handler = () => {
      const curr = window.scrollY;
      setDir(curr > last && curr > 60 ? 'down' : 'up');
      last = curr;
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return dir;
}
