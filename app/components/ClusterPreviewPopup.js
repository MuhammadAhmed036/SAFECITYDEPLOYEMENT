'use client';

import { useState, useMemo } from 'react';
import styles from './ClusterPreviewPopup.module.css';

function ImageWithFallback({ src, alt, fallbackIcon }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <img
        src={fallbackIcon}
        alt="No image available"
        className={styles.previewImage}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={styles.previewImage}
      onError={() => setHasError(true)}
    />
  );
}

export default function ClusterPreviewPopup({ 
  isOpen, 
  onClose, 
  clusterData = [], 
  onSeeDetails, 
  activeTab = 'events',
  fallbackIcon = '/camera-icon.svg'
}) {
  // Get recent items (last 3-5 items) for preview
  const recentItems = useMemo(() => {
    if (!Array.isArray(clusterData) || clusterData.length === 0) return [];
    
    // Sort by timestamp (newest first) and take first 3 items
    const sorted = [...clusterData]
      .filter(item => item && item.timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);
    
    return sorted;
  }, [clusterData]);

  const totalCount = clusterData.length;
  const locationInfo = clusterData[0] || {};

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {activeTab === 'events' && 'Recent Detections'}
            {activeTab === 'streams' && 'Stream Activity'}
            {activeTab === 'dahua' && 'Camera Activity'}
          </h3>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.locationInfo}>
            <div className={styles.locationText}>
              <i className="bi bi-geo-alt"></i>
              <span>{locationInfo.city || 'Unknown'}, {locationInfo.area || 'Unknown Area'}</span>
            </div>
            <div className={styles.countBadge}>
              {totalCount} {activeTab === 'events' ? 'detections' : activeTab === 'streams' ? 'streams' : 'cameras'}
            </div>
          </div>

          {recentItems.length > 0 ? (
            <div className={styles.recentItems}>
              <h4 className={styles.sectionTitle}>Recent Activity</h4>
              <div className={styles.itemsList}>
                {recentItems.map((item, index) => (
                  <div key={item.eventId || index} className={styles.previewItem}>
                    <div className={styles.imageContainer}>
                      <ImageWithFallback
                        src={item.imageCandidates?.[0] || item.image}
                        alt={`${activeTab} preview`}
                        fallbackIcon={fallbackIcon}
                      />
                    </div>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemLabel}>
                        {item.label || 'Unknown'}
                      </div>
                      {activeTab === 'events' && item.similarity && (
                        <div className={styles.similarity}>
                          {item.similarity}
                        </div>
                      )}
                      {activeTab === 'streams' && item.status && (
                        <div className={`${styles.status} ${styles[item.status]}`}>
                          {item.status}
                        </div>
                      )}
                      <div className={styles.timestamp}>
                        {item.when && item.when !== '—' ? 
                          new Date(item.when).toLocaleString() : 
                          'Unknown time'
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.noData}>
              <i className="bi bi-info-circle"></i>
              <span>No recent activity available</span>
            </div>
          )}

          <div className={styles.actions}>
            <button 
              className={styles.seeDetailsButton}
              onClick={() => {
                onSeeDetails(clusterData);
                onClose();
              }}
              disabled={totalCount === 0}
            >
              <i className="bi bi-table"></i>
              See All Details ({totalCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}