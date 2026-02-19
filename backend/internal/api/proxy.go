package api

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

// ProxyToPython forwards requests to the AI Engine.
func ProxyToPython(w http.ResponseWriter, r *http.Request) {
	aiURL := os.Getenv("AI_ENGINE_URL")
	if aiURL == "" {
		aiURL = "http://localhost:8000"
	}

	target, err := url.Parse(aiURL)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Invalid AI Engine URL configuration")
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(target)

	// Update the request parameters to match the target
	r.URL.Host = target.Host
	r.URL.Scheme = target.Scheme
	r.Header.Set("X-Forwarded-Host", r.Header.Get("Host"))
	r.Host = target.Host

	// Strip the prefix if the python app is mounted at root but validation logic might be needed.
	// For now, we assume Python mounts at /api/... as well, so no path rewriting needed
	// based on current main.py (it maps /api/trigger etc).

	// Logging for debug
	fmt.Printf("[Proxy] Forwarding %s to %s\n", r.URL.Path, aiURL)

	// The Go gateway owns browser-facing CORS headers.
	// Strip upstream CORS headers from the Python service to avoid invalid
	// merged values like "http://localhost:3000, *".
	proxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Del("Access-Control-Allow-Origin")
		resp.Header.Del("Access-Control-Allow-Credentials")
		resp.Header.Del("Access-Control-Allow-Headers")
		resp.Header.Del("Access-Control-Allow-Methods")
		resp.Header.Del("Access-Control-Expose-Headers")
		return nil
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		fmt.Printf("[Proxy] Error: %v\n", err)
		respondError(w, http.StatusBadGateway, "AI Engine unavailable")
	}

	proxy.ServeHTTP(w, r)
}
