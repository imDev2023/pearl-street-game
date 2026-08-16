# GitHub remote and first push
Type: task
Status: open
Blocked by: -

## Question
No commits and no remote exist; CI has never run. Create the public GitHub repo, make the initial commit (no agent attribution), push, and confirm CI green. Repo name (operator, 2026-08-16): `pearl-street-game`, public. Owner account: whatever `gh auth status` reports. Before the first commit: confirm `.gitignore` covers every `.env*` and `packages/proto/.env.bots`, and that `contracts/lib` handling is decided (submodule vs vendored).
