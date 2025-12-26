package util

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

type Pagination struct { Limit, Offset int }

func ParsePagination(c *gin.Context) Pagination {
	lim, off := 20, 0
	if v := c.Query("limit"); v != "" { _, _ = fmt.Sscanf(v, "%d", &lim) }
	if v := c.Query("offset"); v != "" { _, _ = fmt.Sscanf(v, "%d", &off) }
	return Pagination{Limit: lim, Offset: off}
}