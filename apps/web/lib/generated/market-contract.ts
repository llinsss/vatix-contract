// AUTO-GENERATED — do not edit by hand.
// Regenerate with: pnpm build:bindings
//
// Source: contracts/market/src/lib.rs (MarketContract)
// Generator: scripts/generate-bindings.ts → stellar contract bindings typescript

import {
  Address,
  BASE_FEE,
  Contract,
  nativeToScVal,
  scValToNative,
  rpc as SorobanRpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

export type u32 = number;
export type u64 = bigint;
export type i128 = bigint;

// ---------------------------------------------------------------------------
// Contract types (mirrors contracts/market/src/types.rs)
// ---------------------------------------------------------------------------

export type MarketStatus = "Active" | "Resolved" | "Canceled";

export interface MarketData {
  id: u32;
  question: string;
  end_time: u64;
  status: MarketStatus;
  result: boolean | null;
  creator: string;
  created_at: u64;
  collateral_token: string;
}

export interface PositionData {
  market_id: u32;
  user: string;
  yes_shares: i128;
  no_shares: i128;
  locked_collateral: i128;
  total_deposited: i128;
  is_settled: boolean;
}

// ---------------------------------------------------------------------------
// Client options
// ---------------------------------------------------------------------------

export interface MarketContractClientOptions {
  contractId: string;
  networkPassphrase: string;
  rpcUrl: string;
}

export interface AssembledTx {
  xdr: string;
  signAndSend: (opts: {
    signTransaction: (xdr: string) => Promise<{ signedTxXdr: string }>;
  }) => Promise<{ hash: string }>;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class MarketContractClient {
  private readonly contract: Contract;
  readonly server: SorobanRpc.Server;

  constructor(public readonly options: MarketContractClientOptions) {
    this.contract = new Contract(options.contractId);
    this.server = new SorobanRpc.Server(options.rpcUrl);
  }

  async deposit_collateral({
    user,
    market_id,
    amount,
  }: {
    user: string;
    market_id: u32;
    amount: i128;
  }): Promise<AssembledTx> {
    return this._assemble(
      "deposit_collateral",
      [
        new Address(user).toScVal(),
        nativeToScVal(market_id, { type: "u32" }),
        nativeToScVal(amount, { type: "i128" }),
      ],
      user,
    );
  }

  async withdraw_unused_collateral({
    user,
    market_id,
    amount,
  }: {
    user: string;
    market_id: u32;
    amount: i128;
  }): Promise<AssembledTx> {
    return this._assemble(
      "withdraw_unused_collateral",
      [
        new Address(user).toScVal(),
        nativeToScVal(market_id, { type: "u32" }),
        nativeToScVal(amount, { type: "i128" }),
      ],
      user,
    );
  }

  async settle_position({
    user,
    market_id,
  }: {
    user: string;
    market_id: u32;
  }): Promise<AssembledTx> {
    return this._assemble(
      "settle_position",
      [
        new Address(user).toScVal(),
        nativeToScVal(market_id, { type: "u32" }),
      ],
      user,
    );
  }

  // Read position directly from contract storage via getLedgerEntries.
  async get_position({
    user,
    market_id,
  }: {
    user: string;
    market_id: u32;
  }): Promise<PositionData | null> {
    const key = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: new Address(this.options.contractId).toScAddress(),
        key: this._positionStorageKey(user, market_id),
        durability: xdr.ContractDataDurability.persistent(),
      }),
    );
    const { entries } = await this.server.getLedgerEntries(key);
    if (!entries.length) return null;
    const val = entries[0].val.contractData().val();
    return scValToNative(val) as PositionData;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async _assemble(
    method: string,
    args: xdr.ScVal[],
    sourcePublicKey: string,
  ): Promise<AssembledTx> {
    const account = await this.server.getAccount(sourcePublicKey);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.options.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation failed: ${sim.error}`);
    }

    const assembled = SorobanRpc.assembleTransaction(tx, sim).build();
    const assembledXdr = assembled.toXDR();

    return {
      xdr: assembledXdr,
      signAndSend: async ({ signTransaction }) => {
        const { signedTxXdr } = await signTransaction(assembledXdr);
        const sent = await this.server.sendTransaction(
          TransactionBuilder.fromXDR(
            signedTxXdr,
            this.options.networkPassphrase,
          ),
        );
        if (sent.status === "ERROR") {
          throw new Error(
            `Transaction failed: ${JSON.stringify(sent.errorResult)}`,
          );
        }
        return { hash: sent.hash };
      },
    };
  }

  // Encodes StorageKey::Position(market_id, user) as the Soroban contracttype XDR.
  // Mirrors the #[contracttype] enum encoding from contracts/market/src/storage.rs.
  private _positionStorageKey(user: string, market_id: u32): xdr.ScVal {
    return xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("Position"),
        val: xdr.ScVal.scvVec([
          xdr.ScVal.scvU32(market_id),
          new Address(user).toScVal(),
        ]),
      }),
    ]);
  }
}
