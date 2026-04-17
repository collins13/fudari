'use client';
import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.replace('/login');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'ADMIN') {
        router.replace('/dashboard');
        return;
      }
      setAuthorized(true);
    } catch {
      router.replace('/login');
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
