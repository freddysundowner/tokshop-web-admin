import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`API Error: ${res.status} - ${res.statusText}`, {
      url: res.url,
      status: res.status,
      statusText: res.statusText,
      text: text
    });
    
    // Try to extract the clean error message from JSON response
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch (parseError) {
      // If JSON parsing fails, use user-friendly generic messages
      console.log('JSON parsing failed:', parseError, 'Original text:', text);
    }
    
    // If we successfully parsed JSON, check for error messages
    if (errorData) {
      if (errorData.error) {
        // Handle different error formats
        if (typeof errorData.error === 'string') {
          throw new Error(errorData.error);
        } else if (typeof errorData.error === 'object') {
          // If error is an object, try to extract message
          const errorObj = errorData.error;
          if (errorObj.message) {
            throw new Error(errorObj.message);
          } else if (errorObj.error) {
            throw new Error(errorObj.error);
          } else {
            // Fallback: stringify the object for debugging
            throw new Error(`Validation failed: ${JSON.stringify(errorObj)}`);
          }
        }
      } else if (errorData.message) {
        // Fallback to message field if error field doesn't exist
        throw new Error(errorData.message);
      }
    }
    
    // Fallback: show user-friendly message based on status code instead of technical details
    if (res.status === 400) {
      throw new Error("Please check your information and try again.");
    } else if (res.status === 401) {
      throw new Error("Invalid email or password.");
    } else if (res.status === 403) {
      throw new Error("Access denied. Please contact support.");
    } else if (res.status === 404) {
      throw new Error("Service not available. Please try again later.");
    } else if (res.status >= 500) {
      throw new Error("Something went wrong. Please try again later.");
    } else {
      throw new Error("Unable to complete request. Please try again.");
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Use local API endpoints (which proxy to Icona API)
  const apiUrl = url;
  
  // Get access token and user data from localStorage if available
  const adminToken = localStorage.getItem('adminAccessToken');
  const userToken = localStorage.getItem('accessToken');
  const userData = localStorage.getItem('user');
  
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Send admin token if available (for admin routes)
  if (adminToken) {
    headers['x-admin-token'] = adminToken;
  }
  
  // Send regular user token if available (for all routes)
  if (userToken) {
    headers['x-access-token'] = userToken;
  }
  
  // Send user data for session restoration (base64 encoded to handle UTF-8 characters)
  if (userData) {
    headers['x-user-data'] = btoa(unescape(encodeURIComponent(userData)));
  }
  
  const res = await fetch(apiUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  }).catch(error => {
    console.error('Fetch error for:', apiUrl, error);
    throw error;
  });
  

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const [endpoint, ...params] = queryKey as [string, ...any[]];
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Handle different parameter patterns
    if (params.length > 0) {
      // For admin shows: [page, limit, searchTitle, searchType]
      if (endpoint === '/api/admin/shows' && params.length >= 2) {
        const [page, limit, searchTitle, searchType] = params;
        if (page) queryParams.set('page', String(page));
        if (limit) queryParams.set('limit', String(limit));
        if (searchTitle) queryParams.set('title', String(searchTitle));
        if (searchType) queryParams.set('type', String(searchType));
      }
      // For other endpoints that use userId pattern
      else if (params[0] && typeof params[0] === 'string') {
        queryParams.set('userId', params[0]);
      }
    }
    
    // Build final URL with query parameters
    const apiUrl = `${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    // Get access token and user data from localStorage if available
    const adminToken = localStorage.getItem('adminAccessToken');
    const userToken = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Send admin token if available (for admin routes)
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
    }
    
    // Send regular user token if available (for all routes)
    if (userToken) {
      headers['x-access-token'] = userToken;
    }
    
    // Send user data for session restoration (base64 encoded to handle UTF-8 characters)
    if (userData) {
      headers['x-user-data'] = btoa(unescape(encodeURIComponent(userData)));
    }
    
    const res = await fetch(apiUrl, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
