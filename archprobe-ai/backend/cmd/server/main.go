package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"archprobe/backend/internal/agent"
	"archprobe/backend/internal/api"
	"archprobe/backend/internal/config"
	"archprobe/backend/internal/store"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	st, err := store.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("postgres: %v", err)
	}
	defer st.Close()

	if rdb, err := store.NewRedis(cfg.RedisURL); err != nil {
		log.Printf("redis parse warning: %v (continuing with in-process rate limits)", err)
	} else if err := rdb.Ping(ctx); err != nil {
		log.Printf("redis unavailable: %v (continuing with in-process rate limits)", err)
		_ = rdb.Close()
	} else {
		log.Printf("redis connected")
		defer rdb.Close()
	}

	mem := agent.NewMemoryEngine(st)
	orch := agent.NewOrchestrator(cfg, st, mem)
	router := api.NewRouter(cfg, st, orch, mem)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("ArchProbe AI gateway listening on :%s (DeepSeek model=%s)", cfg.Port, cfg.LLMModelProber)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	log.Println("shutdown complete")
}
