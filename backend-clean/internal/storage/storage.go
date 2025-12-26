package storage

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"
)

type Local struct{ dir string }
func NewLocal(dir string) *Local { return &Local{dir: dir} }

func (l *Local) SaveImage(file *multipart.FileHeader) (string, error) {
	name := fmt.Sprintf("%d_%s", time.Now().UnixNano(), filepath.Base(file.Filename))
	path := filepath.Join(l.dir, name)
	if err := os.MkdirAll(l.dir, 0o755); err != nil { return "", err }
	if err := save(file, path); err != nil { return "", err }
	return "/media/" + name, nil
}

func save(h *multipart.FileHeader, dst string) error {
	f, err := h.Open(); if err != nil { return err }
	defer f.Close()
	out, err := os.Create(dst); if err != nil { return err }
	defer out.Close()
	_, err = out.ReadFrom(f); return err
}