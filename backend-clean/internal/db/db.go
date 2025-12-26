package db

import (
	"context"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"shop-backend/internal/config"
	"shop-backend/internal/models"
)

func Open(cfg config.Config) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(cfg.DSN), &gorm.Config{})
}

func AutoMigrate(conn *gorm.DB) error {
	return conn.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.Product{},
		&models.ProductCategory{},
		&models.Variant{},
		&models.Image{},
		&models.PriceHistory{},
		&models.Order{},
		&models.Cart{},
		&models.CartItem{},
	)
}

func BootstrapAdmin(conn *gorm.DB, cfg config.Config) error {
	var count int64
	conn.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&count)
	if count > 0 {
		return nil
	}
	user := models.User{
		Email:        cfg.AdminBootstrapEmail,
		PasswordHash: models.HashPassword(cfg.AdminBootstrapPassword),
		Role:         models.RoleAdmin,
	}
	return conn.Create(&user).Error
}

func WithTimeout(db *gorm.DB) *gorm.DB {
	ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)
	return db.WithContext(ctx)
}
