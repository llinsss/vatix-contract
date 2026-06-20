"use client";

import { useState, useEffect } from "react";
import { DepositForm } from "./DepositForm";
import { WithdrawForm } from "./WithdrawForm";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { useWallet } from "@/context/WalletContext";
import { MarketContractClient, type PositionData } from "@/lib/generated/market-contract";
import { MARKET_CONTRACT_ID, SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "@/lib/soroban";

interface PositionPanelProps {
  marketId: number;
}

export function PositionPanel({ marketId }: PositionPanelProps) {
  const { address } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState<PositionData | null>(null);

  useEffect(() => {
    if (!address || !MARKET_CONTRACT_ID) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const client = new MarketContractClient({
      contractId: MARKET_CONTRACT_ID,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: SOROBAN_RPC_URL,
    });

    client
      .get_position({ user: address, market_id: marketId })
      .then((pos) => {
        if (!cancelled) setPosition(pos);
      })
      .catch(() => {
        if (!cancelled) setPosition(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, marketId]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <DepositForm marketId={marketId} />
        <WithdrawForm marketId={marketId} />
      </div>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700 sm:p-6">
        <h2 className="text-base font-semibold sm:text-lg">Your position</h2>
        <div className="mt-4 min-h-[11rem]">
          {isLoading ? (
            <LoadingSkeleton />
          ) : position ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">YES shares</dt>
                <dd className="font-medium">{position.yes_shares.toString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">NO shares</dt>
                <dd className="font-medium">{position.no_shares.toString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">Deposited</dt>
                <dd className="font-medium">
                  {(Number(position.total_deposited) / 1e7).toFixed(2)} USDC
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">Locked</dt>
                <dd className="font-medium">
                  {(Number(position.locked_collateral) / 1e7).toFixed(2)} USDC
                </dd>
              </div>
            </dl>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You have no open position in this market.
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                Deposit funds to open a position.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
