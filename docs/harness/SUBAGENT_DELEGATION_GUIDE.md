---
role: reference
portability: portable
---

# Subagent Delegation Guide — 효율 분석 및 권장 전략

> 기준 데이터: `spec-doc-management` Phase A·B (2026-05-20)
> 본 문서는 `design-rule.md §6 Footnote 4` (harness-improve-v1) 의 출처. 발효일: `<merge-commit-iso8601>` (미발효 — 머지 후 1줄 follow-up commit 으로 채움).

---

## 1. Phase별 실측 지표

| Phase | 소요 시간 | 토큰 | Tool 호출 | 서브에이전트 태스크 |
|---|---|---|---|---|
| A — Hook 경로 패턴 변경 | 218초 | 37,123 | 50 | hook 3개 수정 + 테스트 업데이트 + hooks:test |
| B — 문서 4중 동기 + 마이그레이션 | 208초 | 62,499 | 54 | docs 다수 파일 경로 치환 + CLAUDE.md |

---

## 2. 비용 원인 분석

### Phase A 원인

| 원인 | 내용 | 비용 기여 |
|---|---|---|
| Cold-start 파일 읽기 | 서브에이전트가 hook 파일 3개 + test 파일 + 관련 docs 전부 재탐색 | 토큰 ↑ |
| hooks:test 반복 실행 | 변경 전 베이스라인 + 변경 후 검증 = 2회 이상 | 시간 ↑ |
| grep 이스케이프 문제 | JS 정규식 `docs\/spec\/` → grep 패턴 불일치 → Python repr() 우회 필요 | Tool 호출 ↑ |
| 서브에이전트 context 부팅 | 매 서브에이전트 호출마다 전체 harness context 재로드 | 토큰 ↑ |

### Phase B 원인

| 원인 | 내용 | 비용 기여 |
|---|---|---|
| 대용량 harness 문서 읽기 | PLAYBOOK, GLOSSARY, HANDOFF_TEMPLATE 등 전체 읽기 | 토큰 ↑↑ |
| CLAUDE.md 권한 차단 | 서브에이전트 차단 → 메인 에이전트 별도 처리 필요 | Tool 호출 ↑ |
| 사전 grep 없이 작업 목록 작성 | 영향 파일 15개 예상 → 실제 26개 → 인수조건 단계에서 13개 추가 발견 | 시간 ↑↑ |
| 잘못된 도구 선택 | 단순 문자열 치환에 서브에이전트 Edit 반복 사용 (sed -i 배치 대비 비효율) | Tool 호출 ↑↑ |

---

## 3. 작업 유형별 위임 전략

| 작업 유형 | 현재 접근 | 권장 접근 | 예상 절감 |
|---|---|---|---|
| 단순 문자열 치환 (다수 파일, 동일 패턴) | 서브에이전트 Edit 반복 | 메인 에이전트 `sed -i` 배치 | Tool 호출 50~70% ↓ |
| 로직 변경 + 테스트 검증 (소수 파일) | 서브에이전트 | 서브에이전트 유지 | — |
| 대용량 문서 일괄 동기 | 서브에이전트 전체 읽기 | `sed -i` + 메인 grep 검증 | 토큰 40~60% ↓ |
| 권한 보호 파일 포함 작업 | 서브에이전트 → 차단 → 메인 보완 | 처음부터 메인 직접 처리 | 시간 ↓, 차단 제거 |

### 단순 치환 시 권장 패턴

```bash
# 영향 파일 사전 열거 (s2 Phase Contract 작성 전 반드시 실행)
grep -rl 'docs/feat_' . --include='*.md' --include='*.mjs' --include='*.json'

# 배치 치환
grep -rl 'docs/feat_' . --include='*.md' | xargs sed -i 's|docs/feat_|docs/spec/|g'

# 검증
grep -r 'docs/feat_' . --include='*.md' | wc -l  # → 0이면 완료
```

---

## 4. s2 Phase Contract 서브에이전트 스코프 템플릿 보강

Phase B 서브에이전트 스코프에 다음 항목을 추가한다:

```markdown
### 서브에이전트 스코프 (Phase B 예시)

**위임 대상**: 로직 변경이 필요한 파일 (Edit + 검증 필요)
**메인 직접 처리**: 
  - `.claude/CLAUDE.md` (권한 보호 파일)
  - 단순 경로 치환 대상 파일 (sed -i 배치 적용)
**사전 실행 의무**: `grep -rl '{치환 패턴}'` 전체 파일 목록 확정 후 스코프 작성
```

---

## 5. 영향 파일 표 작성 절차 (s1/s2 개선)

s1 §영향 파일 표 또는 s2 Phase Contract 작업 목록 작성 전:

1. `grep -rl '<대상 패턴>'` 실행 → 전체 파일 목록 확정
2. 목록 기준으로 작업 유형 분류 (단순 치환 / 로직 변경 / 권한 보호)
3. 분류에 따라 위임 전략 결정 (위 §3 참조)

> 이 절차를 생략하면 인수조건 grep 단계에서 추가 파일이 발견되어 Phase 재작업이 발생한다.

---

## 6. Self-application 회귀 체크리스트

harness 인프라 자체를 변경하는 feature (경로 변경, 템플릿 수정 등):

- [ ] s1 §에스컬레이트 조건에 "harness-entry grandfathered 진입 필요 여부" 항목 추가
- [ ] Phase B 서브에이전트 스코프에 `.claude/CLAUDE.md` 메인 직접 처리 명시
- [ ] `/harness-start` Readiness Validation 전에 새 경로로 s1/s2가 이미 위치하는지 확인
- [ ] harness-entry SKILL 자체도 Phase B 영향 파일 목록에 포함

---

## 7. 요약 — 핵심 개선 원칙

1. **사전 grep 의무화**: 영향 파일 표 작성 전 `grep -rl` 실행해 전체 목록 확정.
2. **도구 매칭**: 단순 치환 → `sed -i` 배치, 로직 변경 → 서브에이전트.
3. **권한 파일 식별**: 서브에이전트 스코프 작성 시 권한 보호 파일 사전 식별 → 메인 직접 처리.
4. **Self-application 표준화**: harness 인프라 변경 feature는 grandfathered 진입 경로를 s1에 사전 명시.
