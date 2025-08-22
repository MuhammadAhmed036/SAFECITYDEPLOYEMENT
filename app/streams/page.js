"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';
import Image from "next/image";
import Link from "next/link";
import styles from "../dashboard/dashboard.module.css";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Import StreamMap with dynamic loading to prevent SSR issues with Leaflet
const StreamMap = dynamic(
  () => import("../components/StreamMap"),
  { ssr: false }
);

export default function StreamsPage() {
  const fileInputRef = useRef(null);
  const router = useRouter();
  const mapContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Use same-origin proxy to avoid CORS
  const API = "/api/proxy/luna-streams/1/streams?page_size=100";
  
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTime, setRefreshTime] = useState(new Date());
  
  const [cityData, setCityData] = useState({ labels: [], data: [] });
  const [statusData, setStatusData] = useState({ labels: [], data: [], backgroundColor: [] });
  const [locationInfo, setLocationInfo] = useState({ available: 0, unavailable: 0 });
  const [activeStreams, setActiveStreams] = useState(0);
  
  useEffect(() => {
    fetchStreams();
    
    // Add resize observer for map container
    if (mapContainerRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        // Trigger map resize event
        window.dispatchEvent(new Event('resize'));
      });
      
      resizeObserver.observe(mapContainerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);
  
  async function fetchStreams() {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(API, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(15000),
      });
      
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const list = data.streams || [];
      
      setStreams(list);
      processChartData(list);
      setRefreshTime(new Date());
    } catch (e) {
      console.error("Streams fetch failed:", e);
      setError("Failed to fetch streams data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }
  
  const processChartData = (list) => {
    const cities = {};
    const statuses = {};
    let available = 0, unavailable = 0;
    let active = 0;
    
    list.forEach((s) => {
      const city = s.location?.city || "Unknown";
      cities[city] = (cities[city] || 0) + 1;
      
      const st = (s.status || "unknown").toLowerCase();
      statuses[st] = (statuses[st] || 0) + 1;
      if (st === 'active') active++;
      
      const hasCoords = !!s.location?.geo_position?.latitude && !!s.location?.geo_position?.longitude;
      if (hasCoords) available++; else unavailable++;
    });
    
    setCityData({ labels: Object.keys(cities), data: Object.values(cities) });
    setActiveStreams(active);
    
    const statusColors = {
      active: "rgba(16, 185, 129, 0.85)",
      pause: "rgba(245, 158, 11, 0.85)",
      failed: "rgba(239, 68, 68, 0.85)",
      inactive: "rgba(99, 102, 241, 0.85)",
      error: "rgba(244, 63, 94, 0.85)",
      unknown: "rgba(107, 114, 128, 0.85)",
    };
    
    const labels = Object.keys(statuses);
    setStatusData({
      labels,
      data: labels.map((k) => statuses[k]),
      backgroundColor: labels.map((k) => statusColors[k] || statusColors.unknown),
    });
    
    setLocationInfo({ available, unavailable });
  };
  
  const handleRefresh = async () => {
    await fetchStreams();
  };
  
  const handleImportClick = () => {
    fileInputRef.current.click();
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      alert(`Imported file: ${file.name}`);
      // Add your CSV handling logic here
    }
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Chart options
  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    animations: { colors: false, x: false, y: false, radius: false },
    hover: { animationDuration: 0 },
    responsiveAnimationDuration: 0,
    interaction: { mode: "nearest", intersect: false },
  };
  
  const doughnutOptions = {
    ...baseChartOptions,
    cutout: "60%",
    plugins: {
      legend: { position: "right" },
      title: { display: true, text: "", font: { size: 16 } },
    },
  };
  
  const barOptions = {
    ...baseChartOptions,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Cameras by City", font: { size: 16 } },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 }
      }
    }
  };
  
  // Build a pretty palette for city chart
  const cityColors = cityData.labels.map((_, i) => `hsl(${(i * 37) % 360} 70% 55% / 0.85)`);
  
  if (loading && streams.length === 0) {
    return (
      <div className={styles.dashboardWrapper}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarLogo}>
              <Image src="/camera-icon.svg" alt="Logo" width={24} height={24} />
              <span>Stream Manager</span>
            </div>
          </div>
          <div className={styles.navSection}>
            <div className={styles.navSectionTitle}>Navigation</div>
            <Link href="/" className={styles.navItem}>
              <span className={styles.navIcon}>🏠</span> Home
            </Link>
            <Link href="/dashboard" className={styles.navItem}>
              <span className={styles.navIcon}>📊</span> Dashboard
            </Link>
            <Link href="/live_view" className={styles.navItem}>
              <span className={styles.navIcon}>📡</span> Live View
            </Link>
            <Link href="/dahua-fd" className={styles.navItem}>
              <span className={styles.navIcon}>🎯</span> Dahua FD
            </Link>
            <Link href="/streams" className={`${styles.navItem} ${styles.navItemActive}`}>
              <span className={styles.navIcon}>📹</span> Streams
            </Link>
            <Link href="/zone" className={styles.navItem}>
              <span className={styles.navIcon}>🗺️</span> Zones
            </Link>
          </div>
        </div>
        <div className={styles.mainContent}>
          <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <div className="text-center">
              <div className="spinner-border text-primary" style={{ width: "3.5rem", height: "3.5rem", borderWidth: "0.35rem" }} role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <h3 className="mt-4 fw-light">Loading Streams Data...</h3>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error && streams.length === 0) {
    return (
      <div className={styles.dashboardWrapper}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarLogo}>
              <Image src="/camera-icon.svg" alt="Logo" width={24} height={24} />
              <span>Stream Manager</span>
            </div>
          </div>
          <div className={styles.navSection}>
            <div className={styles.navSectionTitle}>Navigation</div>
            <Link href="/" className={styles.navItem}>
              <span className={styles.navIcon}>🏠</span> Home
            </Link>
            <Link href="/dashboard" className={styles.navItem}>
              <span className={styles.navIcon}>📊</span> Dashboard
            </Link>
            <Link href="/live_view" className={styles.navItem}>
              <span className={styles.navIcon}>📡</span> Live View
            </Link>
            <Link href="/dahua-fd" className={styles.navItem}>
              <span className={styles.navIcon}>🎯</span> Dahua FD
            </Link>
            <Link href="/streams" className={`${styles.navItem} ${styles.navItemActive}`}>
              <span className={styles.navIcon}>📹</span> Streams
            </Link>
            <Link href="/zone" className={styles.navItem}>
              <span className={styles.navIcon}>🗺️</span> Zones
            </Link>
          </div>
        </div>
        <div className={styles.mainContent}>
          <div className="p-4">
            <div className="alert alert-danger" role="alert">
              <h4 className="alert-heading">Error Loading Streams</h4>
              <p>{error}</p>
              <button className="btn btn-primary mt-3" onClick={handleRefresh}>
                <i className="bi bi-arrow-clockwise me-2"></i> Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo}>
            <Image src="/camera-icon.svg" alt="Logo" width={24} height={24} />
            <span>Stream Manager</span>
          </div>
        </div>
        <div className={styles.navSection}>
          <div className={styles.navSectionTitle}>Navigation</div>
          <Link href="/" className={styles.navItem}>
            <span className={styles.navIcon}>🏠</span> Home
          </Link>
          <Link href="/dashboard" className={styles.navItem}>
            <span className={styles.navIcon}>📊</span> Dashboard
          </Link>
          <Link href="/live_view" className={styles.navItem}>
            <span className={styles.navIcon}>📡</span> Live View
          </Link>
          <Link href="/dahua-fd" className={styles.navItem}>
            <span className={styles.navIcon}>🎯</span> Dahua FD
          </Link>
          <Link href="/streams" className={`${styles.navItem} ${styles.navItemActive}`}>
            <span className={styles.navIcon}>📹</span> Streams
          </Link>
          <Link href="/zone" className={styles.navItem}>
            <span className={styles.navIcon}>🗺️</span> Zones
          </Link>
        </div>
      </div>
      
      <div className={styles.mainContent}>
        {/* Dashboard Header */}
        <div className={styles.dashboardHeader}>
          <div>
            <h2 className={styles.pageTitle}>Streams Dashboard</h2>
            <p className="text-muted mb-0">
              Last updated: {refreshTime.toLocaleTimeString()} | {streams.length} total streams
            </p>
          </div>
          <div className="d-flex gap-2">
            <button className={styles.refreshButton} onClick={handleRefresh}>
              <i className="bi bi-arrow-repeat"></i> Refresh
            </button>
            <button className="btn btn-success" onClick={() => router.push("/streams/create")}>
              <i className="bi bi-plus-lg me-1"></i> New Stream
            </button>
          </div>
        </div>
        
        {/* Stats Cards Row */}
        <div className={styles.statCardsRow}>
          {/* Total Streams Card */}
          <div className={styles.statCard}>
            <div className={styles.statCardIcon}>📹</div>
            <div className={styles.statCardTitle}>Total Streams</div>
            <div className={styles.statCardValue}>{streams.length}</div>
            <div className={styles.statCardSubtext}>
              <span className="text-success">
                <i className="bi bi-arrow-up"></i> {Math.round((streams.length / 100) * 100)}%
              </span>
              <span className="ms-2">from target</span>
            </div>
          </div>
          
          {/* Active Streams Card */}
          <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
            <div className={styles.statCardIcon}>▶️</div>
            <div className={styles.statCardTitle}>Active Streams</div>
            <div className={styles.statCardValue}>{activeStreams}</div>
            <div className={styles.statCardSubtext}>
              <span>
                <i className="bi bi-arrow-up"></i> {Math.round((activeStreams / streams.length) * 100)}%
              </span>
              <span className="ms-2">active rate</span>
            </div>
          </div>
          
          {/* Location Data Card */}
          <div className={`${styles.statCard} ${styles.statCardPrimary}`}>
            <div className={styles.statCardIcon}>📍</div>
            <div className={styles.statCardTitle}>Location Data</div>
            <div className={styles.statCardValue}>{locationInfo.available}</div>
            <div className={styles.statCardSubtext}>
              {Math.round(streams.length ? (locationInfo.available / streams.length) * 100 : 0)}% have location data
            </div>
          </div>
          
          {/* Cities Card */}
          <div className={`${styles.statCard} ${styles.statCardSecondary}`}>
            <div className={styles.statCardIcon}>🏙️</div>
            <div className={styles.statCardTitle}>Cities Covered</div>
            <div className={styles.statCardValue}>{cityData.labels.length}</div>
            <div className={styles.statCardSubtext}>
              Top city: {cityData.labels[0] || "None"} ({cityData.data[0] || 0} streams)
            </div>
          </div>
        </div>
        
        {/* Charts Row */}
        <div className="row g-4 mb-4">
          {/* Status Distribution Chart */}
          <div className="col-md-4">
            <div className={styles.chartCard}>
              <div className={styles.chartCardHeader}>
                <span className={styles.chartCardIcon}><i className="bi bi-pie-chart"></i></span>
                Status Distribution
              </div>
              <div className={styles.chartCardBody}>
                <div style={{ height: "250px" }}>
                  {statusData.labels.length > 0 && (
                    <Doughnut
                      data={{
                        labels: statusData.labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
                        datasets: [
                          {
                            data: statusData.data,
                            backgroundColor: statusData.backgroundColor,
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={doughnutOptions}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* City Distribution Chart */}
          <div className="col-md-8">
            <div className={styles.chartCard}>
              <div className={styles.chartCardHeader}>
                <span className={styles.chartCardIcon}><i className="bi bi-bar-chart"></i></span>
                City Distribution
              </div>
              <div className={styles.chartCardBody}>
                <div style={{ height: "250px" }}>
                  {cityData.labels.length > 0 && (
                    <Bar
                      data={{
                        labels: cityData.labels,
                        datasets: [
                          {
                            label: 'Cameras by City',
                            data: cityData.data,
                            backgroundColor: cityColors,
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={barOptions}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        
        {/* Streams Table */}
        <div className={styles.tableCard}>
          <div className={styles.chartCardHeader}>
            <span className={styles.chartCardIcon}><i className="bi bi-table"></i></span>
            All Streams
            <div className="ms-auto">
              <button className="btn btn-sm btn-outline-secondary me-2" onClick={handleImportClick}>
                <i className="bi bi-upload me-1"></i> Import
              </button>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <button className="btn btn-sm btn-outline-primary" onClick={() => router.push("/streams/create")}>
                <i className="bi bi-plus-lg me-1"></i> Create
              </button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className={styles.tableHeader}>
                <tr>
                  <th>Stream ID</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Autorestart</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {streams.map((stream) => (
                  <tr key={stream.stream_id} className={styles.tableRow}>
                    <td><code>{stream.stream_id.substring(0, 8)}...</code></td>
                    <td>{stream.name}</td>
                    <td>
                      {stream.location?.city ? (
                        <span>
                          <i className="bi bi-geo-alt text-primary me-1"></i>
                          {stream.location.city}, {stream.location.area || 'N/A'}
                        </span>
                      ) : (
                        <span className="badge bg-secondary">No Location</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${
                        stream.status === 'active' ? styles.statusActive : 
                        stream.status === 'pause' ? styles.statusInactive : 
                        styles.statusError
                      }`}>
                        {stream.status || 'unknown'}
                      </span>
                    </td>
                    <td>
                      {stream.autorestart ? (
                        <span className={`${styles.statusBadge} ${
                          stream.autorestart.status === 'enabled' ? styles.statusActive : styles.statusInactive
                        }`}>
                          {stream.autorestart.status}
                        </span>
                      ) : '-'}
                    </td>
                    <td>{new Date(stream.created_at).toLocaleDateString()}</td>
                    <td>
                      <button 
                        className={styles.viewButton}
                        onClick={() => router.push(`/streams/${stream.stream_id}`)}
                      >
                        <i className="bi bi-eye me-1"></i> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
