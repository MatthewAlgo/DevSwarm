package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestProxyToPythonStripsUpstreamCORSHeaders(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer upstream.Close()

	t.Setenv("AI_ENGINE_URL", upstream.URL)

	req := httptest.NewRequest(http.MethodPost, "/api/trigger", strings.NewReader(`{"goal":"test"}`))
	rr := httptest.NewRecorder()

	ProxyToPython(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status: got %d, want %d", rr.Code, http.StatusOK)
	}

	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("Access-Control-Allow-Origin should be stripped, got %q", got)
	}
	if got := rr.Header().Get("Access-Control-Allow-Credentials"); got != "" {
		t.Fatalf("Access-Control-Allow-Credentials should be stripped, got %q", got)
	}
	if got := rr.Header().Get("Access-Control-Allow-Headers"); got != "" {
		t.Fatalf("Access-Control-Allow-Headers should be stripped, got %q", got)
	}
}
