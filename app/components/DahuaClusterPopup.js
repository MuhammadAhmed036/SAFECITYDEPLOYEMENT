'use client';

import { useState, useMemo } from 'react';
import styles from './DahuaClusterPopup.module.css';

// Helper function to get the correct image URL using sample_id format
function getImageUrl(item) {
  // Check for face_detections with sample_id first
  if (item.face_detections && Array.isArray(item.face_detections) && item.face_detections.length > 0) {
    const fd = item.face_detections[0];
    if (fd.sample_id) {
      return `http://192.168.18.70:5000/6/samples/faces/${fd.sample_id}`;
    }
  }
  
  // Fallback to other image sources
  return item.image_origin || item.source || item.image;
}

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

export default function DahuaClusterPopup({ 
  isOpen, 
  onClose, 
  clusterData = [], 
  onSeeDetails, 
  fallbackIcon = '/camera-icon.svg',
  realTimeStreamEvents = [] // Events API data
}) {
  // Find the most recent matching event based on track_id
  const matchingEventData = useMemo(() => {
    if (!realTimeStreamEvents || realTimeStreamEvents.length === 0 || !clusterData || clusterData.length === 0) {
      return null;
    }

    // Get track_ids from the Dahua cameras in the cluster
    const dahuaTrackIds = clusterData
      .map(item => item.trackId || item.track_id)
      .filter(Boolean);

    if (dahuaTrackIds.length === 0) {
      return null;
    }

    // Find events that match these track_ids and get the most recent one
    const matchingEvents = realTimeStreamEvents.filter(event => 
      event.track_id && dahuaTrackIds.includes(event.track_id)
    );

    if (matchingEvents.length === 0) {
      return null;
    }

    // Sort by create_time and get the most recent
    const mostRecentEvent = matchingEvents.sort((a, b) => {
      const timeA = new Date(a.create_time || 0);
      const timeB = new Date(b.create_time || 0);
      return timeB - timeA;
    })[0];

    return mostRecentEvent;
  }, [clusterData, realTimeStreamEvents]);

  // Get camera info from cluster data
  const cameraInfo = useMemo(() => {
    if (!clusterData || clusterData.length === 0) return null;
    
    // Find the camera that matches the event's track_id if we have matching event data
    if (matchingEventData && matchingEventData.track_id) {
      const matchingCamera = clusterData.find(camera => 
        camera.trackId === matchingEventData.track_id || camera.track_id === matchingEventData.track_id
      );
      if (matchingCamera) return matchingCamera;
    }
    
    // Otherwise return the first camera
    return clusterData[0];
  }, [clusterData, matchingEventData]);

  const totalCount = clusterData.length;
  const locationInfo = cameraInfo || clusterData[0] || {};

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <i className="bi bi-camera-video"></i>
            Dahua Camera Detection
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
              {totalCount} camera{totalCount !== 1 ? 's' : ''}
            </div>
          </div>

          {matchingEventData ? (
            <div className={styles.detectionSection}>
              <h4 className={styles.sectionTitle}>
                <i className="bi bi-person-check"></i>
                Latest Detection
              </h4>
              
              <div className={styles.mainDetection}>
                <div className={styles.imageContainer}>
                  <ImageWithFallback
                        src={getImageUrl(matchingEventData)}
                        alt="Most recent detection"
                        fallbackIcon={fallbackIcon}
                      />
                  {matchingEventData.top_match?.similarity && (
                    <div className={styles.similarityBadge}>
                      {(matchingEventData.top_match.similarity * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
                
                <div className={styles.detectionInfo}>
                  <div className={styles.personInfo}>
                    <h5 className={styles.personName}>
                      {matchingEventData.top_match?.label || matchingEventData.user_data || 'Unknown Person'}
                    </h5>
                    <div className={styles.detectionTime}>
                      <i className="bi bi-clock"></i>
                      {matchingEventData.create_time ? 
                        new Date(matchingEventData.create_time).toLocaleString() : 
                        'Unknown time'
                      }
                    </div>
                  </div>
                  
                  <div className={styles.cameraDetails}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Camera ID:</span>
                      <span className={styles.detailValue}>{matchingEventData.track_id || 'Unknown'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Camera Name:</span>
                      <span className={styles.detailValue}>{cameraInfo?.label || 'Unknown Camera'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Source:</span>
                      <span className={styles.detailValue}>{matchingEventData.source || 'Unknown'}</span>
                    </div>
                    {matchingEventData.location && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Location:</span>
                        <span className={styles.detailValue}>
                          {matchingEventData.location.city || 'Unknown'}, {matchingEventData.location.area || 'Unknown Area'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.noDetectionSection}>
              <div className={styles.cameraInfo}>
                <h4 className={styles.sectionTitle}>
                  <i className="bi bi-camera"></i>
                  Camera Information
                </h4>
                
                <div className={styles.cameraDetails}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Camera Name:</span>
                    <span className={styles.detailValue}>{cameraInfo?.label || 'Unknown Camera'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Track ID:</span>
                    <span className={styles.detailValue}>{cameraInfo?.trackId || cameraInfo?.track_id || 'Unknown'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Location:</span>
                    <span className={styles.detailValue}>
                      {cameraInfo?.city || locationInfo.city || 'Unknown'}, {cameraInfo?.area || 'Unknown Area'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className={styles.noData}>
                <i className="bi bi-info-circle"></i>
                <span>No recent detections found for this camera</span>
              </div>
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
              View All Camera Details ({totalCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}