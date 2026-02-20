package authkit

import (
	"strings"
)

func extractBearerToken(headerValue string) string {
	value := strings.TrimSpace(headerValue)
	if value == "" {
		return ""
	}

	parts := strings.SplitN(value, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}

	token := strings.TrimSpace(parts[1])
	if token == "" {
		return ""
	}

	return token
}

func apiErrorEnvelope(err error) map[string]any {
	typedError, ok := err.(*Error)
	if !ok {
		return map[string]any{
			"data": nil,
			"error": map[string]any{
				"code":    ErrInvalidToken.Code,
				"message": ErrInvalidToken.Message,
				"details": map[string]any{},
			},
		}
	}

	return map[string]any{
		"data": nil,
		"error": map[string]any{
			"code":    typedError.Code,
			"message": typedError.Message,
			"details": map[string]any{},
		},
	}
}

func apiErrorStatusCode(err error) int {
	typedError, ok := err.(*Error)
	if !ok {
		return ErrInvalidToken.StatusCode
	}
	return typedError.StatusCode
}
