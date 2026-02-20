package authkit

import "fmt"

// Error is the typed error returned by AuthKit SDK operations.
type Error struct {
	Code       string
	Message    string
	StatusCode int
}

func (e *Error) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

var (
	ErrInvalidConfig = &Error{
		Code:       "INVALID_CONFIGURATION",
		Message:    "invalid AuthKit configuration",
		StatusCode: 400,
	}
	ErrInvalidToken = &Error{
		Code:       "INVALID_TOKEN",
		Message:    "invalid token",
		StatusCode: 401,
	}
	ErrTokenExpired = &Error{
		Code:       "TOKEN_EXPIRED",
		Message:    "token has expired",
		StatusCode: 401,
	}
	ErrJWKSFetchFailed = &Error{
		Code:       "JWKS_FETCH_FAILED",
		Message:    "failed to fetch JWKS",
		StatusCode: 502,
	}
)
