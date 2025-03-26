'use client';

import { useEffect } from 'react';

export default function TestErrorPage() {
  useEffect(() => {
    throw new Error('This is a test error to demonstrate the error.tsx page');
  }, []);
  
  return <div>This page will trigger an error</div>;
}