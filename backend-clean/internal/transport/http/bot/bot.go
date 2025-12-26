package bot

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ========= ENV =========
// TELEGRAM_BOT_TOKEN
// TELEGRAM_ADMIN_CHAT_IDS     — "111,222"
// TELEGRAM_BOT_USERNAME       — без @ (опционально)
// PUBLIC_SITE_URL             — https://escapestore.ru (для ссылок)
// TELEGRAM_POLLING=1          — включить long polling (dev)
// =======================

var (
	botToken   = strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN"))
	baseAPI    = "https://api.telegram.org/bot" + botToken
	adminIDs   = parseAdmins(os.Getenv("TELEGRAM_ADMIN_CHAT_IDS"))
	siteURL    = strings.TrimRight(strings.TrimSpace(os.Getenv("PUBLIC_SITE_URL")), "/")
	usePolling = strings.TrimSpace(os.Getenv("TELEGRAM_POLLING")) == "1"
)

// хранение последнего принятого заказа для быстрой проверки
var lastOrderPayload struct {
	Payload   map[string]any `json:"payload"`
	Received  string         `json:"received_at"`
	Formatted string         `json:"formatted_preview"`
}

// Регистрируем маршруты БЕЗ зависимостей от БД (как у тебя в app.go)
func RegisterBot(rg *gin.RouterGroup) {
	if botToken == "" {
		log.Println("[bot] TELEGRAM_BOT_TOKEN пуст — бот отключён")
		return
	}

	// Telegram webhook
	rg.POST("/webhook", func(c *gin.Context) {
		var upd tgUpdate
		if err := c.BindJSON(&upd); err == nil {
			handleUpdate(upd)
		}
		c.Status(200)
	})

	// Сайт отправляет сюда заказы
	rg.POST("/order_created", func(c *gin.Context) {
		var payload map[string]any
		if err := c.BindJSON(&payload); err != nil {
			c.JSON(400, gin.H{"error": "bad json"})
			return
		}
		NotifyAdminsFromSite(payload)
		c.JSON(200, gin.H{"ok": true})
	})

	// Отладка: посмотреть, что дошло
	rg.GET("/debug/last", func(c *gin.Context) {
		if lastOrderPayload.Payload == nil {
			c.JSON(404, gin.H{"error": "no payloads yet"})
			return
		}
		c.JSON(200, lastOrderPayload)
	})

	if usePolling {
		go runPolling()
	}

	log.Printf("[bot] ready. admins=%v username=%q site=%q polling=%v",
		adminIDs, os.Getenv("TELEGRAM_BOT_USERNAME"), siteURL, usePolling)
}

/* ======================= Types ======================= */

type tgUpdate struct {
	UpdateID int `json:"update_id"`
	Message  *struct {
		MessageID int    `json:"message_id"`
		Text      string `json:"text"`
		Chat      struct {
			ID int64 `json:"id"`
		} `json:"chat"`
		From struct {
			ID       int64  `json:"id"`
			Username string `json:"username"`
		} `json:"from"`
	} `json:"message"`
}

/* ======================= Public API ======================= */

// Экспортируемая функция: её вызывает HTTP-слой, чтобы разослать заказ
func NotifyAdminsFromSite(payload map[string]any) {
	msg := formatOrderForAdmins(payload)
	lastOrderPayload.Payload = payload
	lastOrderPayload.Received = time.Now().Format(time.RFC3339)
	lastOrderPayload.Formatted = msg
	broadcastToAdmins(msg)
}

/* ======================= Update handler ======================= */

func handleUpdate(upd tgUpdate) {
	if upd.Message == nil {
		return
	}
	from := upd.Message.From
	text := strings.TrimSpace(upd.Message.Text)

	// команда админа: /to <tg_id> <текст>
	if isAdmin(from.ID) && strings.HasPrefix(text, "/to ") {
		args := strings.TrimSpace(text[4:])
		parts := strings.SplitN(args, " ", 2)
		if len(parts) < 2 {
			_ = sendText(from.ID, "Формат: /to <tg_id> <текст>")
			return
		}
		tgID, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			_ = sendText(from.ID, "tg_id должен быть числом")
			return
		}
		body := strings.TrimSpace(parts[1])
		if body == "" {
			_ = sendText(from.ID, "Пустое сообщение")
			return
		}
		if err := sendText(tgID, body); err == nil {
			_ = sendText(from.ID, "Отправлено ✅")
		}
		return
	}

	// Любой текст клиента → админам
	if text != "" {
		username := atUsername(upd.Message.From.Username)
		msg := fmt.Sprintf("✉️ <b>Сообщение от клиента</b>:\n%s\n\nПрофиль: %s (id=%d)",
			escape(text), username, from.ID)
		broadcastToAdmins(msg)
	}
}

/* ======================= Formatting ======================= */

func formatOrderForAdmins(p map[string]any) string {
	getS := func(m map[string]any, key string) string {
		if v, ok := m[key]; ok && v != nil {
			return strings.TrimSpace(fmt.Sprintf("%v", v))
		}
		return ""
	}
	getM := func(m map[string]any, key string) map[string]any {
		if v, ok := m[key]; ok && v != nil {
			if mm, ok := v.(map[string]any); ok {
				return mm
			}
		}
		return map[string]any{}
	}
	getItems := func(m map[string]any, key string) []map[string]any {
		v, ok := m[key]
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
	orDash := func(s string) string {
		if strings.TrimSpace(s) == "" {
			return "—"
		}
		return s
	}

	orderID := getS(p, "order_id")
	totalCents := getS(p, "total_cents")

	// buyer {...} + фолбэк из корня
	buyer := getM(p, "buyer")
	fullName := getS(buyer, "full_name")
	phone := getS(buyer, "phone")
	email := getS(buyer, "email")
	tg := getS(buyer, "telegram")
	if fullName == "" {
		fullName = getS(p, "full_name")
	}
	if phone == "" {
		phone = getS(p, "phone")
	}
	if email == "" {
		email = getS(p, "email")
	}
	if tg == "" {
		tg = getS(p, "telegram")
	}

	// доставка/оплата
	delivery := getM(p, "delivery")
	method := getS(delivery, "method")
	city := getS(delivery, "city")
	addr := getS(delivery, "address")
	pickup := getS(delivery, "pickup_addr")
	payMethod := getS(delivery, "payment_method")

	// согласия/комментарий
	consents := getM(p, "consents")
	consOffer := getS(consents, "offer")
	consPrivacy := getS(consents, "privacy")
	comment := getS(p, "comment")

	// первая позиция для красивого блока
	items := getItems(p, "items")
	var first map[string]any
	if len(items) > 0 {
		first = items[0]
	}
	title := getS(first, "title")
	opts := getS(first, "options") // "Red / 128GB / SIM"
	qty := getS(first, "qty")
	priceCents := getS(first, "price_cents")

	var color, memory, conn string
	if opts != "" {
		parts := strings.Split(opts, "/")
		if len(parts) > 0 {
			color = strings.TrimSpace(parts[0])
		}
		if len(parts) > 1 {
			memory = strings.TrimSpace(parts[1])
		}
		if len(parts) > 2 {
			conn = strings.TrimSpace(parts[2])
		}
	}

	// ссылки
	link := siteURL
	if link == "" {
		link = "https://t.me/" + strings.TrimPrefix(os.Getenv("TELEGRAM_BOT_USERNAME"), "@")
	}
	thankURL := ""
	if siteURL != "" && orderID != "" {
		thankURL = siteURL + "/thank-you?order=" + orderID
	}

	// сборка текста
	sb := &strings.Builder{}
	if orderID != "" {
		fmt.Fprintf(sb, "🛒 <b>Новый заказ #%s</b>\n\n", escape(orderID))
	} else {
		fmt.Fprintln(sb, "🛒 <b>Новый заказ</b>\n")
	}

	if title != "" {
		fmt.Fprintf(sb, "Товар: %s\n", escape(title))
		if color != "" {
			fmt.Fprintf(sb, "Цвет: %s\n", escape(color))
		}
		if memory != "" {
			fmt.Fprintf(sb, "Память: %s\n", escape(memory))
		}
		if conn != "" {
			fmt.Fprintf(sb, "Связь: %s\n", escape(conn))
		}
		if qty != "" {
			fmt.Fprintf(sb, "Кол-во: %s\n", escape(qty))
		}
		if priceCents != "" {
			fmt.Fprintf(sb, "Сумма: %.2f ₽\n", nzFloat(priceCents)/100)
		}
		fmt.Fprintln(sb)
	} else if totalCents != "" {
		fmt.Fprintf(sb, "<b>Сумма:</b> %.2f ₽\n\n", nzFloat(totalCents)/100)
	}

	// получатель — всегда одинаковый блок
	fmt.Fprintln(sb, "<b>Клиент</b>:")
	fmt.Fprintf(sb, "• ФИО: %s\n", escape(orDash(fullName)))
	fmt.Fprintf(sb, "• Телефон: %s\n", escape(orDash(phone)))
	fmt.Fprintf(sb, "• E-mail: %s\n", escape(orDash(email)))
	fmt.Fprintf(sb, "• Telegram: %s\n", escape(orDash(tg)))

	// доставка/оплата
	if method != "" || city != "" || addr != "" || pickup != "" || payMethod != "" {
		fmt.Fprintln(sb, "\n<b>Доставка/оплата</b>:")
		if method != "" {
			fmt.Fprintf(sb, "• Способ: %s\n", escape(method))
		}
		if city != "" {
			fmt.Fprintf(sb, "• Город: %s\n", escape(city))
		}
		if addr != "" {
			fmt.Fprintf(sb, "• Адрес: %s\n", escape(addr))
		}
		if pickup != "" {
			fmt.Fprintf(sb, "• Самовывоз: %s\n", escape(pickup))
		}
		if payMethod != "" {
			fmt.Fprintf(sb, "• Оплата: %s\n", escape(payMethod))
		}
	}

	// согласия
	if consOffer != "" || consPrivacy != "" {
		toYN := func(s string) string {
			switch strings.ToLower(strings.TrimSpace(s)) {
			case "true", "1", "yes", "да":
				return "Да"
			case "false", "0", "no", "нет":
				return "Нет"
			default:
				if s == "" {
					return "—"
				}
				return s
			}
		}
		fmt.Fprintln(sb, "\n<b>Согласия</b>:")
		fmt.Fprintf(sb, "• Оферта: %s\n", toYN(consOffer))
		fmt.Fprintf(sb, "• Политика: %s\n", toYN(consPrivacy))
	}

	if comment != "" {
		fmt.Fprintf(sb, "\n<b>Комментарий:</b>\n%s\n", escape(comment))
	}

	if thankURL != "" {
		fmt.Fprintf(sb, "\n🧾 Страница клиента: %s\n", escape(thankURL))
	} else {
		fmt.Fprintf(sb, "\n🌐 %s\n", escape(link))
	}

	fmt.Fprintln(sb, "\nОтвет клиенту: /to &lt;tg_id&gt; &lt;текст&gt;")
	return sb.String()
}

/* ======================= Telegram I/O ======================= */

func sendText(chatID int64, text string) error {
	if botToken == "" {
		return fmt.Errorf("no token")
	}
	req := map[string]any{
		"chat_id":                  chatID,
		"text":                     text,
		"parse_mode":               "HTML",
		"disable_web_page_preview": true,
	}
	return tgPOST("/sendMessage", req)
}

func broadcastToAdmins(text string) {
	for _, id := range adminIDs {
		_ = sendText(id, text)
	}
}

func tgPOST(path string, payload any) error {
	b, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, baseAPI+path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Println("[tg] http error:", err)
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var out struct {
		OK          bool            `json:"ok"`
		Description string          `json:"description"`
		Result      json.RawMessage `json:"result"`
	}
	_ = json.Unmarshal(body, &out)
	if !out.OK {
		log.Printf("[tg] api error: %s | path=%s payload=%s", out.Description, path, string(b))
		return fmt.Errorf("telegram error: %s", out.Description)
	}
	return nil
}

/* ======================= Utils ======================= */

func parseAdmins(raw string) []int64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	var ids []int64
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if v, err := strconv.ParseInt(p, 10, 64); err == nil {
			ids = append(ids, v)
		}
	}
	return ids
}

func isAdmin(uid int64) bool {
	for _, id := range adminIDs {
		if id == uid {
			return true
		}
	}
	return false
}

func atUsername(u string) string {
	if u == "" {
		return "(без username)"
	}
	if strings.HasPrefix(u, "@") {
		return u
	}
	return "@" + u
}

func escape(s string) string {
	r := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;")
	return r.Replace(s)
}

func nzFloat(s string) float64 {
	if s == "" {
		return 0
	}
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

/* ======================= Polling (dev) ======================= */

func runPolling() {
	if botToken == "" {
		return
	}
	log.Println("[bot] polling: start")
	offset := 0
	for {
		time.Sleep(900 * time.Millisecond)
		resp, err := http.Get(fmt.Sprintf("%s/getUpdates?timeout=30&offset=%d&allowed_updates=%s",
			baseAPI, offset, `%5B%22message%22%5D`))
		if err != nil {
			time.Sleep(1500 * time.Millisecond)
			continue
		}
		b, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		var obj struct {
			OK     bool       `json:"ok"`
			Result []tgUpdate `json:"result"`
		}
		if err := json.Unmarshal(b, &obj); err != nil || !obj.OK {
			time.Sleep(1200 * time.Millisecond)
			continue
		}
		for _, up := range obj.Result {
			offset = up.UpdateID + 1
			handleUpdate(up)
		}
	}
}
