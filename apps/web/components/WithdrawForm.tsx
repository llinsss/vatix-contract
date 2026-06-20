"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { MarketContractClient } from "@/lib/generated/market-contract";
import { MARKET_CONTRACT_ID, SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "@/lib/soroban";

interface WithdrawFormProps {
  marketId: number;
}

export function WithdrawForm({ marketId }: WithdrawFormProps) {
  const { address } = useWallet();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      setError("Connect your Freighter wallet first.");
      return;
    }
    if (!MARKET_CONTRACT_ID) {
      setError("NEXT_PUBLIC_MARKET_CONTRACT_ID is not set.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const client = new MarketContractClient({
        contractId: MARKET_CONTRACT_ID,
        networkPassphrase: NETWORK_PASSPHRASE,
        rpcUrl: SOROBAN_RPC_URL,
      });
      const amountInStroops = BigInt(Math.round(parseFloat(amount) * 1e7));
      const tx = await client.withdraw_unused_collateral({
        user: address,
        market_id: marketId,
        amount: amountInStroops,
      });
      const { signTransaction } = await import("@stellar/freighter-api");
      const { hash } = await tx.signAndSend({
        signTransaction: async (xdr) => {
          const result = await signTransaction(xdr, {
            networkPassphrase: NETWORK_PASSPHRASE,
            address,
          });
          if (result.error) throw new Error(result.error.message);
          return { signedTxXdr: result.signedTxXdr };
        },
      });
      setTxHash(hash);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-lg border border-slate-200 p-4 dark:border-slate-700 sm:p-6"
    >
      <h3 className="text-base font-semibold sm:text-lg">Withdraw funds</h3>
      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="withdraw-amount"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Amount
          </label>
          <input
            id="withdraw-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {txHash && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Withdrawn! Tx: {txHash}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading || !amount}
          aria-label={isLoading ? "Processing withdrawal" : "Withdraw funds"}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-600 dark:hover:bg-indigo-500"
        >
          {isLoading ? "Processing..." : "Withdraw"}
        </button>
      </div>
    </form>
  );
}
