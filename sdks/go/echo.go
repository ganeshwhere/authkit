package authkit

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

const EchoUserContextKey = "authkit.user"

// EchoMiddleware verifies bearer tokens and stores claims in echo context.
func (c *Client) EchoMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(ctx echo.Context) error {
			token := extractBearerToken(ctx.Request().Header.Get("Authorization"))
			if token == "" {
				return ctx.JSON(http.StatusUnauthorized, apiErrorEnvelope(ErrInvalidToken))
			}

			claims, err := c.VerifyToken(ctx.Request().Context(), token)
			if err != nil {
				return ctx.JSON(apiErrorStatusCode(err), apiErrorEnvelope(err))
			}

			ctx.Set(EchoUserContextKey, claims)
			return next(ctx)
		}
	}
}

// GetEchoUser reads AuthKit claims from echo context.
func GetEchoUser(ctx echo.Context) (map[string]any, bool) {
	value := ctx.Get(EchoUserContextKey)
	if value == nil {
		return nil, false
	}

	claims, ok := value.(map[string]any)
	return claims, ok
}
