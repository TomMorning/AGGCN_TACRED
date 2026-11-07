package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"archprobe/backend/internal/agent"
	"archprobe/backend/internal/config"
	"archprobe/backend/internal/model"
	"archprobe/backend/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Handlers struct {
	cfg    config.Config
	store  *store.Store
	orch   *agent.Orchestrator
	memory *agent.MemoryEngine
}

func NewHandlers(cfg config.Config, st *store.Store, orch *agent.Orchestrator, mem *agent.MemoryEngine) *Handlers {
	return &Handlers{cfg: cfg, store: st, orch: orch, memory: mem}
}

func (h *Handlers) demoUser() uuid.UUID {
	id, err := uuid.Parse(h.cfg.DemoUserID)
	if err != nil {
		return uuid.MustParse("00000000-0000-4000-8000-000000000001")
	}
	return id
}

func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	status := map[string]string{"status": "ok"}
	if err := h.store.Health(r.Context()); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "degraded", "error": err.Error()})
		return
	}
	_ = json.NewEncoder(w).Encode(status)
}

func (h *Handlers) ListScenarios(w http.ResponseWriter, r *http.Request) {
	userID := h.demoUser()
	scenarios, err := h.store.ListScenarios(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	pass, err := h.memory.PassProbability(r.Context(), userID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	quota, err := h.store.EnsureQuota(r.Context(), userID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	_ = json.NewEncoder(w).Encode(model.ScenariosResponse{
		Scenarios:       scenarios,
		PassProbability: pass,
		Quota:           quota,
	})
}

func (h *Handlers) GetScenario(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	sc, err := h.store.GetScenarioBySlug(r.Context(), slug)
	if errors.Is(err, store.ErrNotFound) {
		writeErr(w, http.StatusNotFound, err)
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	_ = json.NewEncoder(w).Encode(sc)
}

func (h *Handlers) StartInterview(w http.ResponseWriter, r *http.Request) {
	var req model.StartInterviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}

	var sc *model.Scenario
	var err error
	if req.Slug != "" {
		sc, err = h.store.GetScenarioBySlug(r.Context(), req.Slug)
	} else if req.ScenarioID != "" {
		id, parseErr := uuid.Parse(req.ScenarioID)
		if parseErr != nil {
			writeErr(w, http.StatusBadRequest, parseErr)
			return
		}
		sc, err = h.store.GetScenarioByID(r.Context(), id)
	} else {
		writeErr(w, http.StatusBadRequest, errors.New("scenario_id or slug required"))
		return
	}
	if errors.Is(err, store.ErrNotFound) {
		writeErr(w, http.StatusNotFound, err)
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}

	sess, err := h.store.StartInterview(r.Context(), h.demoUser(), sc.ID, sc.IsFree)
	if errors.Is(err, store.ErrQuotaExceeded) {
		writeErr(w, http.StatusPaymentRequired, err)
		return
	}
	if errors.Is(err, store.ErrProRequired) {
		writeErr(w, http.StatusPaymentRequired, err)
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	sess.Scenario = sc

	opening := "Staff Engineer online. Round 1/3 — High-level design. Walk the data plane, control plane, and the single hardest consistency/latency trade-off. No buzzword salad."
	sess.Transcript = append(sess.Transcript, model.TranscriptEntry{
		Role:        "interviewer",
		Content:     opening,
		Round:       1,
		MermaidCode: sc.ReferenceMermaid,
	})
	_ = h.store.UpdateSession(r.Context(), sess)

	_ = json.NewEncoder(w).Encode(sess)
}

func (h *Handlers) SubmitAnswer(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	var req model.SubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	if len(req.Answer) < 20 {
		writeErr(w, http.StatusBadRequest, errors.New("answer too short — defend the architecture in more detail"))
		return
	}

	sess, err := h.store.GetSession(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeErr(w, http.StatusNotFound, err)
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	if sess.Status != "in_progress" {
		writeErr(w, http.StatusConflict, errors.New("session already completed"))
		return
	}

	sc, err := h.store.GetScenarioByID(r.Context(), sess.ScenarioID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}

	resp, err := h.orch.ProcessTurn(r.Context(), sess, sc, req.Answer)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *Handlers) GetSession(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	sess, err := h.store.GetSession(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeErr(w, http.StatusNotFound, err)
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	sc, err := h.store.GetScenarioByID(r.Context(), sess.ScenarioID)
	if err == nil {
		sess.Scenario = sc
	}
	_ = json.NewEncoder(w).Encode(sess)
}

func (h *Handlers) Dashboard(w http.ResponseWriter, r *http.Request) {
	dash, err := h.memory.Dashboard(r.Context(), h.demoUser())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	_ = json.NewEncoder(w).Encode(dash)
}

func (h *Handlers) BillingWebhook(w http.ResponseWriter, r *http.Request) {
	var req model.BillingWebhookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	secret := r.Header.Get("X-Billing-Secret")
	if secret == "" {
		secret = req.Secret
	}
	if secret != h.cfg.BillingWebhookSecret {
		writeErr(w, http.StatusUnauthorized, errors.New("invalid webhook signature"))
		return
	}
	userID := h.demoUser()
	if req.UserID != "" {
		parsed, err := uuid.Parse(req.UserID)
		if err != nil {
			writeErr(w, http.StatusBadRequest, err)
			return
		}
		userID = parsed
	}
	tier := req.PlanTier
	if tier == "" {
		tier = "pro"
	}
	if err := h.store.UpgradePlan(r.Context(), userID, tier); err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	quota, err := h.store.GetQuota(r.Context(), userID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	_ = json.NewEncoder(w).Encode(quota)
}

func writeErr(w http.ResponseWriter, code int, err error) {
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
}
