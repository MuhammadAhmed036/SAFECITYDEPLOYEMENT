"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import Link from "next/link";
import Image from "next/image";
import styles from "./dashboard.module.css";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function DashboardPage() {
  const router = useRouter();

  // ✅ same-origin proxy endpoint
  const API = "/api/proxy/luna-streams/1/streams?page_size=100";

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cityData, setCityData] = useState({ labels: [], data: [] });
  const [statusData, setStatusData] = useState({ labels: [], data: [], backgroundColor: [] });
  const [streamActivity, setStreamActivity] = useState({ labels: [], data: [] });
  const [refreshTime, setRefreshTime] = useState(new Date());

  // --- helpers ---------------------------------------------------------------
  const getUpdatedTs = (s) => {
    // Prefer explicit "updated" fields, else fall back to "last_event_time", else "created"
    const ts =
      s.update_time ||
      s.updated_time ||
      s.updated_at ||
      s.updatedAt ||
      s.modify_time ||
      s.modified_at ||
      s.last_event_time ||
      s.lastEventTime ||
      s.create_time ||
      s.created_at ||
      s.createdAt;

    const n = ts ? Date.parse(ts) : NaN;
    return Number.isNaN(n) ? 0 : n;
  };

  const getCreatedTs = (s) => {
    const ts = s.create_time || s.created_at || s.createdAt;
    const n = ts ? Date.parse(ts) : NaN;
    return Number.isNaN(n) ? 0 : n;
  };

  const isNew = (ts) => {
    if (!ts) return false;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    return Date.now() - ts < ONE_DAY;
  };

  // --- data fetch ------------------------------------------------------------
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(API, {
            headers: { "Cache-Control": "no-cache" },
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
          const data = await response.json();
          const streamsData = data.streams || [];
          setStreams(streamsData);
          processChartData(streamsData);
          setRefreshTime(new Date());
        } catch {
          // fallback to mock (optional)
          const mockResponse = await fetch("/api/mock/luna-streams/1/streams", {
            headers: { "Cache-Control": "no-cache" },
          });
          if (!mockResponse.ok) throw new Error(`Mock API request failed with status ${mockResponse.status}`);
          const mockData = await mockResponse.json();
          const mockStreamsData = mockData.streams || [];
          setStreams(mockStreamsData);
          processChartData(mockStreamsData);
          setRefreshTime(new Date());
        }
        setLoading(false);
      } catch (err) {
        console.error("Both real and mock API fetch attempts failed:", err);
        setError("Failed to fetch streams data. Please try again later.");
        setLoading(false);
      }
    };

    fetchStreams();
    const intervalId = setInterval(fetchStreams, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const processChartData = (streamsData) => {
    const cities = {};
    streamsData.forEach((s) => {
      const city = s.location?.city || "Unknown";
      cities[city] = (cities[city] || 0) + 1;
    });
    setCityData({ labels: Object.keys(cities), data: Object.values(cities) });

    const statuses = {};
    streamsData.forEach((s) => {
      const st = s.status || "unknown";
      statuses[st] = (statuses[st] || 0) + 1;
    });
    const statusColors = {
      active: "rgba(75, 192, 192, 0.8)",
      inactive: "rgba(255, 99, 132, 0.8)",
      error: "rgba(255, 159, 64, 0.8)",
      unknown: "rgba(201, 203, 207, 0.8)",
    };
    setStatusData({
      labels: Object.keys(statuses),
      data: Object.values(statuses),
      backgroundColor: Object.keys(statuses).map((k) => statusColors[k] || statusColors.unknown),
    });

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    setStreamActivity({ labels: days, data: days.map(() => Math.floor(Math.random() * 100)) });
  };

  const handleRefresh = () => {
    const fetchStreams = async () => {
      try {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(API, {
            headers: { "Cache-Control": "no-cache" },
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
          const data = await response.json();
          setStreams(data.streams || []);
          processChartData(data.streams || []);
          setRefreshTime(new Date());
        } catch {
          const mockResponse = await fetch("/api/mock/luna-streams/1/streams", {
            headers: { "Cache-Control": "no-cache" },
          });
          if (!mockResponse.ok) throw new Error(`Mock API request failed with status ${mockResponse.status}`);
          const mockData = await mockResponse.json();
          setStreams(mockData.streams || []);
          processChartData(mockData.streams || []);
          setRefreshTime(new Date());
        }
        setLoading(false);
      } catch (err) {
        console.error("Both real and mock API refresh attempts failed:", err);
        setError("Failed to refresh data. Please try again.");
        setLoading(false);
      }
    };
    fetchStreams();
  };

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

  // Derived values
  const total = streams.length;
  const activeCount = streams.filter((s) => s.status === "active").length;
  const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

  // 🔥 RECENT STREAMS: sort by "updated" (or "created") descending
  const recentStreams = useMemo(() => {
    return [...streams].sort((a, b) => getUpdatedTs(b) - getUpdatedTs(a)).slice(0, 5);
  }, [streams]);

  // Build a pretty palette for city donuts (unique per slice)
  const cityColors = cityData.labels.map((_, i) => `hsl(${(i * 37) % 360} 70% 55% / 0.85)`);

  if (loading && streams.length === 0) {
    return (
      <div className="d-flex" style={{ minHeight: "100vh" }}>
        <div className="bg-dark text-white" style={{ width: '250px', minHeight: '100vh' }}></div>
        <div className="flex-grow-1 d-flex justify-content-center align-items-center">
          <div className="text-center">
            <div className="spinner-border text-primary" style={{ width: "3.5rem", height: "3.5rem", borderWidth: "0.35rem" }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <h3 className="mt-4 fw-light">Loading Dashboard Data...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (error && streams.length === 0) {
    return (
      <div className="d-flex" style={{ minHeight: "100vh" }}>
        <div className="bg-dark text-white" style={{ width: '250px', minHeight: '100vh' }}></div>
        <div className="flex-grow-1 d-flex justify-content-center align-items-center p-4">
          <div className="dashboard-card" style={{ maxWidth: "600px", width: "100%" }}>
            <div className="dashboard-card-header bg-danger">
              <i className="bi bi-exclamation-triangle-fill me-2"></i> Error Loading Dashboard
            </div>
            <div className="dashboard-card-body text-center p-5">
              <div className="mb-4">
                <i className="bi bi-x-circle" style={{ fontSize: "4rem", color: "var(--danger)" }}></i>
              </div>
              <h4 className="mb-3">Unable to Load Dashboard Data</h4>
              <p className="mb-4">{error}</p>
              <button className="btn btn-primary rounded-pill px-4 py-2" onClick={handleRefresh}>
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
      {/* Sidebar */}
      <div className={styles.sidebar}>
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
                  <Link href="/dashboard" className={`${styles.navItem} ${styles.navItemActive}`}>
                    <i className={`bi bi-speedometer2 ${styles.navIcon}`}></i> Dashboard
                  </Link>
                </li>
                <li className="nav-item mb-2">
                  <Link href="/streams" className={styles.navItem}>
                    <i className={`bi bi-camera-video ${styles.navIcon}`}></i> Streams
                  </Link>
                </li>
                 <li className="nav-item mb-2">
                  <Link href="/live_view" className={`${styles.navItem} ${styles.navItemActive}`}>
                    <i className={`bi bi-eye ${styles.navIcon}`}></i> Live View
                  </Link>
                </li>
                <li className="nav-item mb-2">
                  <Link href="/zone" className={styles.navItem}>
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
                  <Link href="/dahua-fd" className={styles.navItem}>
                    <i className={`bi bi-building ${styles.navIcon}`}></i> Dahua FD
                  </Link>
                </li>

              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.dashboardHeader}>
          <h2 className={styles.pageTitle}>Stream Analytics Dashboard</h2>
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted me-2">Last updated: {refreshTime.toLocaleTimeString()}</span>
            <button className={styles.refreshButton} onClick={handleRefresh} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Refreshing...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-1 bg-primary"></i>
                  <span style={{ color: '#0b5ed7' }}>Refresh Data</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className={styles.statCardsRow}>
          <div className={`${styles.statCard} ${styles.statCardPrimary}`}>
            <div className={styles.statCardIcon}>
              <i className="bi bi-camera-video"></i>
            </div>
            <h3 className={styles.statCardTitle}>Total Streams</h3>
            <div className={styles.statCardValue}>{total}</div>
            <div className={styles.statCardSubtext}>active streams</div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardSecondary}`}>
            <div className={styles.statCardIcon}>
              <i className="bi bi-lightning-charge"></i>
            </div>
            <h3 className={styles.statCardTitle}>Active Streams</h3>
            <div className={styles.statCardValue}>{activeCount}</div>
            <div className={styles.statCardSubtext}>
              {activePct}% of total
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
            <div className={styles.statCardIcon}>
              <i className="bi bi-geo-alt"></i>
            </div>
            <h3 className={styles.statCardTitle}>Cities Covered</h3>
            <div className={styles.statCardValue}>{cityData.labels.length}</div>
            <div className={styles.statCardSubtext}>unique locations</div>
          </div>
        </div>

        {/* Charts */}
        <div className="row mb-4">
          <div className="col-md-8 mb-4 mb-md-0">
            <div className={styles.chartCard}>
              <div className={styles.chartCardHeader}>
                <i className={`bi bi-pie-chart-fill ${styles.chartCardIcon}`}></i> Streams by City
              </div>
              <div className={styles.chartCardBody}>
                <div style={{ height: 320 }}>
                  <Doughnut
                    options={{
                      ...doughnutOptions,
                      plugins: {
                        ...doughnutOptions.plugins,
                        title: { ...doughnutOptions.plugins.title, text: "Streams by City" },
                      },
                    }}
                    data={{
                      labels: cityData.labels,
                      datasets: [
                        {
                          data: cityData.data,
                          backgroundColor: cityColors,
                          borderWidth: 1,
                        },
                      ],
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className={styles.chartCard}>
              <div className={styles.chartCardHeader}>
                <i className={`bi bi-pie-chart-fill ${styles.chartCardIcon}`}></i> Distribution by Status
              </div>
              <div className={styles.chartCardBody}>
                <div style={{ height: 320 }}>
                  <Doughnut
                    options={{
                      ...doughnutOptions,
                      plugins: {
                        ...doughnutOptions.plugins,
                        title: { ...doughnutOptions.plugins.title, text: "Distribution by Status" },
                      },
                    }}
                    data={{
                      labels: statusData.labels,
                      datasets: [
                        {
                          data: statusData.data,
                          backgroundColor: statusData.backgroundColor,
                          borderWidth: 1,
                        },
                      ],
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Streams (sorted by updated/created DESC) */}
        <div className="row">
          <div className="col-12">
            <div className={styles.tableCard}>
              <div className={styles.chartCardHeader}>
                <i className={`bi bi-table ${styles.chartCardIcon}`}></i> Recent Streams
              </div>
              <div className={styles.chartCardBody}>
                <div className="table-responsive">
                  <table className="table">
                    <thead className={styles.tableHeader}>
                      <tr>
                        <th>Name</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentStreams.map((stream) => {
                        const updatedTs = getUpdatedTs(stream);
                        const createdTs = getCreatedTs(stream);
                        const showTs = updatedTs || createdTs;
                        const isNewBadge = isNew(showTs);

                        return (
                          <tr key={stream.stream_id} className={styles.tableRow}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="rounded-circle bg-light p-2 me-2">
                                  <i className="bi bi-camera-video"></i>
                                </div>
                                <span>{stream.name}</span>
                                {isNewBadge && (
                                  <span className="ms-2 badge bg-success-subtle text-success border border-success">
                                    NEW
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>{stream.location?.city || "-"}, {stream.location?.area || "-"}</td>
                            <td>
                              <span
                                className={`${styles.statusBadge} ${
                                  stream.status === "active"
                                    ? styles.statusActive
                                    : stream.status === "inactive"
                                    ? styles.statusInactive
                                    : styles.statusError
                                }`}
                              >
                                {stream.status || "unknown"}
                              </span>
                            </td>
                            <td title={showTs ? new Date(showTs).toISOString() : ""}>
                              {showTs ? new Date(showTs).toLocaleString() : "-"}
                            </td>
                            <td>
                              <button
                                className={styles.viewButton}
                                onClick={() => router.push(`/streams/${stream.stream_id}`)}
                              >
                                <i className="bi bi-eye me-1"></i> View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="text-center mt-4">
                  <button className={styles.refreshButton} onClick={() => router.push("/streams")}>
                    <i className="bi bi-list me- bg-primary"></i> View All Streams
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
