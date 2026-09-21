'use client';

import { useEffect } from 'react';

/**
 * Purely behavioural client component for legal pages.
 * Wires up IntersectionObserver-based TOC active-section highlighting.
 * The reading-progress bar is handled by CSS scroll-driven animations in
 * the page's <style> block (progressive enhancement, no JS needed).
 */
export default function LegalPageClient() {
  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>('article h2[id]')
    );
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (!hit) return;
        const id = hit.target.id;
        document
          .querySelectorAll('.legal-toc a')
          .forEach((l) => l.classList.remove('toc-active'));
        document
          .querySelector(`.legal-toc a[href="#${id}"]`)
          ?.classList.add('toc-active');
      },
      { rootMargin: '-10% 0px -80% 0px' }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  return null;
}
