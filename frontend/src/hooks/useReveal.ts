import { useEffect } from 'react';

/**
 * Kích hoạt scroll-reveal: tự thêm class `in-view` cho mọi phần tử có
 * class `.reveal` hoặc `.reveal-stagger` khi chúng cuộn vào viewport.
 * Dùng IntersectionObserver — nhẹ, không cần thư viện.
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('.reveal, .reveal-stagger')
    );
    if (els.length === 0) return;

    // Nếu trình duyệt không hỗ trợ → hiện luôn
    if (typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('in-view'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target); // chỉ chạy 1 lần
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
