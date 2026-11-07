package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                 string
	DatabaseURL          string
	RedisURL             string
	LLMBaseURL           string
	LLMAPIKey            string
	LLMModelProber       string
	LLMModelEvaluator    string
	DemoUserID           string
	BillingWebhookSecret string
	RateLimitRPS         float64
	RateLimitBurst       int
	RedisEnabled         bool
}

func Load() Config {
	_ = godotenv.Load()
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("../../.env")

	return Config{
		Port:                 getEnv("PORT", "8080"),
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/archprobe?sslmode=disable"),
		RedisURL:             getEnv("REDIS_URL", "redis://localhost:6379/0"),
		LLMBaseURL:           getEnv("LLM_BASE_URL", "https://api.deepseek.com/v1"),
		LLMAPIKey:            getEnv("LLM_API_KEY", ""),
		LLMModelProber:       getEnv("LLM_MODEL_PROBER", "deepseek-chat"),
		LLMModelEvaluator:    getEnv("LLM_MODEL_EVALUATOR", "deepseek-chat"),
		DemoUserID:           getEnv("DEMO_USER_ID", "00000000-0000-4000-8000-000000000001"),
		BillingWebhookSecret: getEnv("BILLING_WEBHOOK_SECRET", "whsec_test_secret"),
		RateLimitRPS:         getEnvFloat("RATE_LIMIT_RPS", 5),
		RateLimitBurst:       getEnvInt("RATE_LIMIT_BURST", 10),
		RedisEnabled:         true,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
