# pnpm 모노레포 전환 설계: apps/desktop + packages/*

## Context

`tauri-tree-file-explorer`는 단일 npm 패키지(FSD 구조)였다. 파일 트리(@pierre/trees 동기화 로직)와
파일 목록 UI를 다른 앱(예: 다른 백엔드를 쓰는 웹 앱)에서 재사용할 수 있도록, JS 영역을 pnpm
워크스페이스 모노레포로 재구성한다. 앱은 `apps/desktop`으로, 재사용 UI는 `packages/*`로 이동한다.

결정 사항:

- 패키지 스코프: **`@yoophi/*`**
- 빌드 전략: **소스 패키지** — 빌드 스텝 없이 `exports`가 `.tsx` 소스를 직접 가리키고
  앱의 Vite가 함께 번들링한다 (shadcn 모노레포 방식)

## 목표 구조

```
pnpm-workspace.yaml            # packages: ["apps/*", "packages/*"]
package.json                   # root: private, packageManager, 위임 스크립트
tsconfig.base.json             # 공통 컴파일 옵션
apps/desktop/                  # Tauri 앱 (react-query/zustand/react-router 와이어링)
  src/ (FSD 유지), src-tauri/, index.html, test.html, vite.config.ts, components.json
packages/core/                 # @yoophi/explorer-core: FileEntry 타입 + 포매터 (무의존)
packages/ui/                   # @yoophi/ui: shadcn 프리미티브 + cn + 테마 CSS
packages/file-tree/            # @yoophi/file-tree: 제어 컴포넌트 <FolderTree>
packages/file-list/            # @yoophi/file-list: 제어 컴포넌트 <FileList>
```

의존 그래프(→ = 의존):

```
desktop → file-tree, file-list, ui, core
file-tree → core          file-list → ui, core          ui, core → (없음)
```

**패키지는 Tauri·react-query·zustand·react-router에 의존하지 않는다** — 전부 앱 쪽 관심사.

## 패키지 공개 API (제어 컴포넌트)

### `@yoophi/file-tree`

경계는 전부 절대경로. @pierre/trees의 루트상대 id 변환(`lib/paths.ts`)은 패키지 내부에 은닉한다.

```ts
interface FolderTreeProps {
  root: string;                 // 트리 루트 절대경로 (예: 홈 디렉토리)
  initialDirs: string[];        // 루트 직속 하위폴더 절대경로 — 모델 1회 생성 시드
  selectedPath: string | null;  // 제어값 — reveal/expand/highlight/deselect 로직 구동
  childDirs: string[];          // selectedPath의 하위폴더 절대경로 — lazy graft 입력
  onSelectFolder: (absolutePath: string) => void;  // 이벤트 기반 선택 통지
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}
```

패키지 내부에 보존되는 (디버깅으로 확정된) 동작:

- `flattenEmptyDirectories: false` — 단일 자식 체인 평탄화 시 선택 하이라이트 소실 방지
- `onSelectionChange` ref 브리지 — 렌더 기반 동기화의 URL↔트리 핑퐁 루프 방지
- route→tree effect — 누락 노드 graft, 조상 expand, select, 타 항목 deselect
- `selectedPath === root` 특례 (루트는 행이 없으므로 전체 deselect)

deps: `@pierre/trees`, `@yoophi/explorer-core` / peer: `react`

### `@yoophi/file-list`

```ts
interface FileListProps {
  selectedPath: string | null;       // 헤더 경로 라벨
  entries: FileEntry[] | undefined;  // @yoophi/explorer-core 타입
  loading: boolean;                  // skeleton 상태
  error: unknown | null;             // 에러 Empty 상태
  onOpenFolder: (absolutePath: string) => void;
  headerActions?: React.ReactNode;   // 앱이 토글 버튼 등을 주입하는 슬롯
  className?: string;
}
```

`formatBytes`/`formatModified`는 core에서 import해 내부 사용.

deps: `@yoophi/ui`, `@yoophi/explorer-core`, `lucide-react` / peer: `react`

### `@yoophi/ui`

`src/shared/ui/*` 전부 + `cn` 유틸 + 테마 CSS(`globals.css`)를 보유. subpath exports:

```jsonc
"exports": {
  "./components/*": "./src/components/*.tsx",
  "./lib/utils": "./src/lib/utils.ts",
  "./globals.css": "./src/styles/globals.css"
}
```

deps: radix-ui, class-variance-authority, clsx, tailwind-merge, lucide-react,
tw-animate-css, react-resizable-panels, @fontsource-variable/geist / peer: `react`

### `@yoophi/explorer-core`

`FileEntry` 타입 + `formatBytes`/`formatModified`. 의존성 0인 리프 패키지 —
앱 쿼리 레이어와 UI 패키지가 같은 타입을 아래 방향으로만 import하게 해 순환을 차단한다.

## apps/desktop에 남는 것 (얇은 어댑터)

- `entities/file-system`: Tauri invoke 래퍼 + react-query 훅 (FileEntry는 core에서 import)
- `features/folder-navigation`: `?path=` URL 상태 (react-router)
- `features/toggle-hidden-files`: zustand 스토어 + 토글 버튼
- `widgets/folder-tree-panel`: 쿼리/라우터 → `<FolderTree>` props 매핑.
  rootEntries 준비 전 미마운트 게이트 유지 (모델은 1회 생성이므로)
- `widgets/file-list-panel`: 쿼리 상태 → `<FileList>` 매핑 + headerActions 주입
- `pages/explorer`(resizable 레이아웃), `app/providers`, `main.tsx`, 테스트 하니스

## 주의점

- **Tailwind v4 @source**: Tailwind는 워크스페이스 패키지 소스를 자동 스캔하지 않는다.
  `@yoophi/ui`의 globals.css에 각 패키지 `src`를 가리키는 `@source` 지시자를 추가해야
  패키지 내 클래스가 빌드 CSS에 포함된다.
- **소스 exports + Vite**: 링크드 워크스페이스 deps는 pre-bundle 대상이 아니므로 Vite가
  `.tsx`를 직접 변환한다. `optimizeDeps.exclude`에 `@yoophi/*` 명시.
  `moduleResolution: "bundler"`를 모든 패키지 tsconfig에 일관 적용.
- **react peer 규칙**: ui/file-tree/file-list 모두 react·react-dom을
  peerDependencies로 선언 — React 중복 설치로 인한 hook 오류 방지.
- **Tauri 명령**: `apps/desktop/src-tauri/tauri.conf.json`의 `beforeDevCommand`/
  `beforeBuildCommand`를 `pnpm dev`/`pnpm build`로 변경 (cwd=apps/desktop).
  루트에서 `pnpm --filter desktop tauri dev`로 실행.
- shadcn `components.json`: ui 패키지와 앱 양쪽에 두고, 신규 컴포넌트 추가가
  ui 패키지로 라우팅되도록 aliases를 `@yoophi/ui/*` 형식으로 설정.

## 검증

1. `pnpm install` → 워크스페이스 타입체크 + `pnpm --filter desktop build` 통과
2. `cargo check` (Rust는 위치 이동만, 코드 변경 없음)
3. 브라우저 회귀 테스트 (test.html 하니스): folded 폴더 클릭 하이라이트 / 단일 자식 폴더 /
   파일 목록 경유 트리 동기화 / 뒤로가기 / 리사이즈+localStorage / 콘솔 에러 0
4. Tailwind 스타일 누락 검사 (스크린샷)
5. README 갱신, 커밋·푸시
