'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy PKCE callback route — no longer used. Redirect home. */
export default function CallbackPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return null;
}
