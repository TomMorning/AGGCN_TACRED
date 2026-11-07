package api

import (
	"net/http"
	"time"

	"archprobe/backend/internal/agent"
	"archprobe/backend/internal/config"
	"archprobe/backend/internal/store"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func NewRouter(cfg config.Config, st *store.Store, orch *agent.Orchestrator, mem *agent.MemoryEngine) http.Handler {
	h := NewHandlers(cfg, st, orch, mem)
	rl := NewRateLimiter(cfg.RateLimitRPS, cfg.RateLimitBurst)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(120 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000", "*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Billing-Secret"},
		AllowCredentials: false,
		MaxAge:           300,
	}))
	r.Use(rl.Middleware)

	r.Get("/healthz", h.Health)

	r.Route("/api", func(api chi.Router) {
		api.Get("/scenarios", h.ListScenarios)
		api.Get("/scenarios/{slug}", h.GetScenario)
		api.Post("/interviews/start", h.StartInterview)
		api.Get("/interviews/{id}", h.GetSession)
		api.Post("/interviews/{id}/submit", h.SubmitAnswer)
		api.Get("/dashboard/memory", h.Dashboard)
		api.Post("/webhooks/billing", h.BillingWebhook)
	})

	return r
}
