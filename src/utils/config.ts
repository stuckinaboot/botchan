import chalk from "chalk";

/**
 * Default chain ID (Base mainnet)
 */
export const DEFAULT_CHAIN_ID = 8453;

/**
 * Normalize a feed name to lowercase for consistency.
 */
export function normalizeFeedName(feed: string): string {
  return feed.toLowerCase();
}

/**
 * Common options shared across all CLI commands
 */
export interface CommonOptions {
  privateKey: `0x${string}`;
  chainId: number;
  rpcUrl?: string;
}

/**
 * Read-only options for commands that don't need a private key
 */
export interface ReadOnlyOptions {
  chainId: number;
  rpcUrl?: string;
}

/**
 * Get chain ID from option or environment variable
 */
function getChainId(optionValue?: number): number {
  if (optionValue) {
    return optionValue;
  }

  const envChainId =
    process.env.BOTCHAN_CHAIN_ID || process.env.NET_CHAIN_ID;

  if (envChainId) {
    return parseInt(envChainId, 10);
  }

  return DEFAULT_CHAIN_ID;
}

/**
 * Get RPC URL from option or environment variable
 */
function getRpcUrl(optionValue?: string): string | undefined {
  return optionValue || process.env.BOTCHAN_RPC_URL || process.env.NET_RPC_URL;
}

/**
 * Parse and validate read-only options for commands that don't need a private key.
 * Extracts chain ID and RPC URL from command options or environment variables.
 */
export function parseReadOnlyOptions(options: {
  chainId?: number;
  rpcUrl?: string;
}): ReadOnlyOptions {
  return {
    chainId: getChainId(options.chainId),
    rpcUrl: getRpcUrl(options.rpcUrl),
  };
}

/**
 * Parse and validate common options shared across all commands.
 * Extracts private key, chain ID, and RPC URL from command options or environment variables.
 * @param options - Command options
 * @param supportsEncodeOnly - If true, mention --encode-only in error messages as an alternative
 */
export function parseCommonOptions(
  options: {
    privateKey?: string;
    chainId?: number;
    rpcUrl?: string;
  },
  supportsEncodeOnly = false
): CommonOptions {
  const privateKey =
    options.privateKey ||
    process.env.BOTCHAN_PRIVATE_KEY ||
    process.env.NET_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;

  if (!privateKey) {
    const encodeOnlyHint = supportsEncodeOnly
      ? ", or use --encode-only to output transaction data without submitting"
      : "";
    console.error(
      chalk.red(
        `Error: Private key is required. Provide via --private-key flag or BOTCHAN_PRIVATE_KEY/NET_PRIVATE_KEY environment variable${encodeOnlyHint}`
      )
    );
    process.exit(1);
  }

  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    console.error(
      chalk.red(
        "Error: Invalid private key format (must be 0x-prefixed, 66 characters)"
      )
    );
    process.exit(1);
  }

  if (options.privateKey) {
    console.warn(
      chalk.yellow(
        "Warning: Private key provided via command line. Consider using BOTCHAN_PRIVATE_KEY environment variable instead."
      )
    );
  }

  return {
    privateKey: privateKey as `0x${string}`,
    chainId: getChainId(options.chainId),
    rpcUrl: getRpcUrl(options.rpcUrl),
  };
}
