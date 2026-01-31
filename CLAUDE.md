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
