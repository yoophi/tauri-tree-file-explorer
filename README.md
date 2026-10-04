# Tree File Explorer

왼쪽 폴더 트리와 오른쪽 파일 목록으로 로컬 파일시스템을 탐색하는 Tauri 데스크톱 앱입니다.

## 주요 기능

- @pierre/trees 기반 가상화 폴더 트리와 하위 디렉터리 지연 로딩
- 파일 크기·수정 시각 표시, 폴더 행 선택으로 이동
- URL의 ?path=와 선택 폴더 동기화, 뒤로/앞으로 탐색
- 숨김 파일 표시와 드래그 가능한 패널 비율 저장
- 설정 UI에서 숨김 표시·패널 배치 초기화
- 폴더 항목을 스트리밍으로 받아 정렬된 부분 목록과 진행 상태를 표시

## 개발 환경과 실행

Node.js 22 이상과 pnpm, Rust/Cargo 및 운영체제에 필요한 Tauri 빌드 도구가 필요합니다. `.ts` 파일을 직접 실행하는 테스트에는 Node의 TypeScript type stripping을 지원하는 버전을 사용하세요.

이 저장소의 packageManager 선언은 `pnpm@11.0.9`, 공통 explorer-kit은 `pnpm@9.15.5`입니다. 각 저장소의 선언과 lockfile을 확인해 설치하며 이 문서 갱신에서 버전은 변경하지 않았습니다.

이 앱과 `explorer-kit`을 같은 상위 디렉터리에 체크아웃해야 합니다. TypeScript는 `link:`, Rust는 Cargo `path` 의존성을 사용하므로 앱 저장소만으로는 설치·빌드할 수 없습니다. 아래 명령은 이 앱의 루트에서 시작합니다.

```sh
cd ../explorer-kit
pnpm install --frozen-lockfile
cd ../tauri-tree-file-explorer
pnpm install --frozen-lockfile
pnpm tauri dev
```

`pnpm dev`는 Vite 브라우저 서버만 실행합니다. 실제 파일/설정/OS 기능은 `pnpm tauri dev`로 실행한 네이티브 앱에서 확인하세요. 기본 개발 포트는 1420입니다.

## 검증과 빌드

```sh
pnpm typecheck
node --experimental-strip-types --test apps/desktop/src/features/settings/model/settings.test.ts
node --experimental-strip-types --import ./apps/desktop/src/entities/file-system/model/test-loader.mjs --test apps/desktop/src/entities/file-system/model/stream-directory.test.ts
node --experimental-strip-types --test apps/desktop/src/widgets/folder-tree-panel/model/root-directories.test.ts
pnpm build
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
pnpm tauri build
```

`pnpm build`는 프론트엔드 타입 검사·번들 생성이며 네이티브 패키징은 `pnpm tauri build`입니다. 네이티브 패키징은 이번 구조 수정에서 실행하지 않았습니다.

브라우저 전용 fixture는 `pnpm dev` 후 `http://localhost:1420/test.html`에서 확인합니다. 메모리 파일시스템을 사용하므로 실제 OS 파일 조회 검증과 구분합니다.

## 데이터와 설정

숨김 표시는 localStorage `tauri-tree-file-explorer.preferences` v1의 showHidden에 저장합니다. 패널 비율은 기존 `explorer-layout`의 raw JSON(tree/files)을 유지합니다. 잘못된 저장값은 자동 덮어쓰지 않으며 UI 초기화로 복구합니다. 선택 폴더는 React Router의 `?path=`로 관리합니다.

공통 file-tree의 경로 변환은 `/` root와 끝 구분자가 있는 root를 처리합니다. 현재 경로 계약은 POSIX 절대 경로이며 Windows 경로는 지원 범위 밖입니다. 숨김 표시 전환 시 트리 캐시가 남던 문제는 설정 공통화 과정에서 보완했습니다.

## 현재 아키텍처

프론트엔드는 app/pages/widgets/features/entities를 사용합니다. entities/file-system의 Tauri API·TanStack Query를 widget이 공통 FolderTree/FileList에 연결합니다. 숨김 토글·설정 UI·저장은 하나의 settings feature에 두고, 외부 slice는 settings 공개 index를 사용합니다. 경로 선택은 Router가 담당합니다.

Rust application의 HomeDirectoryPort·DirectoryListingPort는 Tauri 없이 home/list 및 stream 유스케이스를 실행합니다. outbound adapter가 Tauri platform 홈 경로와 explorer-fs-core 목록/스트림을 연결합니다. 기존 `list_dir` IPC는 유지하고, 새 `list_dir_stream`/`cancel_list_dir_stream` command는 blocking worker와 scan registry를 사용해 항목 및 terminal 이벤트를 보냅니다. 실패와 worker panic은 failed 이벤트로 전달합니다.

프론트엔드는 `@yoophi/scan-client`로 이벤트를 먼저 구독한 뒤 scan을 시작합니다. React Query는 같은 경로·숨김 설정의 작업을 공유하며 완료된 결과만 캐시합니다. 정렬된 진행 snapshot은 QueryClient 범위의 임시 store에 두어 실패·취소 시 제거하고 이전 완료 캐시를 보존합니다. 경로·숨김 상태 변경 또는 마지막 구독 해제 시 AbortSignal로 작업을 취소하며 늦은 이벤트는 무시합니다. 파일 목록은 부분 결과를 표시하지만 FolderTree의 초기 root 목록은 완료 결과로만 생성합니다. 기존 완료 root는 재조회 중 유지하며, 완료된 루트 디렉터리 집합이 바뀔 때만 트리 모델을 다시 생성합니다.

| 위치 | 책임 |
| --- | --- |
| `apps/desktop/src` | React 화면·모델·API adapter |
| `apps/desktop/src-tauri/src/application.rs` | 홈·목록 유스케이스, 포트, IPC 항목 형태 |
| `apps/desktop/src-tauri/src/outbound.rs` | platform 홈 경로와 fs-core 조회 adapter |
| `apps/desktop/src-tauri/src/lib.rs` | Tauri command 조립과 blocking worker |

## 공통 코드 연결

- 프론트엔드/개발 도구: `@yoophi/explorer-core`, `@yoophi/file-list`, `@yoophi/file-tree`, `@yoophi/scan-client`, `@yoophi/settings-core`, `@yoophi/settings-ui`, `@yoophi/ui-radix`
- Rust: `explorer-fs-core`, `explorer-scan-job`.

공통 React 컴포넌트는 앱 데이터를 props와 callback으로 받고, 앱의 Tauri·라우팅·도메인 정책은 호출부에 유지합니다. 공통 저장소 UI를 보려면 `explorer-kit`에서 `pnpm storybook`을 실행하세요. 앱별 Storybook과는 별도이며 기본 포트 6006을 사용합니다.

`@yoophi/file-tree`와 `@yoophi/file-list`는 절대 경로를 받는 controlled 컴포넌트입니다. 초기 하위 폴더 데이터가 준비된 뒤 트리를 mount하고 childDirs로 지연 로딩 결과를 전달합니다. 소비 앱 CSS의 Tailwind `@source`, Vite의 linked package exclude·React dedupe·server.fs.allow 설정을 유지하세요. 이전 구성 이력은 [모노레포 전환 문서](docs/pnpm-monorepo-migration.md)에 있습니다.

## 관련 문서

- [공통 저장소 안내](../explorer-kit/README.md)
- [공통 UI Storybook](../explorer-kit/docs/storybook.md)
- [설정 공통화 결과](../explorer-kit/docs/settings-promotion-report.md)
- [Hexagonal·FSD 리뷰](../explorer-kit/docs/architecture-review.md)
- [아키텍처 지적 수정 결과](../explorer-kit/docs/architecture-fix-report.md)
- [두 앱 이상 공통 기능 후보](../explorer-kit/docs/shared-feature-candidates.md)
- [공통 코드 기능 리뷰와 미해결 항목](../explorer-kit/docs/shared-code-review.md)
- [남은 리뷰 지적 수정 결과](../explorer-kit/docs/remaining-review-fixes-report.md)

문서 기준: 2026-10-05 로컬 구현. 아키텍처 리뷰의 개선 권고와 공통 기능 후보는 완료된 구현과 구분합니다.

공통 `scan-client`의 등록 확인·취소·종료 수명은 `ScanLifecycle`로 통합되었습니다. Tree는 기존 `consumeScan` transport를 통해 이를 사용하며, 완료된 목록만 Query 캐시에 반영하는 앱 정책은 유지합니다. 추가 공통 후보 중 재귀 walker·그룹·이미지 입력은 이 앱의 사용 사례에 맞지 않아 강제로 연결하지 않습니다.

## 잔여 공통화 정리

이름 비교는 explorer-core의 코드포인트 비교를 사용합니다. 항목별 소문자화·코드포인트 분리, 디렉터리 우선, 안정 정렬, 원본 배열 보존은 기존대로 유지합니다. 지연 트리·URL history·완료 캐시 정책은 앱 책임입니다. 상세 선정·검증·유지 근거는 [공통화 보고서](../explorer-kit/docs/residual-commonality-report.md)를 참고하세요.
