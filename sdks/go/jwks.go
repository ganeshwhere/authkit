package authkit

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"
)

type jwksCacheConfig struct {
	baseURL    string
	httpClient *http.Client
	ttl        time.Duration
}

type jwk struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Alg string `json:"alg"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type jwksResponse struct {
	Keys []jwk `json:"keys"`
}

type jwksCache struct {
	baseURL    string
	httpClient *http.Client
	ttl        time.Duration

	mu          sync.RWMutex
	expiresAt   time.Time
	keyByKID    map[string]*rsa.PublicKey
	lastLoadErr error
}

func newJWKSCache(config jwksCacheConfig) *jwksCache {
	return &jwksCache{
		baseURL:    config.baseURL,
		httpClient: config.httpClient,
		ttl:        config.ttl,
		keyByKID:   make(map[string]*rsa.PublicKey),
	}
}

func (c *jwksCache) GetKey(ctx context.Context, kid string, forceRefresh bool) (*rsa.PublicKey, error) {
	if !forceRefresh {
		if key, ok := c.getCachedKey(kid); ok {
			return key, nil
		}
	}

	if err := c.refresh(ctx); err != nil {
		return nil, err
	}

	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.keyByKID[kid], nil
}

func (c *jwksCache) getCachedKey(kid string) (*rsa.PublicKey, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.expiresAt.Before(time.Now()) {
		return nil, false
	}

	key, ok := c.keyByKID[kid]
	return key, ok
}

func (c *jwksCache) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/.well-known/jwks.json", nil)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrJWKSFetchFailed, err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrJWKSFetchFailed, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%w: status %d", ErrJWKSFetchFailed, resp.StatusCode)
	}

	var payload jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return fmt.Errorf("%w: %v", ErrJWKSFetchFailed, err)
	}

	nextKeys := make(map[string]*rsa.PublicKey, len(payload.Keys))
	for _, key := range payload.Keys {
		parsed, err := parseRSAPublicKeyFromJWK(key)
		if err != nil {
			continue
		}
		nextKeys[key.Kid] = parsed
	}

	ttl := c.ttl
	if maxAge := parseCacheControlMaxAge(resp.Header.Get("Cache-Control")); maxAge > 0 {
		ttl = maxAge
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	c.keyByKID = nextKeys
	c.expiresAt = time.Now().Add(ttl)
	c.lastLoadErr = nil

	return nil
}

func parseCacheControlMaxAge(header string) time.Duration {
	parts := strings.Split(header, ",")
	for _, part := range parts {
		piece := strings.TrimSpace(strings.ToLower(part))
		if !strings.HasPrefix(piece, "max-age=") {
			continue
		}

		value := strings.TrimPrefix(piece, "max-age=")
		seconds, err := time.ParseDuration(value + "s")
		if err != nil {
			return 0
		}
		return seconds
	}

	return 0
}

func parseRSAPublicKeyFromJWK(key jwk) (*rsa.PublicKey, error) {
	if key.Kid == "" || key.Kty != "RSA" || key.N == "" || key.E == "" {
		return nil, fmt.Errorf("invalid JWK")
	}

	modulusBytes, err := base64.RawURLEncoding.DecodeString(key.N)
	if err != nil {
		return nil, err
	}
	exponentBytes, err := base64.RawURLEncoding.DecodeString(key.E)
	if err != nil {
		return nil, err
	}

	var exponent int
	for _, b := range exponentBytes {
		exponent = exponent<<8 + int(b)
	}
	if exponent <= 1 {
		return nil, fmt.Errorf("invalid RSA exponent")
	}

	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(modulusBytes),
		E: exponent,
	}, nil
}
