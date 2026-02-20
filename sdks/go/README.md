# authkit-go

Go SDK for AuthKit token verification with JWKS caching.

## Usage

```go
client, err := authkit.New(authkit.Config{
    BaseURL:  "https://auth.example.com",
    Audience: "project_123",
})
if err != nil {
    panic(err)
}

claims, err := client.VerifyToken(context.Background(), token)
if err != nil {
    panic(err)
}

fmt.Println(claims["sub"])
```

## Middleware integrations

```go
// Gin
router := gin.Default()
router.Use(client.GinMiddleware())
router.GET("/protected", func(c *gin.Context) {
    user, _ := authkit.GetGinUser(c)
    c.JSON(http.StatusOK, gin.H{"sub": user["sub"]})
})
```

```go
// Echo
e := echo.New()
e.Use(client.EchoMiddleware())
e.GET("/protected", func(c echo.Context) error {
    user, _ := authkit.GetEchoUser(c)
    return c.JSON(http.StatusOK, map[string]any{"sub": user["sub"]})
})
```
