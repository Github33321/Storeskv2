package app

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"

	"shop-backend/internal/config"
	"shop-backend/internal/db"
	"shop-backend/internal/middleware"
	"shop-backend/internal/storage"
	pub "shop-backend/internal/transport/http"
	bot "shop-backend/internal/transport/http/bot"
)

func corsExactOrigin(allowed []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		h := c.Writer.Header()

		h.Del("Access-Control-Allow-Origin")
		h.Del("Access-Control-Allow-Credentials")
		h.Del("Access-Control-Allow-Headers")
		h.Del("Access-Control-Allow-Methods")
		h.Del("Vary")

		for _, o := range allowed {
			if strings.EqualFold(strings.TrimRight(o, "/"), strings.TrimRight(origin, "/")) {
				h.Set("Access-Control-Allow-Origin", origin)
				h.Set("Access-Control-Allow-Credentials", "true")
				h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				h.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
				h.Set("Vary", "Origin")
				break
			}
		}

		if origin != "" && h.Get("Access-Control-Allow-Origin") == "" && c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusForbidden)
			return
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func Run() error {
	cfg := config.Load()

	conn, err := db.Open(cfg)
	if err != nil {
		return err
	}
	if err := db.AutoMigrate(conn); err != nil {
		return err
	}
	if err := db.BootstrapAdmin(conn, cfg); err != nil {
		return err
	}

	store := storage.NewLocal(cfg.UploadDir)

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.SetTrustedProxies(nil)
	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false
	r.HandleMethodNotAllowed = true

	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:5174",
		"https://escapestore.ru",
		"https://www.escapestore.ru",
		"https://admin.escapestore.ru",
	}
	r.Use(corsExactOrigin(allowedOrigins))

	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	})
	r.NoMethod(func(c *gin.Context) {
		c.JSON(http.StatusMethodNotAllowed, gin.H{"error": "method not allowed"})
	})

	// статика
	r.Static("/media", cfg.UploadDir)

	// Публичка (и дубли под /api — как было)
	pub.RegisterPublic(r.Group("/"), conn)
	pub.RegisterPublic(r.Group("/api"), conn)

	// ==== АДМИН — ТОЛЬКО /api/admin ====
	adminAPI := r.Group("/api/admin")
	// login без JWT
	adminAPI.POST("/auth/login", middleware.AdminLoginHandler(conn, cfg))
	// всё ниже — под JWT
	adminAPI.Use(middleware.JWT(cfg))
	pub.RegisterAdmin(adminAPI, conn, store)

	// ==== BOT (как было) ====
	if os.Getenv("TELEGRAM_BOT_TOKEN") != "" {
		bot.RegisterBot(r.Group("/bot"))
		bot.RegisterBot(r.Group("/api/bot"))
	}

	// SEO
	r.GET("/sitemap.xml", pub.SitemapHandler(conn))
	r.GET("/robots.txt", pub.RobotsHandler())

	addr := strings.TrimSpace(cfg.Addr)
	if addr == "" {
		addr = ":8082"
	}
	log.Println("EscapeStore backend on", addr)
	return http.ListenAndServe(addr, r)
}
