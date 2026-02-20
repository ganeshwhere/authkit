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
