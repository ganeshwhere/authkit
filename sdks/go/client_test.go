package authkit

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestVerifyTokenWithPublicKey(t *testing.T) {
	privateKey := generatePrivateKey(t)
	publicPEM := encodePublicKeyPEM(t, &privateKey.PublicKey)

	client, err := New(Config{
		BaseURL:   "https://auth.example.com",
		PublicKey: publicPEM,
		Issuer:    "https://auth.example.com",
		Audience:  "project_1",
	})
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	token := signToken(t, privateKey, "kid_1", time.Now().Add(time.Hour))
	claims, err := client.VerifyToken(context.Background(), token)
	if err != nil {
		t.Fatalf("VerifyToken() error = %v", err)
	}

	if claims["sub"] != "user_1" {
		t.Fatalf("expected sub=user_1, got %v", claims["sub"])
	}
}

func TestVerifyTokenExpired(t *testing.T) {
	privateKey := generatePrivateKey(t)
	publicPEM := encodePublicKeyPEM(t, &privateKey.PublicKey)

	client, err := New(Config{
		BaseURL:   "https://auth.example.com",
		PublicKey: publicPEM,
	})
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	token := signToken(t, privateKey, "kid_1", time.Now().Add(-time.Minute))
	_, err = client.VerifyToken(context.Background(), token)
	if err == nil {
		t.Fatalf("expected expired-token error, got nil")
	}
	if !errors.Is(err, ErrTokenExpired) && err != ErrTokenExpired {
		t.Fatalf("expected ErrTokenExpired, got %v", err)
	}
}

func generatePrivateKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()

	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("GenerateKey() error = %v", err)
	}
	return key
}

func encodePublicKeyPEM(t *testing.T, publicKey *rsa.PublicKey) string {
	t.Helper()

	publicBytes := x509.MarshalPKCS1PublicKey(publicKey)
	pemBytes := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PUBLIC KEY",
		Bytes: publicBytes,
	})
	return string(pemBytes)
}

func signToken(t *testing.T, privateKey *rsa.PrivateKey, kid string, expiresAt time.Time) string {
	t.Helper()

	claims := jwt.MapClaims{
		"sub": "user_1",
		"iss": "https://auth.example.com",
		"aud": "project_1",
		"iat": time.Now().Unix(),
		"exp": expiresAt.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = kid

	signed, err := token.SignedString(privateKey)
	if err != nil {
		t.Fatalf("SignedString() error = %v", err)
	}
	return signed
}
