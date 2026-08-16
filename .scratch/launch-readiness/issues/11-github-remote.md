# GitHub remote and first push
Type: task
Status: resolved
Blocked by: -

## Question
No commits and no remote exist; CI has never run. Create the public GitHub repo, make the initial commit (no agent attribution), push, and confirm CI green. Repo name (operator, 2026-08-16): `pearl-street-game`, public. Owner account: whatever `gh auth status` reports. Before the first commit: confirm `.gitignore` covers every `.env*` and `packages/proto/.env.bots`, and that `contracts/lib` handling is decided (submodule vs vendored).

## Answer
Done 2026-08-16: https://github.com/imDev2023/pearl-street-game (public), initial commit `8d8eb90` on `main`, CI run 31921752351 green (forge fmt/build/test + workspaces). forge-std is a vendored copy under `contracts/lib` (1.3 MB); pin or submodule it in T-002 CI hardening.
