'use client';

import { useState, useEffect } from 'react';
import styles from './SettingsPanel.module.css';

export default function SettingsPanel({ isOpen, onClose }) {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingEndpoint, setEditingEndpoint] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET',
    description: '',
    category: 'general',
    is_active: true
  });

  // Fetch endpoints
  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/endpoints');
      const result = await response.json();
      
      if (result.success) {
        setEndpoints(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch endpoints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEndpoints();
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingEndpoint 
        ? `/api/endpoints/${editingEndpoint.id}`
        : '/api/endpoints';
      
      const method = editingEndpoint ? 'PUT' : 'POST';
      
      console.log('Submitting endpoint:', { method, url, formData });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      console.log('Endpoint save result:', result);
      
      if (result.success) {
        await fetchEndpoints();
        resetForm();
        setError(null); // Clear any previous errors
      } else {
        setError(result.error || 'Failed to save endpoint');
      }
    } catch (err) {
      console.error('Error saving endpoint:', err);
      setError(`Failed to save endpoint: ${err.message}`);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this endpoint?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/endpoints/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchEndpoints();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to delete endpoint');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      method: 'GET',
      description: '',
      category: 'general',
      is_active: true
    });
    setEditingEndpoint(null);
    setShowAddForm(false);
  };

  // Start editing
  const startEdit = (endpoint) => {
    setFormData({
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
      description: endpoint.description || '',
      category: endpoint.category || 'general',
      is_active: endpoint.is_active !== undefined ? endpoint.is_active : true
    });
    setEditingEndpoint(endpoint);
    setShowAddForm(true);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2>API Endpoints Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          {error && (
            <div className={styles.error}>
              {error}
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}
          
          <div className={styles.actions}>
            <button 
              className={styles.addBtn}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? 'Cancel' : 'Add New Endpoint'}
            </button>
          </div>
          
          {showAddForm && (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>URL:</label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({...formData, url: e.target.value})}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Method:</label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({...formData, method: e.target.value})}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="WS">WebSocket</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label>Category:</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="general">General</option>
                  <option value="events">Events</option>
                  <option value="streams">Streams</option>
                  <option value="cameras">Cameras</option>
                  <option value="websocket">WebSocket</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label>Description:</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  Active
                </label>
              </div>
              
              <div className={styles.formActions}>
                <button type="submit" className={styles.saveBtn}>
                  {editingEndpoint ? 'Update' : 'Create'} Endpoint
                </button>
                <button type="button" onClick={resetForm} className={styles.cancelBtn}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          
          <div className={styles.endpointsList}>
            <h3>Existing Endpoints</h3>
            {loading ? (
              <div className={styles.loading}>Loading endpoints...</div>
            ) : (
              <div className={styles.endpoints}>
                {endpoints.map((endpoint) => (
                  <div key={endpoint.id} className={styles.endpoint}>
                    <div className={styles.endpointInfo}>
                      <div className={styles.endpointName}>
                        {endpoint.name}
                        <span className={styles.method}>{endpoint.method}</span>
                        <span className={styles.category}>{endpoint.category}</span>
                        <span className={`${styles.status} ${endpoint.is_active ? styles.active : styles.inactive}`}>
                          {endpoint.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className={styles.endpointUrl}>{endpoint.url}</div>
                      {endpoint.description && (
                        <div className={styles.endpointDesc}>{endpoint.description}</div>
                      )}
                    </div>
                    <div className={styles.endpointActions}>
                      <button 
                        onClick={() => startEdit(endpoint)}
                        className={styles.editBtn}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(endpoint.id)}
                        className={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}