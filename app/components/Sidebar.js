'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from '../dashboard/dashboard.module.css';
import SettingsPanel from './SettingsPanel';

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [endpointsLoaded, setEndpointsLoaded] = useState(false);

  // Helper function to determine if a nav item is active
  const isActive = (path) => pathname === path;

  return (
    <>
      {/* Sidebar */}
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        {sidebarOpen && (
          <div
            className="d-md-none"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo}>
            <Image src="/safecity.jpeg" width={45} height={45} alt="Logo" />
            <span>SafeCity Admin</span>
          </div>
        </div>
        <div className="p-3">
          <div className="mb-4">
            <div className={styles.navSection}>
              <h6 className={styles.navSectionTitle}>Main</h6>
              <ul className="nav flex-column">
                <li className="nav-item mb-2">
                  <Link href="/" className={styles.navItem}>
                    <i className={`bi bi-house-door ${styles.navIcon}`}></i> Home
                  </Link>
                </li>
                <li className="nav-item mb-2">
                  <Link href="/dashboard" className={`${styles.navItem} ${isActive('/dashboard') ? styles.navItemActive : ''}`}>
                    <i className={`bi bi-speedometer2 ${styles.navIcon}`}></i> Dashboard
                  </Link>
                </li>
                <li className="nav-item mb-2">
                  <Link href="/streams" className={`${styles.navItem} ${isActive('/streams') ? styles.navItemActive : ''}`}>
                    <i className={`bi bi-camera-video ${styles.navIcon}`}></i> Streams
                  </Link>
                </li>
                <li className="nav-item mb-2">
                  <Link href="/zone" className={`${styles.navItem} ${isActive('/zone') ? styles.navItemActive : ''}`}>
                    <i className={`bi bi-geo-alt ${styles.navIcon}`}></i> Zone
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mb-4">
            <div className={styles.navSection}>
              <h6 className={styles.navSectionTitle}>Management</h6>
              <ul className="nav flex-column">
                <li className="nav-item mb-2">
                  <Link href="/dahua-fd" className={`${styles.navItem} ${isActive('/dahua-fd') ? styles.navItemActive : ''}`}>
                    <i className={`bi bi-building ${styles.navIcon}`}></i> Dahua FD
                  </Link>
                </li>
                <li className="nav-item mb-2">
                  <Link href="/live_view" className={`${styles.navItem} ${isActive('/live_view') ? styles.navItemActive : ''}`}>
                    <i className={`bi bi-eye ${styles.navIcon}`}></i> Live View
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mb-4">
            <div className={styles.navSection}>
              <h6 className={styles.navSectionTitle}>System</h6>
              <ul className="nav flex-column">
                <li className="nav-item mb-2">
                  <button
                    className={`${styles.navItem} w-100 text-start border-0 bg-transparent`}
                    onClick={() => setSettingsOpen(true)}
                    title="Manage API Endpoints"
                  >
                    <i className={`bi bi-gear ${styles.navIcon}`}></i> Settings
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {settingsOpen && (
        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onEndpointsUpdate={() => {
            // Reload endpoints when they are updated
            setEndpointsLoaded(false);
          }}
        />
      )}
    </>
  );
}