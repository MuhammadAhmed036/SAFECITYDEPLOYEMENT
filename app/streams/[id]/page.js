"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StreamDetailPage({ params }) {
  const router = useRouter();
  const { id } = params;
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStreamDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the direct API endpoint with the specific stream ID
        const apiUrl = `http://192.168.18.70:8080/api/luna-streams/1/streams/${id}`;
        console.log('Fetching from API:', apiUrl);
        
        try {
          // First try direct API access
          const response = await fetch(apiUrl, {
            headers: {
              'Cache-Control': 'no-cache',
            },
            signal: AbortSignal.timeout(5000)
          });
          
          if (!response.ok) {
            throw new Error(`Direct API request failed with status ${response.status}`);
          }
          
          const streamData = await response.json();
          setStream(streamData);
        } catch (directErr) {
          console.error('Direct API fetch failed:', directErr);
          
          // Fallback to proxy API
          const proxyUrl = `/api/proxy/luna-streams/1/streams/${id}`;
          console.log('Falling back to proxy API:', proxyUrl);
          
          const proxyResponse = await fetch(proxyUrl, {
            headers: {
              'Cache-Control': 'no-cache',
            }
          });
          
          if (!proxyResponse.ok) {
            throw new Error(`Proxy API request failed with status ${proxyResponse.status}`);
          }
          
          const proxyData = await proxyResponse.json();
          setStream(proxyData);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('All API fetch attempts failed:', err);
        setError('Failed to fetch stream details. Please try again later.');
        setLoading(false);
      }
    };

    if (id) {
      fetchStreamDetails();
    }
  }, [id]);

  const handleBack = () => {
    router.push('/streams');
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          Error: {error}
        </div>
        <button className="btn btn-primary" onClick={handleBack}>
          Back to Streams
        </button>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning" role="alert">
          Stream not found
        </div>
        <button className="btn btn-primary" onClick={handleBack}>
          Back to Streams
        </button>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Stream Details</h2>
        <button className="btn btn-primary" onClick={handleBack}>
          Back to Streams
        </button>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Basic Information</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <strong>Stream ID:</strong> {stream.stream_id}
            </div>
            <div className="col-md-6 mb-3">
              <strong>Name:</strong> {stream.name}
            </div>
            <div className="col-md-6 mb-3">
              <strong>Status:</strong> <span className={`badge ${stream.status === 'active' ? 'bg-success' : 'bg-warning'}`}>{stream.status}</span>
            </div>
            <div className="col-md-6 mb-3">
              <strong>Description:</strong> {stream.description || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Location Information</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <strong>City:</strong> {stream.location?.city || 'N/A'}
            </div>
            <div className="col-md-6 mb-3">
              <strong>Area:</strong> {stream.location?.area || 'N/A'}
            </div>
            <div className="col-md-6 mb-3">
              <strong>District:</strong> {stream.location?.district || 'N/A'}
            </div>
            <div className="col-md-6 mb-3">
              <strong>Street:</strong> {stream.location?.street || 'N/A'}
            </div>
            <div className="col-md-6 mb-3">
              <strong>House Number:</strong> {stream.location?.house_number || 'N/A'}
            </div>
            {stream.location?.geo_position && (
              <div className="col-md-6 mb-3">
                <strong>Coordinates:</strong> {stream.location.geo_position.latitude}, {stream.location.geo_position.longitude}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Stream Data</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <strong>Type:</strong> {stream.data?.type || 'N/A'}
            </div>
            <div className="col-md-6 mb-3">
              <strong>Reference:</strong> {stream.data?.reference || 'N/A'}
            </div>
            <div className="col-md-6 mb-3">
              <strong>Rotation:</strong> {stream.data?.rotation || 'N/A'}
            </div>
            <div className="col-md-6 mb-3">
              <strong>Endless:</strong> {stream.data?.endless ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      </div>

      {/* Autorestart Information Card */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Autorestart Configuration</h5>
        </div>
        <div className="card-body">
          {stream.autorestart ? (
            <div className="row">
              <div className="col-md-6 mb-3">
                <strong>Status:</strong> 
                <span className={`badge ms-2 ${stream.autorestart.status === 'enabled' ? 'bg-success' : 'bg-danger'}`}>
                  {stream.autorestart.status}
                </span>
              </div>
              <div className="col-md-6 mb-3">
                <strong>Restart Enabled:</strong> {stream.autorestart.restart ? 'Yes' : 'No'}
              </div>
              <div className="col-md-6 mb-3">
                <strong>Max Attempts:</strong> {stream.autorestart.attempt_count}
              </div>
              <div className="col-md-6 mb-3">
                <strong>Current Attempt:</strong> {stream.autorestart.current_attempt}
              </div>
              <div className="col-md-6 mb-3">
                <strong>Delay Between Attempts:</strong> {stream.autorestart.delay} seconds
              </div>
              <div className="col-md-6 mb-3">
                <strong>Last Attempt Time:</strong> {stream.autorestart.last_attempt_time ? 
                  new Date(stream.autorestart.last_attempt_time).toLocaleString() : 'N/A'}
              </div>
            </div>
          ) : (
            <div className="alert alert-warning">No autorestart configuration available</div>
          )}
        </div>
      </div>
    </div>
  );
}