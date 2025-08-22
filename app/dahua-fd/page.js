'use client';

import { useRouter } from 'next/navigation';
import EventsLeafletMap from '../components/EventsLeafletMap';

export default function DahuaFd() {
  const router = useRouter();

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Map View</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-secondary" onClick={() => router.push('/')}>Home</button>
        </div>
      </div>
      <EventsLeafletMap events={[]} />
    </div>
  );
}

