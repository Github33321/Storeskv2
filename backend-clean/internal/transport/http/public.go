// internal/transport/http/public.go
package http

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"shop-backend/internal/models"
	bot "shop-backend/internal/transport/http/bot"
	"shop-backend/internal/util"
)

// Регистрируем публичные эндпоинты под /api
func RegisterPublic(rg *gin.RouterGroup, db *gorm.DB) {
	pub := rg.Group("")

	// healthcheck
	pub.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true, "brand": "EscapeStore"})
	})

	/* ---------------- CATEGORIES ---------------- */
	pub.GET("/categories", func(c *gin.Context) {
		var cats []models.Category
		if err := db.Order("id ASC").Find(&cats).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, cats)
	})

	/* ---------------- PRODUCTS LIST ---------------- */
	pub.GET("/products", func(c *gin.Context) {
		var products []models.Product
		p := util.ParsePagination(c)

		d := db.Model(&models.Product{}).
			Preload("Categories").
			Preload("Variants", func(tx *gorm.DB) *gorm.DB { return tx.Order("id ASC") }).
			Preload("Variants.Images", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort ASC") })

		// Поиск
		if q := strings.TrimSpace(c.Query("q")); q != "" {
			d = d.Where(
				"title ILIKE ? OR description ILIKE ? OR specs ILIKE ?",
				"%"+q+"%", "%"+q+"%", "%"+q+"%",
			)
		}

		// Категория (id или slug)
		if cat := strings.TrimSpace(c.Query("category")); cat != "" {
			var id uint
			if n, err := strconv.Atoi(cat); err == nil && n > 0 {
				id = uint(n)
			}
			if id == 0 {
				var cty models.Category
				if err := db.Where("slug = ?", cat).First(&cty).Error; err == nil {
					id = cty.ID
				}
			}
			if id > 0 {
				d = d.Joins("JOIN product_categories pc ON pc.product_id = products.id").
					Where("pc.category_id = ?", id)
			}
		}

		// total
		var total int64
		if err := d.Count(&total).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// page
		if err := d.
			Order("products.id DESC").
			Limit(p.Limit).
			Offset(p.Offset).
			Find(&products).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"items":  products,
			"total":  total,
			"limit":  p.Limit,
			"offset": p.Offset,
		})
	})

	/* ---------------- PRODUCT BY SLUG ---------------- */
	pub.GET("/products/:slug", func(c *gin.Context) {
		slug := c.Param("slug")
		var pr models.Product
		err := db.Preload("Categories").
			Preload("Variants", func(tx *gorm.DB) *gorm.DB { return tx.Order("id ASC") }).
			Preload("Variants.Images", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort ASC") }).
			Where("slug = ?", slug).
			First(&pr).Error

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}
		c.JSON(http.StatusOK, pr)
	})

	/* ---------------- CHECKOUT (cart/one-item) ---------------- */
	pub.POST("/checkout", func(c *gin.Context) {
		var body map[string]any
		if err := c.BindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
			return
		}

		getS := func(m map[string]any, k string) string {
			if v, ok := m[k]; ok && v != nil {
				return strings.TrimSpace(fmt.Sprintf("%v", v))
			}
			return ""
		}
		getI := func(m map[string]any, k string) int {
			s := getS(m, k)
			n, _ := strconv.Atoi(s)
			return n
		}
		getM := func(m map[string]any, k string) map[string]any {
			if v, ok := m[k]; ok && v != nil {
				if mm, ok := v.(map[string]any); ok {
					return mm
				}
			}
			return map[string]any{}
		}
		getItems := func(m map[string]any, k string) []map[string]any {
			v, ok := m[k]
			if !ok || v == nil {
				return nil
			}
			switch a := v.(type) {
			case []any:
				out := make([]map[string]any, 0, len(a))
				for _, it := range a {
					if mm, ok := it.(map[string]any); ok {
						out = append(out, mm)
					}
				}
				return out
			case []map[string]any:
				return a
			default:
				return nil
			}
		}

		productID := uint(0)
		variantID := uint(0)
		qty := 0

		if s := getS(body, "product_id"); s != "" {
			if n, _ := strconv.Atoi(s); n > 0 {
				productID = uint(n)
			}
		}
		if s := getS(body, "variant_id"); s != "" {
			if n, _ := strconv.Atoi(s); n > 0 {
				variantID = uint(n)
			}
		}
		if n := getI(body, "qty"); n > 0 {
			qty = n
		}

		items := getItems(body, "items")
		if (productID == 0 || variantID == 0 || qty == 0) && len(items) > 0 {
			first := items[0]
			if n, _ := strconv.Atoi(getS(first, "product_id")); n > 0 {
				productID = uint(n)
			}
			if n, _ := strconv.Atoi(getS(first, "variant_id")); n > 0 {
				variantID = uint(n)
			}
			if n, _ := strconv.Atoi(getS(first, "qty")); n > 0 {
				qty = n
			}
		}

		if productID == 0 || variantID == 0 || qty <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "product_id, variant_id, qty required"})
			return
		}

		var pr models.Product
		if err := db.First(&pr, "id = ?", productID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
			return
		}
		var v models.Variant
		if err := db.Preload("Images", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort ASC") }).
			First(&v, "id = ? AND product_id = ?", variantID, productID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "variant not found"})
			return
		}

		totalCents := int64(qty) * v.PriceCents
		order := models.Order{
			ProductID:    pr.ID,
			VariantID:    v.ID,
			Qty:          qty,
			PriceCents:   totalCents,
			CustomerTG:   strings.TrimSpace(getS(body, "telegram")),
			Status:       models.OrderNew,
			ContactPhone: getS(body, "phone"),
		}
		if err := db.Create(&order).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		buyer := map[string]any{
			"full_name": getS(body, "full_name"),
			"phone":     getS(body, "phone"),
			"email":     getS(body, "email"),
			"telegram":  getS(body, "telegram"),
		}
		delivery := map[string]any{
			"method":         getS(getM(body, "delivery"), "method"),
			"city":           getS(getM(body, "delivery"), "city"),
			"address":        getS(getM(body, "delivery"), "address"),
			"pickup_addr":    getS(getM(body, "delivery"), "pickup_address"),
			"payment_method": getS(body, "payment_method"),
		}
		consents := map[string]any{
			"offer":   getS(body, "consent_offer"),
			"privacy": getS(body, "consent_privacy"),
		}

		orderItems := make([]map[string]any, 0)
		if len(items) > 0 {
			for _, it := range items {
				orderItems = append(orderItems, map[string]any{
					"product_id":  it["product_id"],
					"variant_id":  it["variant_id"],
					"title":       it["title"],
					"options":     it["options"],
					"qty":         it["qty"],
					"price_cents": it["price_cents"],
					"image":       it["image"],
					"slug":        it["slug"],
				})
			}
		} else {
			opt := strings.TrimSpace(strings.Join([]string{v.Color, v.Memory, v.Connectivity}, " / "))
			img := ""
			if len(v.Images) > 0 {
				img = v.Images[0].URL
			}
			orderItems = []map[string]any{
				{
					"product_id":  pr.ID,
					"variant_id":  v.ID,
					"title":       pr.Title,
					"options":     opt,
					"qty":         qty,
					"price_cents": v.PriceCents,
					"image":       img,
					"slug":        pr.Slug,
				},
			}
		}

		orderPayload := map[string]any{
			"order_id":    order.ID,
			"total_cents": totalCents,
			"buyer":       buyer,
			"delivery":    delivery,
			"consents":    consents,
			"comment":     getS(body, "comment"),
			"items":       orderItems,
		}

		bot.NotifyAdminsFromSite(orderPayload)

		if base := strings.TrimRight(os.Getenv("PUBLIC_BASE_URL"), "/"); base != "" {
			_, _ = http.Post(
				base+"/api/bot/order_created",
				"application/json",
				bytes.NewReader(mustJSON(orderPayload)),
			)
		}

		botUser := strings.TrimSpace(strings.TrimPrefix(os.Getenv("TELEGRAM_BOT_USERNAME"), "@"))
		startParam := fmt.Sprintf("order_%d", order.ID)
		deeplinkHTTP := "https://t.me"
		if botUser != "" {
			deeplinkHTTP += "/" + botUser
		}
		deeplinkHTTP += "?start=" + url.QueryEscape(startParam)

		c.JSON(http.StatusOK, gin.H{
			"ok":       true,
			"order_id": order.ID,
			"tg_link":  deeplinkHTTP,
		})
	})

	/* =====================  CART (cookie-based)  ===================== */

	// ✅ FIX: никакого First()->ErrRecordNotFound (чтобы не было record not found в логах)
	pub.GET("/cart", func(c *gin.Context) {
		cartID := ensureCartCookie(c)

		// гарантируем, что корзина существует (FirstOrCreate не возвращает ErrRecordNotFound)
		if err := db.Where("id = ?", cartID).FirstOrCreate(&models.Cart{ID: cartID}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// грузим корзину с айтемами
		var cart models.Cart
		if err := db.Preload("Items").First(&cart, "id = ?", cartID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		type ItemDTO struct {
			ID         uint   `json:"id"`
			VariantID  uint   `json:"variant_id"`
			Qty        int    `json:"qty"`
			PriceCents int64  `json:"price_cents"`
			LineCents  int64  `json:"line_cents"`
			Title      string `json:"title"`
			Options    string `json:"options"`
			Image      string `json:"image"`
			Product    *struct {
				ID    uint   `json:"id"`
				Slug  string `json:"slug"`
				Title string `json:"title"`
			} `json:"product,omitempty"`
			Variant *struct {
				ID           uint   `json:"id"`
				Color        string `json:"color"`
				Memory       string `json:"memory"`
				Connectivity string `json:"connectivity"`
			} `json:"variant,omitempty"`
		}

		itemsDTO := make([]ItemDTO, 0, len(cart.Items))
		variantIDs := make([]uint, 0, len(cart.Items))
		for _, it := range cart.Items {
			variantIDs = append(variantIDs, it.VariantID)
		}

		var variants []models.Variant
		if len(variantIDs) > 0 {
			_ = db.Preload("Images", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort ASC") }).
				Find(&variants, "id IN ?", variantIDs).Error
		}
		byID := map[uint]models.Variant{}
		for _, v := range variants {
			byID[v.ID] = v
		}

		total := int64(0)
		for _, it := range cart.Items {
			v, ok := byID[it.VariantID]

			var prod *struct {
				ID    uint   `json:"id"`
				Slug  string `json:"slug"`
				Title string `json:"title"`
			}
			var varMin *struct {
				ID           uint   `json:"id"`
				Color        string `json:"color"`
				Memory       string `json:"memory"`
				Connectivity string `json:"connectivity"`
			}

			if ok {
				var p models.Product
				_ = db.Select("id, slug, title").First(&p, v.ProductID).Error
				prod = &struct {
					ID    uint   `json:"id"`
					Slug  string `json:"slug"`
					Title string `json:"title"`
				}{ID: p.ID, Slug: p.Slug, Title: p.Title}

				varMin = &struct {
					ID           uint   `json:"id"`
					Color        string `json:"color"`
					Memory       string `json:"memory"`
					Connectivity string `json:"connectivity"`
				}{
					ID:           v.ID,
					Color:        v.Color,
					Memory:       v.Memory,
					Connectivity: v.Connectivity,
				}
			}

			line := int64(it.Qty) * it.PriceCents
			total += line

			itemsDTO = append(itemsDTO, ItemDTO{
				ID:         it.ID,
				VariantID:  it.VariantID,
				Qty:        it.Qty,
				PriceCents: it.PriceCents,
				LineCents:  line,
				Title:      nz(it.SnapshotTitle),
				Options:    nz(it.SnapshotOpts),
				Image:      it.SnapshotImage,
				Product:    prod,
				Variant:    varMin,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"id":          cartID,
			"items":       itemsDTO,
			"total_cents": total,
			"count":       len(itemsDTO),
		})
	})

	// ✅ FIX: без First(cart_items)->ErrRecordNotFound (не будет record not found в логах)
	pub.POST("/cart/items", func(c *gin.Context) {
		cartID := ensureCartCookie(c)

		var req struct {
			VariantID uint `json:"variant_id"`
			Qty       int  `json:"qty"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
			return
		}
		if req.VariantID == 0 || req.Qty == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "variant_id and qty required"})
			return
		}

		var v models.Variant
		if err := db.Preload("Images", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort ASC") }).
			First(&v, req.VariantID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "variant not found"})
			return
		}
		if v.Stock <= 0 && req.Qty > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "out of stock"})
			return
		}

		// заранее готовим снапшоты для create
		img := ""
		if len(v.Images) > 0 {
			img = v.Images[0].URL
		}
		var p models.Product
		_ = db.Select("id, title").First(&p, v.ProductID).Error

		var out models.CartItem
		var deleted bool

		err := db.Transaction(func(tx *gorm.DB) error {
			// гарантируем, что корзина существует
			if err := tx.Where("id = ?", cartID).FirstOrCreate(&models.Cart{ID: cartID}).Error; err != nil {
				return err
			}

			// 1) пробуем обновить существующий item: qty += req.Qty, price_cents = актуальная
			// Используем RETURNING, чтобы получить итоговый qty без SELECT.
			var updated []models.CartItem
			upd := tx.
				Model(&models.CartItem{}).
				Clauses(clause.Returning{}).
				Where("cart_id = ? AND variant_id = ?", cartID, v.ID).
				Updates(map[string]any{
					"qty":         gorm.Expr("qty + ?", req.Qty),
					"price_cents": v.PriceCents,
				}).
				Find(&updated)

			if upd.Error != nil {
				return upd.Error
			}

			if upd.RowsAffected > 0 && len(updated) > 0 {
				out = updated[0]
				if out.Qty <= 0 {
					deleted = true
					return tx.Delete(&models.CartItem{}, out.ID).Error
				}
				return nil
			}

			// 2) если не нашли — создаём новый (только если qty > 0)
			if req.Qty < 0 {
				return fmt.Errorf("qty must be > 0 for new item")
			}

			item := models.CartItem{
				CartID:        cartID,
				VariantID:     v.ID,
				Qty:           req.Qty,
				PriceCents:    v.PriceCents,
				SnapshotTitle: nz(p.Title),
				SnapshotOpts:  strings.TrimSpace(strings.Join([]string{v.Color, v.Memory, v.Connectivity}, " / ")),
				SnapshotImage: img,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
			out = item
			return nil
		})

		if err != nil {
			// из Transaction вернётся ошибка (в т.ч. qty must be > 0...)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if deleted {
			c.Status(http.StatusNoContent)
			return
		}

		c.JSON(http.StatusOK, gin.H{"id": out.ID, "qty": out.Qty})
	})

	pub.PATCH("/cart/items/:id", func(c *gin.Context) {
		id := c.Param("id")
		var req struct {
			Qty *int `json:"qty"`
		}
		if err := c.BindJSON(&req); err != nil || req.Qty == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
			return
		}

		var item models.CartItem
		if err := db.First(&item, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		if *req.Qty <= 0 {
			_ = db.Delete(&item).Error
			c.Status(http.StatusNoContent)
			return
		}

		var v models.Variant
		if err := db.First(&v, item.VariantID).Error; err == nil {
			if v.Stock <= 0 {
				c.JSON(http.StatusConflict, gin.H{"error": "out of stock"})
				return
			}
			item.PriceCents = v.PriceCents
		}
		item.Qty = *req.Qty

		if err := db.Save(&item).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"id": item.ID, "qty": item.Qty})
	})

	pub.DELETE("/cart/items/:id", func(c *gin.Context) {
		if err := db.Delete(&models.CartItem{}, c.Param("id")).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	})

	pub.POST("/cart/clear", func(c *gin.Context) {
		cartID := ensureCartCookie(c)
		_ = db.Where("cart_id = ?", cartID).Delete(&models.CartItem{}).Error
		c.Status(http.StatusNoContent)
	})
}

/* ---------- helpers ---------- */

func nz(s string) string {
	if strings.TrimSpace(s) == "" {
		return ""
	}
	return s
}

// cookie cart_id — совместимо с продом и локальной разработкой
func ensureCartCookie(c *gin.Context) string {
	const cookieName = "cart_id"

	v, err := c.Cookie(cookieName)
	id := strings.TrimSpace(v)
	if err != nil || id == "" {
		id = uuid.NewString()
	}

	// локалка: НЕ Secure, SameSite=Lax
	ck := &http.Cookie{
		Name:     cookieName,
		Value:    id,
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 365,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false,
	}

	http.SetCookie(c.Writer, ck)
	return id
}

func mustJSON(v any) []byte {
	b, _ := json.Marshal(v)
	return b
}
