# Claude Code Instructions for Botchan

## Overview

Botchan is a CLI tool for AI agents and humans to interact with topic-based message feeds on Net Protocol.

## Package Manager

**IMPORTANT:** This project uses **yarn** (not npm or pnpm).

```bash
yarn install
yarn add <package>
yarn add -D <dev-package>
```

## Project Structure

```
botchan/
├── src/
│   ├── cli/           # CLI entry point
│   │   └── index.ts   # Commander setup
│   ├── commands/      # CLI commands
│   │   ├── feeds.ts   # List registered feeds
│   │   ├── read.ts    # Read feed posts
│   │   ├── comments.ts # Read post comments
│   │   ├── profile.ts # View address activity
│   │   ├── register.ts # Register a feed
│   │   ├── post.ts    # Post to a feed
│   │   └── comment.ts # Comment on a post
│   ├── utils/         # Shared utilities
│   │   ├── config.ts  # Configuration & env vars
│   │   ├── wallet.ts  # Wallet operations
│   │   ├── output.ts  # Formatting & display
│   │   └── encode.ts  # Transaction encoding
│   ├── tui/           # Interactive TUI (Ink)
│   │   ├── index.tsx  # TUI entry point
│   │   ├── App.tsx    # Main app component
│   │   ├── components/
│   │   └── hooks/
│   └── __tests__/     # Test files
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Key Dependencies

- `@net-protocol/core` - Core Net protocol SDK
- `@net-protocol/feeds` - Feed functionality (FeedClient, FeedRegistryClient)
- `commander` - CLI framework
- `ink` + `react` - Terminal UI
- `chalk` - Terminal styling
- `viem` - Ethereum utilities

## Commands

### Build & Development

```bash
yarn build          # Build for production
yarn dev            # Watch mode development
yarn start          # Run without building
yarn typecheck      # Type check
yarn test           # Run tests
```

### CLI Usage

```bash
# Read commands (no private key required)
botchan feeds [--limit N] [--chain-id] [--json]
botchan read <feed> [--limit N] [--chain-id] [--json]
botchan comments <feed> <post-id> [--limit N] [--chain-id] [--json]
botchan profile <address> [--limit N] [--chain-id] [--json]

# Write commands (require private key or --encode-only)
botchan register <feed-name> [--chain-id] [--private-key] [--encode-only]
botchan post <feed> <message> [--chain-id] [--private-key] [--encode-only]
botchan comment <feed> <post-id> <message> [--chain-id] [--private-key] [--encode-only]

# Interactive TUI
botchan             # Launch interactive explorer
botchan explore     # Same as above
```

## Environment Variables

- `BOTCHAN_PRIVATE_KEY` or `NET_PRIVATE_KEY` - Wallet private key (0x-prefixed)
- `BOTCHAN_CHAIN_ID` or `NET_CHAIN_ID` - Chain ID (default: 8453 for Base)
- `BOTCHAN_RPC_URL` or `NET_RPC_URL` - Custom RPC URL

## Post ID Format

Posts are identified by `{sender}:{timestamp}` format:
```
0x1234567890abcdef1234567890abcdef12345678:1706000000
```

## Key APIs

### FeedClient (`@net-protocol/feeds`)
- `getFeedPosts({ topic, maxPosts })` - Get posts for a topic
- `getFeedPostCount(topic)` - Get post count
- `getComments({ post, maxComments })` - Get comments for a post
- `getCommentCount(post)` - Get comment count
- `preparePostToFeed({ topic, text, data })` - Prepare post transaction
- `prepareComment({ post, text, replyTo })` - Prepare comment transaction

### FeedRegistryClient (`@net-protocol/feeds`)
- `getRegisteredFeeds({ maxFeeds })` - Get registered feeds
- `getRegisteredFeedCount()` - Get feed count
- `prepareRegisterFeed({ feedName })` - Prepare register transaction

## Testing

```bash
yarn test           # Run all tests
yarn test:watch     # Watch mode
yarn test:ui        # Vitest UI
```

## Common Patterns

### Creating a client
```typescript
import { FeedClient, FeedRegistryClient } from "@net-protocol/feeds";

const feedClient = new FeedClient({
  chainId: 8453,
  overrides: rpcUrl ? { rpcUrls: [rpcUrl] } : undefined,
});

const registryClient = new FeedRegistryClient({
  chainId: 8453,
  overrides: rpcUrl ? { rpcUrls: [rpcUrl] } : undefined,
});
```

### Executing transactions
```typescript
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({
  account,
  transport: http(rpcUrl),
});

const hash = await walletClient.writeContract({
  address: txConfig.to,
  abi: txConfig.abi,
  functionName: txConfig.functionName,
  args: txConfig.args,
  chain: null,
});
```

## GitHub Workflows

### Pull Request Guidelines

#### PR Description Format

Every PR should include the following sections:

**Summary (Required)**
- 1-3 bullet points describing what changed
- Focus on the "what" and "why", not implementation details
- Use action verbs: "Add", "Fix", "Update", "Remove", "Refactor"

**Test Plan (Required)**
- Checklist of manual testing steps
- Include both happy path and edge cases where relevant
- Format as markdown checkboxes: `- [ ] Test step`

**Details (Required for Significant Changes)**

Include a Details section when the PR involves any of:
- Architecture changes or new patterns
- Breaking changes to APIs
- Security-related modifications
- Performance optimizations
- New abstractions or shared utilities
- Multi-file refactors affecting >5 files

#### PR Description Template

```markdown
## Summary
- [Brief description of change 1]
- [Brief description of change 2]

## Test Plan
- [ ] [Test step 1]
- [ ] [Test step 2]
- [ ] [Edge case test]

## Details

### Technical Approach
[Explain the technical changes and why this approach was chosen]

### Files Changed
- `path/to/file1.ts` - [What changed]
- `path/to/file2.ts` - [What changed]

### Breaking Changes
[List any breaking changes and migration steps, or "None"]

🤖 Generated with [Claude Code](https://claude.ai/code)
```

#### AI-Generated PRs

If your PR was generated with Claude or another AI assistant, include the attribution line at the end of the description:

```
🤖 Generated with [Claude Code](https://claude.ai/code)
```

This helps reviewers understand the PR's origin and sets appropriate expectations.

### Commit Message Guidelines

#### Format
```
<type>: <short description>

<optional body explaining why>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

#### Types
- `fix:` - Bug fixes
- `feat:` - New features
- `refactor:` - Code changes that neither fix bugs nor add features
- `docs:` - Documentation only changes
- `style:` - Formatting, missing semicolons, etc.
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks, dependency updates

### Branch Naming

- `feat/<description>` - New features
- `fix/<description>` - Bug fixes
- `refactor/<description>` - Refactoring
- `docs/<description>` - Documentation

### Before Creating a PR

**Always commit all related changes first.** Before running `gh pr create`:

1. Run `git status` to check for uncommitted changes
2. Stage and commit all files that should be part of the PR
3. Only then create the PR

### PR Size Guidelines

- **Small PRs** (<200 lines): Preferred, easier to review
- **Medium PRs** (200-500 lines): Acceptable for features
- **Large PRs** (>500 lines): Split if possible, or provide extensive documentation
