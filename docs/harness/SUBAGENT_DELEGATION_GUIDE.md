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

### subagent-dispatch-tuning Footnote 5 게이트 (제안 2)

§3 작업 유형 매핑은 거친 가이드이며, 위임 결정은 Sub-agent Dispatch Policy (`9cc1bd52-SKILL.md`) 게이트로 한 번 더 검증한다. s2 Phase Contract 서브에이전트 스코프 3신규 필드(mode / trigger 매칭 근거 / Hard Constraint 통과 증거) 작성 시 참조.

**Dispatch Trigger 3종** (이 중 하나에 명확히 매칭되어야 sub-agent 위임 허용):

| Trigger | 조건 (모두 충족) | mode 값 |
|---|---|---|
| **T1** — 대규모 read-only 탐색 | 순수 조회 / 결과량 ≥ 5KB 컨텍스트 점유 / 메인은 결론만 필요 | `subagent:T1` |
| **T2** — 명세 확정 독립 모듈 병렬 구현 | 3개 이상 모듈 / 모듈 간 의존성 없음 / 인터페이스 메인에서 확정 / 결정 권한 불필요 | `subagent:T2` |
| **T3** — 노이즈 큰 검증 | 출력 로그 길고 노이즈 많음 / 메인은 PASS/FAIL + 핵심 실패만 필요 | `subagent:T3` |

**Hard Constraint** (다음 중 하나라도 해당하면 위임 금지, `mode: main` 강제):

- 스펙 해석·구현 계획 수립
- 아키텍처·설계 결정 / 후속 단계 입력이 되는 중간 결정
- 사용자 확인 루프 필요한 단계
- 메인이 이미 로드한 컨텍스트로 처리 가능
- **5턴 이내로 끝나는 작업** (단일 Write 위임이 이 케이스 — Footnote 5 본문 완화로 ≥50K char 안전망만 유지)
- 상호 의존 다중 파일 수정
- 방금 작성·수정한 코드의 검토·개선
- 디버깅·원인 추적

§3 표의 "로직 변경 + 테스트 검증 (소수 파일) → 서브에이전트" 매핑은 위 Hard Constraint("5턴 이내 작업"·"방금 작성한 코드"·"디버깅") 확인 후에만 적용. 자동 위임 아님.

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
