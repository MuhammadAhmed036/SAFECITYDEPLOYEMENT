"use client";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 fixed-top">
      <Link href="/" className="navbar-brand me-4">
        <Image src="/safecity.jpeg" width={65} height={65} alt="Logo" />
      </Link>
      <ul className="navbar-nav d-flex flex-row gap-4">
        <li className="nav-item">
          <Link href="/" className="nav-link fs-5 fw-bold">
            <i className="bi bi-house-door me-2"></i> Home
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/zone" className="nav-link fs-5 fw-bold">
            <i className="bi bi-geo-alt me-2"></i> Zone
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/streams" className="nav-link fs-5 fw-bold">
            <i className="bi bi-camera-video me-2"></i> Streams
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/live_view" className="nav-link fs-5 fw-bold">
            <i className="bi bi-eye me-2"></i> Live View
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/dahua-fd" className="nav-link fs-5 fw-bold">
            <i className="bi bi-building me-2"></i> Dahua FD
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/dashboard" className="nav-link fs-5 fw-bold">
            <i className="bi bi-speedometer2 me-2"></i> Dashboard
          </Link>
        </li>
      </ul>
    </nav>
  );
}
