'use client';

import dynamic from 'next/dynamic';
import Navbar from '@/app/components/Navbar';

const MapComponent = dynamic(() => import('@/app/components/MapComponent'), { ssr: false });

export default function HomePage() {
  return (
    <>
     
      <div >
  <MapComponent />
</div>

    </>
  );
}
