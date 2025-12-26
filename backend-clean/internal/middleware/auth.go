package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
	"shop-backend/internal/config"
	"shop-backend/internal/models"
)

func AdminLoginHandler(db *gorm.DB, cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct { Email, Password string }
		if err := c.BindJSON(&req); err != nil { c.JSON(400, gin.H{"error":"bad json"}); return }
		var u models.User
		if err := db.Where("email = ?", req.Email).First(&u).Error; err != nil { c.JSON(401, gin.H{"error":"invalid credentials"}); return }
		if !models.CheckPassword(u.PasswordHash, req.Password) { c.JSON(401, gin.H{"error":"invalid credentials"}); return }
		t := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"uid": u.ID, "role": u.Role, "exp": time.Now().Add(24*time.Hour).Unix()})
		s, _ := t.SignedString([]byte(cfg.JWTSecret))
		c.JSON(200, gin.H{"token": s})
	}
}

func JWT(cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		a := c.GetHeader("Authorization")
		if !strings.HasPrefix(a, "Bearer ") { c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"missing token"}); return }
		tok := strings.TrimPrefix(a, "Bearer ")
		_, err := jwt.Parse(tok, func(t *jwt.Token)(interface{}, error){ return []byte(cfg.JWTSecret), nil })
		if err != nil { c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"invalid token"}); return }
		c.Next()
	}
}