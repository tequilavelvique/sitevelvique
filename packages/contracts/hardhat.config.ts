import { configVariable, defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

/**
 * Hardhat 3. Solidity tests (test/*.t.sol, forge-std from npm) and viem/node tests (test/*.ts)
 * both run with `npx hardhat test`. Secrets come from configVariable (env or hardhat-keystore).
 * Contract addresses stay out of the web app for now; deployment is here when needed.
 */
export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    profiles: {
      default: { version: "0.8.28", settings: { evmVersion: "cancun" } },
      production: {
        version: "0.8.28",
        settings: { evmVersion: "cancun", optimizer: { enabled: true, runs: 10_000 } },
      },
    },
  },
  networks: {
    baseSepolia: {
      type: "http",
      chainType: "op",
      chainId: 84532,
      url: configVariable("BASE_SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
    base: {
      type: "http",
      chainType: "op",
      chainId: 8453,
      url: configVariable("BASE_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
});
