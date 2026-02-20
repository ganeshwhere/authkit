package authkit

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestVerifyTokenWithJWKSCache(t *testing.T) {
	privateKey := generatePrivateKey(t)
	publicJWK := publicKeyToJWK(t, &privateKey.PublicKey, "kid_1")

	var jwksCalls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/.well-known/jwks.json" {
			http.NotFound(w, r)
			return
		}

		atomic.AddInt32(&jwksCalls, 1)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "max-age=300")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"keys": []map[string]string{publicJWK},
		})
	}))
	defer server.Close()

	client, err := New(Config{
		BaseURL:  server.URL,
		Audience: "project_1",
		Issuer:   "https://auth.example.com",
		JWKSTTL:  5 * time.Minute,
	})
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	token := signToken(t, privateKey, "kid_1", time.Now().Add(time.Hour))

	for i := 0; i < 2; i++ {
		claims, verifyErr := client.VerifyToken(context.Background(), token)
		if verifyErr != nil {
			t.Fatalf("VerifyToken() error = %v", verifyErr)
		}
		if claims["sub"] != "user_1" {
			t.Fatalf("expected sub=user_1, got %v", claims["sub"])
		}
	}

	if atomic.LoadInt32(&jwksCalls) != 1 {
		t.Fatalf("expected JWKS endpoint to be called once, got %d", jwksCalls)
	}
}

func publicKeyToJWK(t *testing.T, publicKey *rsa.PublicKey, kid string) map[string]string {
	t.Helper()

	nValue := base64.RawURLEncoding.EncodeToString(publicKey.N.Bytes())
	eBytes := big.NewInt(int64(publicKey.E)).Bytes()

	// Trim leading zeros to keep RFC7517 base64url exponent representation compact.
	firstNonZero := 0
	for firstNonZero < len(eBytes) && eBytes[firstNonZero] == 0 {
		firstNonZero++
	}
	if firstNonZero == len(eBytes) {
		firstNonZero = len(eBytes) - 1
	}

	eValue := base64.RawURLEncoding.EncodeToString(eBytes[firstNonZero:])

	return map[string]string{
		"kid": kid,
		"kty": "RSA",
		"alg": "RS256",
		"use": "sig",
		"n":   nValue,
		"e":   eValue,
	}
}
