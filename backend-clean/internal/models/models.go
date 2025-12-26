package models

import (
	"crypto/sha256"
	"encoding/hex"
	"time"
)

type Role string

const (
	RoleAdmin Role = "admin"
	RoleUser  Role = "user"
)

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Email        string    `gorm:"uniqueIndex;size:190" json:"email"`
	PasswordHash string    `json:"-"`
	Role         Role      `gorm:"size:20" json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

func HashPassword(s string) string         { h := sha256.Sum256([]byte(s)); return hex.EncodeToString(h[:]) }
func CheckPassword(hash, pass string) bool { return hash == HashPassword(pass) }

type Category struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:255" json:"name"`
	Slug      string    `gorm:"size:190;uniqueIndex" json:"slug"`
	ParentID  *uint     `json:"parent_id"`
	ImageURL  string    `json:"image_url"`
	CreatedAt time.Time `json:"created_at"`
}

type Product struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	Slug        string     `gorm:"uniqueIndex;size:190" json:"slug"`
	Title       string     `gorm:"size:255;index" json:"title"`
	Description string     `gorm:"type:text" json:"description"`
	Specs       string     `gorm:"type:text" json:"specs"` // ⬅️ характеристики в виде произвольного текста
	CreatedAt   time.Time  `json:"created_at"`
	Categories  []Category `gorm:"many2many:product_categories" json:"categories"`
	Variants    []Variant  `gorm:"constraint:OnDelete:CASCADE;" json:"variants"`
}

type ProductCategory struct {
	ProductID  uint `gorm:"primaryKey"`
	CategoryID uint `gorm:"primaryKey"`
}

type Variant struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	ProductID    uint      `gorm:"index" json:"product_id"`
	Color        string    `gorm:"size:100;index" json:"color"`
	ColorHex     string    `gorm:"size:16" json:"color_hex"`
	Memory       string    `gorm:"size:50;index" json:"memory"`
	Connectivity string    `gorm:"size:50;index" json:"connectivity"`
	PriceCents   int64     `json:"price_cents"`
	Stock        int       `json:"stock"`
	Images       []Image   `gorm:"constraint:OnDelete:CASCADE;" json:"images"`
	CreatedAt    time.Time `json:"created_at"`
}

type Image struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	VariantID uint   `gorm:"index" json:"variant_id"`
	URL       string `json:"url"`
	Alt       string `json:"alt"`
	Sort      int    `json:"sort"`
}

type PriceHistory struct {
	ID         uint `gorm:"primaryKey"`
	VariantID  uint `gorm:"index"`
	PriceCents int64
	CreatedAt  time.Time
}

/* ---------------- Orders / Telegram checkout ---------------- */

type OrderStatus string

const (
	OrderNew       OrderStatus = "new"
	OrderInBot     OrderStatus = "in_bot"
	OrderConfirmed OrderStatus = "confirmed"
	OrderPaid      OrderStatus = "paid"
	OrderCanceled  OrderStatus = "canceled"
)

type Order struct {
	ID         uint  `gorm:"primaryKey" json:"id"`
	ProductID  uint  `gorm:"index" json:"product_id"`
	VariantID  uint  `gorm:"index" json:"variant_id"`
	Qty        int   `json:"qty"`
	PriceCents int64 `json:"price_cents"`

	// Контакты из Telegram
	TelegramUserID   int64  `gorm:"index" json:"telegram_user_id"`
	TelegramUsername string `gorm:"size:255" json:"telegram_username"`
	CustomerTG       string `gorm:"size:255" json:"customer_tg"`
	ContactPhone     string `gorm:"size:50"  json:"contact_phone"`

	Status    OrderStatus `gorm:"size:20;index" json:"status"`
	CreatedAt time.Time   `json:"created_at"`

	Product Product `gorm:"-" json:"-"`
	Variant Variant `gorm:"-" json:"-"`
}

/* ---------------- Cart ---------------- */

// Корзина привязана к анонимному cookie cart_id (UUID/строка).
type Cart struct {
	ID        string     `gorm:"primaryKey;size:64" json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	Items     []CartItem `gorm:"constraint:OnDelete:CASCADE;" json:"items"`
}

// Позиция корзины с "снапшотами" основных данных, чтобы цена/название не "скакали".
type CartItem struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	CartID        string    `gorm:"index;size:64" json:"cart_id"`
	VariantID     uint      `gorm:"index" json:"variant_id"`
	Qty           int       `json:"qty"`
	PriceCents    int64     `json:"price_cents"`
	SnapshotTitle string    `gorm:"size:255" json:"snapshot_title"`
	SnapshotOpts  string    `gorm:"size:255" json:"snapshot_opts"`  // цвет/память/связь
	SnapshotImage string    `gorm:"size:500" json:"snapshot_image"` // первая картинка
	CreatedAt     time.Time `json:"created_at"`
}

// Уникальность: одна вариация — одна строка в корзине
func (CartItem) TableName() string { return "cart_items" }
