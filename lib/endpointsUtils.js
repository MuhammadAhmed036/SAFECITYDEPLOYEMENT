// lib/endpointsUtils.js

/**
 * Fetch endpoints from the database
 * @param {string} category - Filter by category (optional)
 * @param {boolean} activeOnly - Only fetch active endpoints (default: true)
 * @returns {Promise<Object>} - Object with endpoints organized by name
 */
export async function fetchEndpoints(category = null, activeOnly = true) {
  try {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (activeOnly) params.append('active', 'true');
    
    const response = await fetch(`/api/endpoints?${params.toString()}`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch endpoints');
    }
    
    // Organize endpoints by name for easy access
    const endpointsMap = {};
    result.data.forEach(endpoint => {
      endpointsMap[endpoint.name] = endpoint;
    });
    
    return {
      success: true,
      endpoints: endpointsMap,
      raw: result.data
    };
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    return {
      success: false,
      error: error.message,
      endpoints: {},
      raw: []
    };
  }
}

/**
 * Get a specific endpoint URL by name
 * @param {string} name - Endpoint name
 * @param {Object} endpointsMap - Map of endpoints from fetchEndpoints
 * @returns {string|null} - Endpoint URL or null if not found
 */
export function getEndpointUrl(name, endpointsMap) {
  const endpoint = endpointsMap[name];
  return endpoint?.url || null;
}

/**
 * Get WebSocket URL for real-time connections
 * @param {Object} endpointsMap - Map of endpoints from fetchEndpoints
 * @param {string} baseUrl - Base URL for WebSocket (optional)
 * @returns {string|null} - WebSocket URL or null if not found
 */
export function getWebSocketUrl(endpointsMap, baseUrl = null) {
  const wsEndpoint = Object.values(endpointsMap).find(ep => ep.method === 'WS');
  if (wsEndpoint) {
    return wsEndpoint.url;
  }
  
  // Fallback to constructing from base URL if provided
  if (baseUrl) {
    return `${baseUrl.replace(/^http/, 'ws')}/6/events/ws`;
  }
  
  return null;
}

/**
 * Default endpoints fallback (used when database is not available)
 */
export const DEFAULT_ENDPOINTS = {
  events: '/api/events?page=1&page_size=200',
  streams: '/api/streams',
  dahua: '/api/dahua?page=1&page_size=200',
  events_ws: 'ws://192.168.18.70:5000/6/events/ws'
};

/**
 * Get endpoint with fallback to defaults
 * @param {string} name - Endpoint name
 * @param {Object} endpointsMap - Map of endpoints from fetchEndpoints
 * @returns {string} - Endpoint URL
 */
export function getEndpointWithFallback(name, endpointsMap) {
  return getEndpointUrl(name, endpointsMap) || DEFAULT_ENDPOINTS[name] || '';
}