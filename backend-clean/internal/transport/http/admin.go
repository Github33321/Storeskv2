package http

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"shop-backend/internal/models"
	"shop-backend/internal/storage"
)

func RegisterAdmin(rg *gin.RouterGroup, db *gorm.DB, store *storage.Local) {
	adm := rg.Group("")

	// --------- Категории ---------
	adm.POST("/categories", func(c *gin.Context) {
		var req struct {
			Name     string `json:"name"`
			Slug     string `json:"slug"`
			ParentID *uint  `json:"parent_id"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "bad json"})
			return
		}
		cat := models.Category{Name: req.Name, Slug: strings.ToLower(req.Slug), ParentID: req.ParentID}
		if err := db.Create(&cat).Error; err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		c.JSON(201, cat)
	})

	adm.PATCH("/categories/:id", func(c *gin.Context) {
		var req struct {
			Name     *string `json:"name"`
			Slug     *string `json:"slug"`
			ImageURL *string `json:"image_url"`
			ParentID *uint   `json:"parent_id"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "bad json"})
			return
		}
		var cat models.Category
		if err := db.First(&cat, c.Param("id")).Error; err != nil {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}
		if req.Name != nil {
			cat.Name = *req.Name
		}
		if req.Slug != nil {
			cat.Slug = strings.ToLower(*req.Slug)
		}
		if req.ImageURL != nil {
			cat.ImageURL = *req.ImageURL
		}
		if req.ParentID != nil {
			cat.ParentID = req.ParentID
		}
		if err := db.Save(&cat).Error; err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, cat)
	})

	adm.POST("/categories/:id/image", func(c *gin.Context) {
		var cat models.Category
		if err := db.First(&cat, c.Param("id")).Error; err != nil {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}
		file, err := c.FormFile("image")
		if err != nil {
			c.JSON(400, gin.H{"error": "no file"})
			return
		}
		url, err := store.SaveImage(file)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		cat.ImageURL = url
		db.Save(&cat)
		c.JSON(200, gin.H{"image_url": url})
	})

	adm.DELETE("/categories/:id", func(c *gin.Context) {
		id := c.Param("id")
		db.Where("category_id = ?", id).Delete(&models.ProductCategory{})
		db.Delete(&models.Category{}, id)
		c.Status(204)
	})

	// --------- Товары ---------
	adm.POST("/products", func(c *gin.Context) {
		var req struct {
			Title       string `json:"title"`
			Slug        string `json:"slug"`
			Description string `json:"description"`
			Specs       string `json:"specs"` // ⬅️ новое поле
			CategoryIDs []uint `json:"category_ids"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "bad json"})
			return
		}
		p := models.Product{
			Title:       req.Title,
			Slug:        strings.ToLower(req.Slug),
			Description: req.Description,
			Specs:       req.Specs,
		}
		if err := db.Create(&p).Error; err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		if len(req.CategoryIDs) > 0 {
			db.Model(&p).Association("Categories").Replace(idsToCats(req.CategoryIDs))
		}
		c.JSON(201, p)
	})

	// ✅ Частичное редактирование товара
	adm.PATCH("/products/:id", func(c *gin.Context) {
		var req struct {
			Title       *string `json:"title"`
			Slug        *string `json:"slug"`
			Description *string `json:"description"`
			Specs       *string `json:"specs"` // ⬅️ новое поле
			CategoryIDs *[]uint `json:"category_ids"`
		}

		var p models.Product
		if err := db.Preload("Categories").Preload("Variants.Images").First(&p, c.Param("id")).Error; err != nil {
			c.JSON(404, gin.H{"error": "product not found"})
			return
		}

		if err := c.BindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "bad json"})
			return
		}

		if req.Title != nil {
			p.Title = *req.Title
		}
		if req.Slug != nil {
			p.Slug = strings.ToLower(*req.Slug)
		}
		if req.Description != nil {
			p.Description = *req.Description
		}
		if req.Specs != nil {
			p.Specs = *req.Specs
		}
		if req.CategoryIDs != nil {
			if err := db.Model(&p).Association("Categories").Replace(idsToCats(*req.CategoryIDs)); err != nil {
				c.JSON(400, gin.H{"error": err.Error()})
				return
			}
		}

		if err := db.Save(&p).Error; err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		db.Preload("Categories").Preload("Variants.Images").First(&p, p.ID)
		c.JSON(200, p)
	})

	adm.POST("/images/upload", func(c *gin.Context) {
		file, err := c.FormFile("image")
		if err != nil {
			c.JSON(400, gin.H{"error": "no file"})
			return
		}
		url, err := store.SaveImage(file)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"url": url})
	})

	// --------- Вариации ---------
	adm.POST("/products/:id/variants", func(c *gin.Context) {
		// поддерживаем JSON и multipart
		var req struct {
			Color        string   `json:"color" form:"color"`
			ColorHex     string   `json:"color_hex" form:"color_hex"`
			Memory       string   `json:"memory" form:"memory"`
			Connectivity string   `json:"connectivity" form:"connectivity"`
			PriceCents   int64    `json:"price_cents" form:"price_cents"`
			Stock        int      `json:"stock" form:"stock"`
			ImageURLs    []string `json:"image_urls"`
		}

		isJSON := strings.Contains(strings.ToLower(c.GetHeader("Content-Type")), "application/json")
		var bindErr error
		if isJSON {
			bindErr = c.BindJSON(&req)
		} else {
			bindErr = c.Bind(&req)
		}
		if bindErr != nil {
			c.JSON(400, gin.H{"error": "bad payload"})
			return
		}

		var p models.Product
		if err := db.First(&p, c.Param("id")).Error; err != nil {
			c.JSON(404, gin.H{"error": "product not found"})
			return
		}

		v := models.Variant{
			ProductID:    p.ID,
			Color:        req.Color,
			ColorHex:     req.ColorHex,
			Memory:       req.Memory,
			Connectivity: req.Connectivity,
			PriceCents:   req.PriceCents,
			Stock:        req.Stock,
		}
		db.Create(&v)

		addedAny := false

		// JSON ссылки
		for i, u := range req.ImageURLs {
			if strings.TrimSpace(u) == "" {
				continue
			}
			db.Create(&models.Image{VariantID: v.ID, URL: u, Alt: v.Color, Sort: i})
			addedAny = true
		}

		// multipart файлы
		if !isJSON {
			if form, err := c.MultipartForm(); err == nil {
				for i, f := range form.File["images"] {
					url, err := store.SaveImage(f)
					if err != nil {
						fmt.Println("save error:", err)
						continue
					}
					db.Create(&models.Image{VariantID: v.ID, URL: url, Alt: v.Color, Sort: i})
					addedAny = true
				}
			}
		}

		// если картинок нет — копируем от первой вариации того же цвета
		if !addedAny && strings.TrimSpace(v.Color) != "" {
			var src models.Variant
			if err := db.Preload("Images").
				Where("product_id = ? AND LOWER(color) = LOWER(?)", v.ProductID, v.Color).
				Order("id ASC").
				First(&src).Error; err == nil {
				for i, im := range src.Images {
					db.Create(&models.Image{
						VariantID: v.ID,
						URL:       im.URL,
						Alt:       v.Color,
						Sort:      i,
					})
				}
			}
		}

		c.JSON(201, v)
	})

	// ✅ Частичное редактирование вариации
	adm.PATCH("/variants/:id", func(c *gin.Context) {
		var req struct {
			PriceCents   *int64    `json:"price_cents"`
			Stock        *int      `json:"stock"`
			Color        *string   `json:"color"`
			ColorHex     *string   `json:"color_hex"`
			Memory       *string   `json:"memory"`
			Connectivity *string   `json:"connectivity"`
			ImageURLs    *[]string `json:"image_urls"` // замена всего списка
		}
		var v models.Variant
		if err := db.Preload("Images").First(&v, c.Param("id")).Error; err != nil {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "bad json"})
			return
		}
		if req.PriceCents != nil {
			v.PriceCents = *req.PriceCents
		}
		if req.Stock != nil {
			v.Stock = *req.Stock
		}
		if req.Color != nil {
			v.Color = *req.Color
		}
		if req.ColorHex != nil {
			v.ColorHex = *req.ColorHex
		}
		if req.Memory != nil {
			v.Memory = *req.Memory
		}
		if req.Connectivity != nil {
			v.Connectivity = *req.Connectivity
		}
		if err := db.Save(&v).Error; err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		if req.ImageURLs != nil {
			db.Where("variant_id = ?", v.ID).Delete(&models.Image{})
			for i, u := range *req.ImageURLs {
				if strings.TrimSpace(u) == "" {
					continue
				}
				db.Create(&models.Image{VariantID: v.ID, URL: u, Alt: v.Color, Sort: i})
			}
		}
		db.Preload("Images").First(&v, v.ID)
		c.JSON(200, v)
	})

	adm.DELETE("/variants/:id", func(c *gin.Context) {
		var v models.Variant
		if err := db.First(&v, c.Param("id")).Error; err != nil {
			c.JSON(404, gin.H{"error": "variant not found"})
			return
		}
		db.Where("variant_id = ?", v.ID).Delete(&models.Image{})
		db.Delete(&v)
		c.Status(204)
	})

	adm.DELETE("/products/:id", func(c *gin.Context) {
		var p models.Product
		if err := db.First(&p, c.Param("id")).Error; err != nil {
			c.JSON(404, gin.H{"error": "product not found"})
			return
		}
		var vids []uint
		db.Model(&models.Variant{}).Where("product_id = ?", p.ID).Pluck("id", &vids)
		if len(vids) > 0 {
			db.Where("variant_id IN ?", vids).Delete(&models.Image{})
			db.Where("product_id = ?", p.ID).Delete(&models.Variant{})
		}
		db.Delete(&p)
		c.Status(204)
	})
}

func idsToCats(ids []uint) []models.Category {
	out := make([]models.Category, len(ids))
	for i, id := range ids {
		out[i] = models.Category{ID: id}
	}
	return out
}
