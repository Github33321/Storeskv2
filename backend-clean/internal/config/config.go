package config

import (
	"log"
	"os"
)

type Config struct {
	Env       string
	Addr      string
	DSN       string
	JWTSecret string
	UploadDir string
	AdminBootstrapEmail    string
	AdminBootstrapPassword string
}

func Load() Config {
	c := Config{
		Env:  get("APP_ENV", "dev"),
		Addr: get("APP_ADDR", ":8080"),
		DSN:  get("DB_DSN", "host=db user=shop password=shop dbname=shop port=5432 sslmode=disable TimeZone=UTC"),
		JWTSecret: get("JWT_SECRET", "changeme"),
		UploadDir: get("UPLOAD_DIR", "./uploads"),
		AdminBootstrapEmail:    get("ADMIN_BOOTSTRAP_EMAIL", "admin@example.com"),
		AdminBootstrapPassword: get("ADMIN_BOOTSTRAP_PASSWORD", "admin123"),
	}
	if err := os.MkdirAll(c.UploadDir, 0o755); err != nil { log.Fatal(err) }
	return c
}

func get(k, def string) string { if v := os.Getenv(k); v != "" { return v }; return def }