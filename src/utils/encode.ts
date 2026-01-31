import { encodeFunctionData } from "viem";
import type { WriteTransactionConfig } from "@net-protocol/core";

/**
 * Encoded transaction data for --encode-only mode
 */
export interface EncodedTransaction {
  to: `0x${string}`;
  data: `0x${string}`;
  chainId: number;
  value: string;
}

/**
 * Encode a write transaction config into transaction data
 * Used for --encode-only mode where we output transaction data instead of executing
 */
export function encodeTransaction(
  config: WriteTransactionConfig,
  chainId: number
): EncodedTransaction {
  const calldata = encodeFunctionData({
    abi: config.abi,
    functionName: config.functionName,
    args: config.args,
  });

  return {
    to: config.to,
    data: calldata,
    chainId,
    value: config.value?.toString() ?? "0",
  };
}
