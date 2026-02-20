package authkit

import "testing"

func TestExtractBearerToken(t *testing.T) {
	tests := []struct {
		name   string
		header string
		want   string
	}{
		{name: "valid token", header: "Bearer token_123", want: "token_123"},
		{name: "mixed case bearer", header: "bEaReR token_123", want: "token_123"},
		{name: "empty header", header: "", want: ""},
		{name: "basic auth header", header: "Basic abc", want: ""},
		{name: "missing token", header: "Bearer ", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := extractBearerToken(tt.header); got != tt.want {
				t.Fatalf("extractBearerToken() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestAPIErrorEnvelope(t *testing.T) {
	envelope := apiErrorEnvelope(ErrTokenExpired)
	errorPayload, ok := envelope["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload map, got %T", envelope["error"])
	}

	if errorPayload["code"] != ErrTokenExpired.Code {
		t.Fatalf("expected error code %s, got %v", ErrTokenExpired.Code, errorPayload["code"])
	}

	if apiErrorStatusCode(ErrTokenExpired) != ErrTokenExpired.StatusCode {
		t.Fatalf("expected status code %d", ErrTokenExpired.StatusCode)
	}
}
