# 작업 로그

작업 및 커밋 기록 (시간대별, KST).

## 2026-06-06

### 23:03 ~ 23:10 — 프로젝트 스켈레톤

- `create-tauri-app`(react-ts 템플릿)으로 Tauri 2 + React 19 + TypeScript + Vite 7 스캐폴드
- Tailwind CSS v4(`@tailwindcss/vite`) 설정, shadcn/ui 초기화(radix base, nova 프리셋)
  — button/input/card 추가, `@` path alias 구성
- /simplify 적용: 불필요한 React import·async 래퍼 제거, 미사용 react.svg 삭제,
  shadcn CLI를 devDependencies로 이동, 템플릿 잔재 이름(`tauri-app`)을
  `tauri-tree-file-explorer`로 통일 (package.json / tauri.conf.json / Cargo 크레이트)
- GitHub 공개 저장소 생성(`yoophi/tauri-tree-file-explorer`), origin 설정, push
- **커밋** `523bfbe` *Initial skeleton: Tauri 2 + React 19 + TypeScript + Vite 7 + shadcn/ui*

### 23:2x ~ 24:00 — 파일 탐색기 구현

- 긱뉴스(news.hada.io/topic?id=30191)에서 소개된 라이브러리 식별: Pierre의
  **`@pierre/trees`** (VSCode 스타일 가상화 파일 트리) — npm 패키지를 내려받아 API 분석
- 세로 2-column 레이아웃(180px | \*): 좌측 폴더 트리, 우측 선택 폴더의 파일 목록
- 상태관리 구성: react-router(`?path=` search param이 선택 폴더의 single source of
  truth, hash router), react-query(`list_dir` invoke 캐싱, `[path, showHidden]` 키),
  zustand(숨김 파일 토글)
- Rust 커맨드 `home_dir`, `list_dir`(symlink 인지, 폴더 우선 정렬) — greet 데모 제거
- Feature-Sliced Design으로 프런트엔드 구성 (app/pages/widgets/features/entities/shared)

## 2026-06-07

### 00:0x ~ 00:30 — 트리 선택 하이라이트 버그 수정 (3중 원인)

- **버그 1**: 자식 폴더 선택 시 상위 폴더 하이라이트가 남음 → 헤드리스 재현으로
  `item.select()`가 additive(누적 선택)임을 확인, 단일 하이라이트 동기화 로직 추가
- **버그 2**: folded 폴더 클릭 시 행이 `Projects / alpha`로 합쳐지며 하이라이트 소실
  → 단일 자식 체인 평탄화가 원인, `flattenEmptyDirectories: false`
- **버그 3**: URL↔트리 동기화 무한 핑퐁 — react-router의 `setSearchParams`와
  `useFileTreeSelection`이 렌더마다 새 참조를 반환해 effect가 stale 값으로 재발화
  → 트리→라우트 방향을 **이벤트 기반(`onSelectionChange` + ref)** 으로 재구성
- Tauri IPC를 모킹한 브라우저 테스트 하니스(test.html + src/test-main.tsx) 제작,
  5개 시나리오(folded 클릭/단일 자식/파일 목록 경유/뒤로가기/콘솔 에러 0) 검증
- **커밋** `cc764f0` *Add folder-tree file explorer (FSD, @pierre/trees,
  react-query/zustand/router)*

### 00:30 ~ 00:33 — 분할 경계 리사이즈

- shadcn resizable(react-resizable-panels v4) 도입 — 트리 패널 기본 180px
  (min 120px / max 50%), 드래그 리사이즈, localStorage 레이아웃 보존
- /simplify: 미사용 `fileSystemKeys` export 제거, Rust 정렬을
  `sort_by_cached_key`로 개선
- 포인터 이벤트 시뮬레이션으로 드래그·보존 검증
- **커밋** `1887a6f` *Make the tree/file-list split resizable; /simplify cleanups*

### 00:4x ~ 00:57 — pnpm 모노레포 전환

- 설계 문서 작성: `docs/pnpm-monorepo-migration.md` (스코프 `@yoophi/*`,
  소스 패키지 전략 결정)
- 앱을 `apps/desktop`으로 이동, 재사용 UI를 패키지로 분리:
  - `@yoophi/explorer-core` — FileEntry 타입 + 포매터 (의존성 0)
  - `@yoophi/ui` — shadcn 프리미티브 + cn + 테마 globals.css
  - `@yoophi/file-tree` — 제어 컴포넌트 `<FolderTree>` (선택 동기화 규칙 내장,
    경계는 절대경로만)
  - `@yoophi/file-list` — 제어 컴포넌트 `<FileList>` (headerActions 슬롯)
- widgets는 라우터/쿼리/zustand를 패키지 props로 매핑하는 얇은 어댑터로 축소
- Tailwind v4 `@source`, Vite `optimizeDeps.exclude`, react peerDependencies,
  Tauri `before*Command` pnpm 전환 등 모노레포 설정 정비
- 검증: 워크스페이스 전체 tsc, vite build, cargo check(이동 후 캐시 clean),
  브라우저 회귀 스위트 전부 통과
- **커밋** `07c0d14` *Restructure as a pnpm monorepo: apps/desktop + reusable
  packages/\**

### 00:57 ~ 01:07 — /simplify (모노레포 경계 정리)

- `@source` 지시자를 ui 패키지 → 앱 CSS로 이동 (ui가 형제 패키지를 아는 역방향
  의존 제거, 빌드 CSS 바이트 동일 확인)
- `@yoophi/ui`의 미사용 lucide-react 의존성 제거, 앱 entity barrel의 미사용
  FileEntry 재export 제거, 트리 어댑터 `childDirs`를 `useMemo`로 안정화
- **커밋** `66d9b92` */simplify: tighten package boundaries after the monorepo split*

### 01:1x — 문서화

- README 갱신: Features, 패키지 재사용 가이드(제어 컴포넌트 props, `@source`·
  `optimizeDeps` 통합 노트), 루트 스크립트 안내
- 본 LOG.md 작성
