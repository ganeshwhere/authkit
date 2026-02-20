package authkit

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const GinUserContextKey = "authkit.user"

// GinMiddleware verifies bearer tokens and stores claims in gin context.
func (c *Client) GinMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		token := extractBearerToken(ctx.GetHeader("Authorization"))
		if token == "" {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, apiErrorEnvelope(ErrInvalidToken))
			return
		}

		claims, err := c.VerifyToken(ctx.Request.Context(), token)
		if err != nil {
			ctx.AbortWithStatusJSON(apiErrorStatusCode(err), apiErrorEnvelope(err))
			return
		}

		ctx.Set(GinUserContextKey, claims)
		ctx.Next()
	}
}

// GetGinUser reads AuthKit claims from gin context.
func GetGinUser(ctx *gin.Context) (map[string]any, bool) {
	value, exists := ctx.Get(GinUserContextKey)
	if !exists {
		return nil, false
	}
	claims, ok := value.(map[string]any)
	return claims, ok
}
