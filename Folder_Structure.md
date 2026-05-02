# BolKe — Folder Structure

**Version:** 1.0
**Last Updated:** May 2026

This document defines the canonical directory structure for the BolKe monorepo. Every new file must have a clear, predictable home.

---

## 1. Top-Level Layout

```
bolke/
├── apps/
│   ├── android/                  # Native Android app (Kotlin)
│   └── backend/                  # Node.js + Fastify API gateway
├── packages/
│   ├── shared-types/             # TS types shared by backend + tools
│   ├── prompts/                  # Versioned Claude system prompts
│   └── i18n/                     # Translation strings + voice scripts
├── workflows/
│   └── n8n/                      # Exported n8n JSON workflows (versioned)
├── infra/
│   ├── docker/                   # Dockerfiles for backend + n8n
│   ├── cloud-run/                # Cloud Run service YAMLs
│   └── supabase/                 # SQL migrations, RLS policies
├── docs/                         # All product / engineering docs
│   ├── PRD.md
│   ├── architecture.md
│   ├── design.md
│   ├── tech_stack.md
│   ├── Folder_Structure.md       # this file
│   ├── Model_&_API.md
│   └── adr/                      # Architecture Decision Records
├── scripts/                      # One-off ops scripts (bash + node)
├── .github/
│   └── workflows/                # GitHub Actions CI/CD pipelines
├── .gitignore
├── .editorconfig
├── package.json                  # Workspaces root (pnpm)
├── pnpm-workspace.yaml
├── README.md
└── LICENSE
```

---

## 2. `apps/android/` — Native Android App

```
apps/android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/bolke/app/
│   │   │   │   ├── BolKeApplication.kt
│   │   │   │   ├── di/                    # Koin modules
│   │   │   │   │   ├── AppModule.kt
│   │   │   │   │   ├── NetworkModule.kt
│   │   │   │   │   └── DatabaseModule.kt
│   │   │   │   ├── data/
│   │   │   │   │   ├── api/               # Ktor service interfaces
│   │   │   │   │   │   ├── BolKeApi.kt
│   │   │   │   │   │   └── dto/           # request/response DTOs
│   │   │   │   │   ├── local/             # Room DB
│   │   │   │   │   │   ├── BolKeDatabase.kt
│   │   │   │   │   │   ├── dao/
│   │   │   │   │   │   └── entity/
│   │   │   │   │   └── repository/
│   │   │   │   │       ├── VoiceRepository.kt
│   │   │   │   │       └── AuthRepository.kt
│   │   │   │   ├── domain/
│   │   │   │   │   ├── model/             # Pure Kotlin domain models
│   │   │   │   │   └── usecase/
│   │   │   │   │       ├── SubmitVoiceQueryUseCase.kt
│   │   │   │   │       ├── PlayTtsUseCase.kt
│   │   │   │   │       └── DetectLanguageUseCase.kt
│   │   │   │   ├── audio/
│   │   │   │   │   ├── AudioRecorder.kt   # MediaRecorder wrapper
│   │   │   │   │   ├── OpusEncoder.kt
│   │   │   │   │   └── TtsPlayer.kt       # ExoPlayer wrapper
│   │   │   │   ├── offline/
│   │   │   │   │   └── VoskFallbackStt.kt # On-device offline STT
│   │   │   │   └── ui/
│   │   │   │       ├── theme/             # Compose colors, typography
│   │   │   │       │   ├── Color.kt
│   │   │   │       │   ├── Type.kt
│   │   │   │       │   └── Theme.kt
│   │   │   │       ├── components/
│   │   │   │       │   ├── MicButton.kt
│   │   │   │       │   ├── LottieIcon.kt
│   │   │   │       │   └── ActionButton.kt
│   │   │   │       └── screens/
│   │   │   │           ├── splash/
│   │   │   │           ├── auth/
│   │   │   │           ├── home/
│   │   │   │           │   ├── HomeScreen.kt
│   │   │   │           │   └── HomeViewModel.kt
│   │   │   │           ├── listening/
│   │   │   │           ├── reply/
│   │   │   │           ├── action_confirm/
│   │   │   │           ├── failure/
│   │   │   │           └── settings/
│   │   │   ├── res/
│   │   │   │   ├── drawable/
│   │   │   │   ├── raw/                   # Lottie .json files
│   │   │   │   │   ├── mic_pulse.json
│   │   │   │   │   ├── icon_hospital.json
│   │   │   │   │   ├── icon_ration.json
│   │   │   │   │   └── ...
│   │   │   │   ├── values/
│   │   │   │   │   └── strings.xml        # Default (English) — minimal
│   │   │   │   ├── values-hi/
│   │   │   │   │   └── strings.xml        # Hindi
│   │   │   │   ├── values-kn/             # Kannada
│   │   │   │   ├── values-ta/             # Tamil
│   │   │   │   ├── values-te/             # Telugu
│   │   │   │   ├── values-bn/             # Bengali
│   │   │   │   └── values-mr/             # Marathi
│   │   │   └── AndroidManifest.xml
│   │   ├── test/                          # JVM unit tests
│   │   │   └── java/com/bolke/app/
│   │   └── androidTest/                   # Instrumented tests
│   │       └── java/com/bolke/app/
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── gradle/
├── build.gradle.kts                       # root
├── settings.gradle.kts
├── gradle.properties
└── README.md
```

### Conventions
- **Package:** `com.bolke.app.<layer>`
- **One Compose screen = one folder** containing `Screen.kt`, `ViewModel.kt`, `State.kt`.
- **Lottie files** live in `res/raw/` only.
- **Localization:** every user-facing string in `strings.xml`; never hard-coded.

---

## 3. `apps/backend/` — Node.js API Gateway

```
apps/backend/
├── src/
│   ├── server.ts                          # Fastify bootstrap
│   ├── config/
│   │   ├── env.ts                         # zod-validated env
│   │   └── constants.ts
│   ├── routes/
│   │   ├── voice.ts                       # POST /v1/voice
│   │   ├── auth.ts                        # OTP routes
│   │   ├── action.ts                      # POST /v1/action/:intent
│   │   └── health.ts
│   ├── services/
│   │   ├── claude/
│   │   │   ├── client.ts                  # Anthropic SDK wrapper
│   │   │   ├── prompts.ts                 # imports from packages/prompts
│   │   │   └── parser.ts                  # JSON validation
│   │   ├── stt/
│   │   │   └── googleStt.ts
│   │   ├── tts/
│   │   │   ├── googleTts.ts
│   │   │   └── elevenLabsTts.ts
│   │   ├── n8n/
│   │   │   └── webhookClient.ts
│   │   ├── sms/
│   │   │   ├── msg91.ts
│   │   │   └── twilio.ts
│   │   └── digilocker/
│   │       └── oauth.ts
│   ├── repositories/
│   │   ├── userRepository.ts
│   │   ├── queryLogRepository.ts
│   │   └── audioRepository.ts
│   ├── middleware/
│   │   ├── auth.ts                        # JWT verification
│   │   ├── rateLimit.ts
│   │   └── errorHandler.ts
│   ├── utils/
│   │   ├── logger.ts                      # pino setup
│   │   ├── retry.ts
│   │   └── audio.ts                       # opus/PCM helpers
│   └── types/
│       ├── api.ts
│       └── claude.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── Dockerfile
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### Conventions
- Everything async returns a typed `Result<T, E>` to avoid try/catch churn.
- No business logic in `routes/` — they are thin controllers.
- `services/<provider>/` always exposes a single client + a parser.
- `repositories/` is the only layer that talks to Supabase.

---

## 4. `packages/` — Shared code

### 4.1 `packages/shared-types/`
TypeScript interfaces shared by backend, tooling, and integration tests.

```
packages/shared-types/
├── src/
│   ├── claude.ts          # ClaudeResponse, IntentSchema (zod)
│   ├── api.ts             # request/response shapes
│   └── index.ts
├── package.json
└── tsconfig.json
```

### 4.2 `packages/prompts/`
Versioned, hash-pinned Claude system prompts.

```
packages/prompts/
├── src/
│   ├── system_v1.md       # MVP system prompt
│   ├── system_v2.md       # next iteration (A/B)
│   ├── few_shot/
│   │   ├── ration.json
│   │   ├── hospital.json
│   │   └── pension.json
│   └── index.ts           # exports + version pinning
├── tests/
│   └── golden/            # golden test fixtures
└── package.json
```

### 4.3 `packages/i18n/`
Translation strings + voice scripts in YAML.

```
packages/i18n/
├── strings/
│   ├── hi.yaml
│   ├── kn.yaml
│   ├── ta.yaml
│   ├── te.yaml
│   ├── bn.yaml
│   ├── mr.yaml
│   └── en.yaml            # source of truth
├── voice_scripts/
│   ├── onboarding.yaml
│   ├── failures.yaml
│   └── confirmations.yaml
└── tools/
    └── sync_to_android.ts # generates strings.xml per locale
```

---

## 5. `workflows/n8n/`

```
workflows/n8n/
├── digilocker_fetch.json
├── pds_ration_status.json
├── pmjay_hospital_lookup.json
├── sms_confirm.json
├── failure_notify.json
└── README.md            # how to import/export from n8n UI
```

Each `.json` is a full n8n workflow export, version-controlled. CI verifies they import cleanly into a fresh n8n instance.

---

## 6. `infra/`

```
infra/
├── docker/
│   ├── backend.Dockerfile
│   └── n8n.Dockerfile
├── cloud-run/
│   ├── backend-prod.yaml
│   ├── backend-staging.yaml
│   └── backend-dev.yaml
└── supabase/
    ├── migrations/
    │   ├── 20260101_init.sql
    │   ├── 20260115_add_query_logs.sql
    │   └── ...
    ├── seed/
    │   └── intents_seed.sql
    └── policies/
        └── rls_policies.sql
```

---

## 7. `docs/`

```
docs/
├── PRD.md
├── architecture.md
├── design.md
├── tech_stack.md
├── Folder_Structure.md
├── Model_&_API.md
├── adr/
│   ├── 0001-claude-haiku-over-gpt4o.md
│   ├── 0002-n8n-orchestrator.md
│   ├── 0003-supabase-as-data-layer.md
│   └── ...
└── runbooks/
    ├── on_call.md
    ├── claude_outage.md
    └── stt_quota_exceeded.md
```

---

## 8. `scripts/`

```
scripts/
├── ops/
│   ├── purge_old_audio.ts        # 24h TTL enforcement
│   ├── backup_supabase.sh
│   └── rotate_jwt_secret.ts
├── analytics/
│   ├── intent_distribution.sql
│   └── cost_report.ts
└── dev/
    ├── seed_test_user.ts
    └── replay_voice_query.ts
```

---

## 9. `.github/workflows/`

```
.github/workflows/
├── android-ci.yml
├── android-release.yml
├── backend-ci.yml
├── backend-deploy.yml
├── docs-lint.yml
└── n8n-validate.yml
```

---

## 10. Naming Conventions

| Concern | Convention |
|---------|------------|
| Kotlin files | PascalCase, one class per file |
| TypeScript files | kebab-case for utilities, camelCase for services |
| SQL migrations | `YYYYMMDD_<short_description>.sql` |
| n8n workflows | `<intent_name>.json`, snake_case |
| Lottie files | `<category>_<name>.json` (e.g. `icon_hospital.json`) |
| ADRs | `<id-zero-padded>-<kebab-title>.md` |
| Branches | `feat/`, `fix/`, `docs/`, `chore/` prefixes |
| Commits | Conventional Commits (`feat:`, `fix:`, etc.) |

---

## 11. Where things go (decision table)

| What | Goes in |
|------|---------|
| New Claude system prompt | `packages/prompts/src/` (with version) |
| New government API integration | `workflows/n8n/<intent>.json` + n8n service in `apps/backend/src/services/n8n/` |
| New Lottie icon | `apps/android/app/src/main/res/raw/` + reference in `design.md` |
| New language | `packages/i18n/strings/<lang>.yaml` + Android `values-<lang>/` + add to STT/TTS allow-list |
| New API endpoint | `apps/backend/src/routes/` (thin) → service → repository |
| New ADR | `docs/adr/<id>-<title>.md` |
| Hot-fix runbook | `docs/runbooks/<scenario>.md` |
| Database change | `infra/supabase/migrations/<date>_<change>.sql` |

---

## 12. What does NOT belong in this repo

- Production secrets — live only in Doppler.
- User audio recordings — stored in Supabase Storage with TTL.
- Build artifacts (.apk, .aab, dist/) — gitignored.
- Personal IDE configs (.idea/, .vscode/) — except shared `settings.json` in `.vscode/`.
