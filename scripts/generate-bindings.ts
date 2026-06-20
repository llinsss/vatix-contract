#!/usr/bin/env tsx
/**
 * Generates TypeScript client bindings from the Vatix market contract.
 *
 * Usage:
 *   pnpm build:bindings
 *
 * Modes:
 *   1. NEXT_PUBLIC_MARKET_CONTRACT_ID is set → fetch spec from deployed contract
 *   2. Otherwise → build WASM locally and extract spec from binary
 *
 * Prerequisites:
 *   Stellar CLI: cargo install --locked stellar-cli --features opt
 *   See: https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd());
const OUTPUT_DIR = path.join(ROOT, "apps/web/lib/generated");
const WASM_DIR = path.join(
  ROOT,
  "contracts/market/target/wasm32-unknown-unknown/release",
);
const WASM_PATH = path.join(WASM_DIR, "vatix_market_contract.wasm");

const CONTRACT_ID = process.env.NEXT_PUBLIC_MARKET_CONTRACT_ID ?? "";
const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";

function run(cmd: string, cwd: string = ROOT): void {
  execSync(cmd, { stdio: "inherit", cwd });
}

function checkStellarCli(): void {
  try {
    execSync("stellar --version", { stdio: "ignore" });
  } catch {
    console.error(
      "Error: Stellar CLI not found.\n" +
        "Install: cargo install --locked stellar-cli --features opt\n" +
        "Docs: https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli",
    );
    process.exit(1);
  }
}

function ensureOutputDir(): void {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function buildBindingsFromContract(): void {
  console.log(`Generating bindings from deployed contract: ${CONTRACT_ID}`);
  run(
    [
      "stellar contract bindings typescript",
      `--contract-id ${CONTRACT_ID}`,
      `--rpc-url ${RPC_URL}`,
      `--network-passphrase "${NETWORK_PASSPHRASE}"`,
      `--output-dir ${OUTPUT_DIR}`,
      "--overwrite",
    ].join(" "),
  );
}

function buildBindingsFromWasm(): void {
  if (!existsSync(WASM_PATH)) {
    console.log("WASM not found — building contract...");
    run(
      "cargo build --target wasm32-unknown-unknown --release",
      path.join(ROOT, "contracts/market"),
    );
  }
  console.log(`Generating bindings from WASM: ${WASM_PATH}`);
  run(
    [
      "stellar contract bindings typescript",
      `--wasm ${WASM_PATH}`,
      `--output-dir ${OUTPUT_DIR}`,
      "--overwrite",
    ].join(" "),
  );
}

checkStellarCli();
ensureOutputDir();

if (CONTRACT_ID) {
  buildBindingsFromContract();
} else {
  buildBindingsFromWasm();
}

console.log(`TypeScript bindings generated → ${OUTPUT_DIR}`);
