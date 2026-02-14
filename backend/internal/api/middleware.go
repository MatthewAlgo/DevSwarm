// backend/internal/api/middleware.go
// HTTP middleware for CORS, logging, and content-type enforcement.
package api

import (
	"log"
	"net/http"
	"time"
)

// JSONContentType sets the Content-Type header to application/json.
func JSONContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}

// RequestLogger logs incoming HTTP requests with method, path, and duration.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("[API] %s %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}
