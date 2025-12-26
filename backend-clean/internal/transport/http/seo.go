package http

import (
	"encoding/xml"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"shop-backend/internal/models"
)

/* =====================  SITEMAP & ROBOTS  ===================== */

type smURL struct {
	Loc        string `xml:"loc"`
	LastMod    string `xml:"lastmod,omitempty"`
	ChangeFreq string `xml:"changefreq,omitempty"`
	Priority   string `xml:"priority,omitempty"`
}

type smURLSet struct {
	XMLName xml.Name `xml:"urlset"`
	Xmlns   string   `xml:"xmlns,attr"`
	URLs    []smURL  `xml:"url"`
}

// SitemapHandler — отдает динамический sitemap.xml из БД
func SitemapHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		base := strings.TrimRight(os.Getenv("PUBLIC_SITE_URL"), "/")
		if base == "" {
			// На проде ОБЯЗАТЕЛЬНО проставь PUBLIC_SITE_URL в .env, например:
			// https://escapestore.ru
			base = "https://example.com"
		}

		urls := make([]smURL, 0, 1024)
		today := time.Now().Format("2006-01-02")

		// Главная
		urls = append(urls, smURL{
			Loc:      base + "/",
			LastMod:  today,
			Priority: "1.0",
		})

		// Категории
		var cats []models.Category
		_ = db.Order("id ASC").Find(&cats).Error
		for _, ct := range cats {
			last := ct.CreatedAt
			if last.IsZero() {
				last = time.Now()
			}
			urls = append(urls, smURL{
				Loc:      base + "/c/" + strings.Trim(ct.Slug, "/"),
				LastMod:  last.Format("2006-01-02"),
				Priority: "0.8",
			})
		}

		// Товары
		var products []models.Product
		_ = db.Order("id DESC").Find(&products).Error
		for _, p := range products {
			last := p.CreatedAt
			if last.IsZero() {
				last = time.Now()
			}
			urls = append(urls, smURL{
				Loc:      base + "/p/" + strings.Trim(p.Slug, "/"),
				LastMod:  last.Format("2006-01-02"),
				Priority: "0.9",
			})
		}

		out := smURLSet{
			Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
			URLs:  urls,
		}

		c.Header("Content-Type", "application/xml; charset=utf-8")
		enc := xml.NewEncoder(c.Writer)
		enc.Indent("", "  ")
		c.Writer.WriteString(xml.Header)
		if err := enc.Encode(out); err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}
	}
}

// RobotsHandler — отдаёт robots.txt
func RobotsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		base := strings.TrimRight(os.Getenv("PUBLIC_SITE_URL"), "/")
		if base == "" {
			base = "https://example.com"
		}
		c.Header("Content-Type", "text/plain; charset=utf-8")
		c.String(200, `User-agent: *
Allow: /

Disallow: /admin
Disallow: /api
Disallow: /checkout
Disallow: /cart

Sitemap: `+base+`/sitemap.xml
Host: `+base+`
Crawl-delay: 2
`)
	}
}
