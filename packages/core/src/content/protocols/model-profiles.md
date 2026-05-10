# Model Profiles

Agent model assignments configured per-project ∈ `.tff/settings.yaml`.

## Default Profiles

### Quality Profile

Used for: brainstormer, architect, code-reviewer, security-auditor
Default model: {{quality-model}}

### Balanced Profile

Used for: product-lead, tester
Default model: {{balanced-model}}

### Budget Profile

Used for: frontend-dev, backend-dev, devops, fixer
Default model: {{balanced-model}}

## Configuration

∈ `.tff/settings.yaml`:

```yaml
model-profiles:
  quality:
    model: { { quality-model } }
  balanced:
    model: { { balanced-model } }
  budget:
    model: { { balanced-model } }
```

## Agent → Profile Mapping

| Agent                | Profile  |
| -------------------- | -------- |
| tff-brainstormer     | quality  |
| tff-architect        | quality  |
| tff-code-reviewer    | quality  |
| tff-security-auditor | quality  |
| tff-product-lead     | balanced |
| tff-tester           | balanced |
| tff-frontend-dev     | budget   |
| tff-backend-dev      | budget   |
| tff-devops           | budget   |
| tff-fixer            | budget   |
