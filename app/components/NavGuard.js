// app/components/NavGuard.jsx
'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

 // add routes you want to hide it on
const HIDE_ON = ['/dashboard', '/streams', "/live_view"];  // add routes you want to hide it on

export default function NavGuard() {
  const pathname = usePathname();
  if (HIDE_ON.includes(pathname)) return null;
  return <Navbar />;
}
