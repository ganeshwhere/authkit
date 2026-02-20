package authkit

import (
	"context"
	"crypto/rsa"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const Version = "0.1.0"

// Config configures the AuthKit Go client.
type Config struct {
	BaseURL    string
	PublicKey  string
	Issuer     string
	Audience   string
	HTTPClient *http.Client
	JWKSTTL    time.Duration
}

// Client verifies AuthKit tokens using a configured public key or JWKS.
type Client struct {
	baseURL    string
	issuer     string
	audience   string
	publicKey  *rsa.PublicKey
	jwksCache  *jwksCache
	httpClient *http.Client
}

// New constructs a new AuthKit client.
func New(config Config) (*Client, error) {
	baseURL := strings.TrimRight(config.BaseURL, "/")
	if baseURL == "" {
		return nil, fmt.Errorf("%w: base URL is required", ErrInvalidConfig)
	}

	httpClient := config.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 5 * time.Second}
	}

	var parsedPublicKey *rsa.PublicKey
	if config.PublicKey != "" {
		key, err := jwt.ParseRSAPublicKeyFromPEM([]byte(config.PublicKey))
		if err != nil {
			return nil, fmt.Errorf("%w: unable to parse public key: %v", ErrInvalidConfig, err)
		}
		parsedPublicKey = key
	}

	cacheTTL := config.JWKSTTL
	if cacheTTL <= 0 {
		cacheTTL = time.Hour
	}

	return &Client{
		baseURL:    baseURL,
		issuer:     config.Issuer,
		audience:   config.Audience,
		publicKey:  parsedPublicKey,
		httpClient: httpClient,
		jwksCache: newJWKSCache(jwksCacheConfig{
			baseURL:    baseURL,
			httpClient: httpClient,
			ttl:        cacheTTL,
		}),
	}, nil
}

// VerifyToken validates a JWT and returns token claims.
func (c *Client) VerifyToken(ctx context.Context, token string) (map[string]any, error) {
	if strings.TrimSpace(token) == "" {
		return nil, ErrInvalidToken
	}

	options := []jwt.ParserOption{
		jwt.WithValidMethods([]string{"RS256"}),
	}
	if c.issuer != "" {
		options = append(options, jwt.WithIssuer(c.issuer))
	}
	if c.audience != "" {
		options = append(options, jwt.WithAudience(c.audience))
	}

	claims := jwt.MapClaims{}
	keyFunc := func(parsed *jwt.Token) (any, error) {
		if c.publicKey != nil {
			return c.publicKey, nil
		}

		kid, err := extractKID(parsed)
		if err != nil {
			return nil, err
		}

		key, err := c.jwksCache.GetKey(ctx, kid, false)
		if err != nil {
			return nil, err
		}
		if key != nil {
			return key, nil
		}

		// Retry once with forced refresh for key rotation.
		key, err = c.jwksCache.GetKey(ctx, kid, true)
		if err != nil {
			return nil, err
		}
		if key == nil {
			return nil, fmt.Errorf("%w: no matching key for kid %s", ErrInvalidToken, kid)
		}

		return key, nil
	}

	_, err := jwt.ParseWithClaims(token, claims, keyFunc, options...)
	if err != nil {
		switch {
		case errors.Is(err, jwt.ErrTokenExpired):
			return nil, ErrTokenExpired
		case errors.Is(err, ErrInvalidToken):
			return nil, err
		case errors.Is(err, ErrJWKSFetchFailed):
			return nil, err
		default:
			return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
		}
	}

	return claims, nil
}

// CloseIdleConnections closes idle HTTP connections held by the SDK HTTP client.
func (c *Client) CloseIdleConnections() {
	if c.httpClient != nil {
		c.httpClient.CloseIdleConnections()
	}
}

func extractKID(token *jwt.Token) (string, error) {
	rawKid, ok := token.Header["kid"]
	if !ok {
		return "", fmt.Errorf("%w: missing kid header", ErrInvalidToken)
	}

	kid, ok := rawKid.(string)
	if !ok || strings.TrimSpace(kid) == "" {
		return "", fmt.Errorf("%w: invalid kid header", ErrInvalidToken)
	}

	return kid, nil
}
