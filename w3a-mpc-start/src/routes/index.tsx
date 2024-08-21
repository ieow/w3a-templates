import {
  Web3AuthMPCCoreKit,
  WEB3AUTH_NETWORK,
  TssShareType,
  generateFactorKey,
  COREKIT_STATUS,
  keyToMnemonic,
  mnemonicToKey,
  AggregateVerifierLoginParams,
} from "@web3auth/mpc-core-kit";
import { createSignal, onMount } from "solid-js";
import { BN } from "bn.js";
import { Component } from "solid-js";
import { tssLib } from "@toruslabs/tss-frost-lib";

import { SolanaRPC } from "./rpc";

const web3AuthClientId =
  "BNBNpzCHEqOG-LIYygpzo7wsN8PDLjPjoh6GnuAwJth_prYW-pdy2O7kqE0C5lrGCnlJfCZx4_OEItGTcti6q1A"; // get from https://dashboard.web3auth.io

const auth0domainUrl = "https://dev-n82s5hbtzoxieejz.us.auth0.com";

const coreKitInstance = new Web3AuthMPCCoreKit({
  web3AuthClientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.DEVNET,
  storage: window.localStorage,
  manualSync: true,
  tssLib,
  uxMode: "redirect",
  baseUrl: "https://w3a-templates.pages.dev",
  redirectPathName: "redirect",
});

const Home: Component = () => {
  const [coreKitStatus, setCoreKitStatus] = createSignal<COREKIT_STATUS>(
    COREKIT_STATUS.NOT_INITIALIZED,
  );
  const [backupFactorKey, setBackupFactorKey] = createSignal<string>("");
  const [mnemonicFactor, setMnemonicFactor] = createSignal<string>("");

  onMount(async () => {
    console.log("initialigin core kit instance!!");
    await coreKitInstance.init();
    setCoreKitStatus(coreKitInstance.status);
  });

  const loginWithAuth0Google = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }

      // IMP START - Login
      const verifierConfig = {
        aggregateVerifierIdentifier: "aggregate-sapphire",
        subVerifierDetailsArray: [
          {
            typeOfLogin: "jwt", // auth0 uses jwt logins
            verifier: "w3a-a0-google",
            clientId: "qnXZflP6MQ8wIj5kjrEqetTSHcC3Phj6",
            jwtParams: {
              connection: "google-oauth2",
              domain: auth0domainUrl,
              verifierIdField: "email",
            },
          },
        ],
      } as AggregateVerifierLoginParams;

      await coreKitInstance.loginWithOAuth(verifierConfig);
      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges(); // Needed for new accounts
      }
      // IMP END - Login

      // IMP START - Recover MFA Enabled Account
      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]",
        );
      }
      // IMP END - Recover MFA Enabled Account

      setCoreKitStatus(coreKitInstance.status);
    } catch (error: unknown) {
      uiConsole(error);
    }
  };

  const loginWithAuth0Twitter = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }

      // IMP START - Login
      const verifierConfig = {
        aggregateVerifierIdentifier: "aggregate-sapphire",
        subVerifierDetailsArray: [
          {
            typeOfLogin: "jwt",
            verifier: "w3a-a0-twitter",
            clientId: "qnXZflP6MQ8wIj5kjrEqetTSHcC3Phj6",
            jwtParams: {
              connection: "twitter",
              domain: auth0domainUrl,
              verifierIdField: "email",
            },
          },
        ],
      } as AggregateVerifierLoginParams;

      await coreKitInstance.loginWithOAuth(verifierConfig);
      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges(); // Needed for new accounts
      }
      // IMP END - Login

      // IMP START - Recover MFA Enabled Account
      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]",
        );
      }
      // IMP END - Recover MFA Enabled Account

      setCoreKitStatus(coreKitInstance.status);
    } catch (error: unknown) {
      uiConsole(error);
    }
  };

  const loginWithAuth0EmailPasswordless = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }

      // IMP START - Login
      const verifierConfig = {
        aggregateVerifierIdentifier: "aggregate-sapphire",
        subVerifierDetailsArray: [
          {
            typeOfLogin: "jwt",
            verifier: "w3a-a0-email-passwordless",
            clientId: "qnXZflP6MQ8wIj5kjrEqetTSHcC3Phj6",
            jwtParams: {
              connection: "passwordless",
              domain: auth0domainUrl,
              verifierIdField: "email",
            },
          },
        ],
      } as AggregateVerifierLoginParams;

      await coreKitInstance.loginWithOAuth(verifierConfig);
      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges(); // Needed for new accounts
      }
      // IMP END - Login

      // IMP START - Recover MFA Enabled Account
      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]",
        );
      }
      // IMP END - Recover MFA Enabled Account

      setCoreKitStatus(coreKitInstance.status);
    } catch (error: unknown) {
      uiConsole(error);
    }
  };

  const loginWithDiscord = async () => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }

      const verifierConfig = {
        aggregateVerifierIdentifier: "w3a-universal-verifier",
        subVerifierDetailsArray: [
          {
            typeOfLogin: "discord",
            verifier: "w3a-discord",
            clientId: "1275709031138463754",
          },
        ],
      } satisfies AggregateVerifierLoginParams;

      await coreKitInstance.loginWithOAuth(verifierConfig);

      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        // Needed for new accounts
        await coreKitInstance.commitChanges();
      }

      if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
        uiConsole(
          "Required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]",
        );
      }

      setCoreKitStatus(coreKitInstance.status);
    } catch (err) {
      uiConsole(err);
    }
  };

  const inputBackupFactorKey = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    const backup = backupFactorKey();
    if (!backup) {
      throw new Error("backupFactorKey not found");
    }
    const factorKey = new BN(backup, "hex");
    await coreKitInstance.inputFactorKey(factorKey);

    setCoreKitStatus(coreKitInstance.status);

    if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
      uiConsole(
        "Required more shares even after inputing backup factor key, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]",
      );
    }
  };

  const enableMFA = async () => {
    if (!coreKitInstance) {
      throw new Error("CoreKitInstance is not set");
    }
    try {
      const factorKey = await coreKitInstance.enableMFA({});
      const factorKeyMnemonic = keyToMnemonic(factorKey);

      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges();
      }

      uiConsole(
        "MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key:",
        factorKeyMnemonic,
      );
    } catch (e) {
      uiConsole(e);
    }
  };

  const keyDetails = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    uiConsole(coreKitInstance.getKeyDetails());
  };

  const getDeviceFactor = async () => {
    try {
      const factorKey = await coreKitInstance.getDeviceFactor();
      setBackupFactorKey(factorKey!);
      uiConsole("Device share: ", factorKey);
    } catch (e) {
      uiConsole(e);
    }
  };

  const exportMnemonicFactor = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    uiConsole("export share type: ", TssShareType.RECOVERY);
    const factorKey = generateFactorKey();
    await coreKitInstance.createFactor({
      shareType: TssShareType.RECOVERY,
      factorKey: factorKey.private,
    });
    const factorKeyMnemonic = keyToMnemonic(factorKey.private.toString("hex"));
    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    uiConsole("Export factor key mnemonic: ", factorKeyMnemonic);
  };

  const MnemonicToFactorKeyHex = async (mnemonic: string) => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    try {
      const factorKey = mnemonicToKey(mnemonic);
      setBackupFactorKey(factorKey);
      return factorKey;
    } catch (error) {
      uiConsole(error);
    }
  };

  const getUserInfo = async () => {
    const user = coreKitInstance.getUserInfo();
    uiConsole(user);
  };

  const logout = async () => {
    await coreKitInstance.logout();
    setCoreKitStatus(coreKitInstance.status);
    uiConsole("Logged out");
  };

  const getAccounts = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }
    const solanaRPC = new SolanaRPC(coreKitInstance);
    const address = solanaRPC.getAccount();
    uiConsole(address);
  };

  const exportSeed = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }
    try {
      const key = await coreKitInstance._UNSAFE_exportTssEd25519Seed();
      uiConsole(key);
    } catch (e) {
      uiConsole(e);
    }
  };

  const getBalance = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }

    const solanaRPC = new SolanaRPC(coreKitInstance);
    const balance = await solanaRPC.getBalance();
    uiConsole(balance);
  };

  const requestFaucet = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }

    const solanaRPC = new SolanaRPC(coreKitInstance);
    const hash = await solanaRPC.requestFaucet();
    uiConsole(`Hash: https://explorer.solana.com/tx/${hash}?cluster=devnet`);
  };

  const processRequest = (method: () => void) => {
    try {
      method();
    } catch (error) {
      uiConsole(error);
    }
  };

  const signMessage = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }

    uiConsole("Signing Message...");

    const solanaRPC = new SolanaRPC(coreKitInstance);
    const signedMessage = await solanaRPC.signMessage();
    uiConsole(signedMessage);
  };

  const sendTransaction = async () => {
    if (!coreKitInstance) {
      uiConsole("Provider not initialized yet");
      return;
    }

    uiConsole("Sending Transaction...");

    const solanaRPC = new SolanaRPC(coreKitInstance);
    const hash = await solanaRPC.sendTransaction();
    uiConsole(`Hash: https://explorer.solana.com/tx/${hash}?cluster=devnet`);
  };

  const criticalResetAccount = async (): Promise<void> => {
    // This is a critical function that should only be used for testing purposes
    // Resetting your account means clearing all the metadata associated with it from the metadata server
    // The key details will be deleted from our server and you will not be able to recover your account
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }

    await coreKitInstance.tKey.storageLayer.setMetadata({
      privKey: new BN(coreKitInstance.state.postBoxKey!, "hex"),
      input: { message: "KEY_NOT_FOUND" },
    });

    if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
      await coreKitInstance.commitChanges();
    }
    uiConsole("Reset successful");
    await logout();
  };

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
    console.log(...args);
  }

  const loggedInView = (
    <>
      <div class="flex-container">
        <div>
          <button onClick={getUserInfo} class="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={keyDetails} class="card">
            Key Details
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(enableMFA)} class="card">
            Enable MFA
          </button>
        </div>
        <div>
          <button onClick={getAccounts} class="card">
            Get Accounts
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(requestFaucet)} class="card">
            Request Faucet
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(getBalance)} class="card">
            Get Balance
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(signMessage)} class="card">
            Sign Message
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(sendTransaction)} class="card">
            Send Transaction
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(logout)} class="card">
            Log Out
          </button>
        </div>
        <div>
          <button onClick={criticalResetAccount} class="card">
            [CRITICAL] Reset Account
          </button>
        </div>
        <div>
          <button onClick={exportSeed} class="card">
            [CRITICAL] Export Seed
          </button>
        </div>
        <div>
          <button onClick={exportMnemonicFactor} class="card">
            Generate Backup (Mnemonic)
          </button>
        </div>
      </div>
    </>
  );

  const unloggedInView = (
    <>
      <button onClick={loginWithDiscord} class="card">
        Login with discord
      </button>
      <button onClick={loginWithAuth0Google} class="card">
        Login with google
      </button>
      <button onClick={loginWithAuth0Twitter} class="card">
        Login with twitter
      </button>
      <button onClick={loginWithAuth0EmailPasswordless} class="card">
        Login with Passwordless
      </button>
      <div
        class={
          coreKitStatus() === COREKIT_STATUS.REQUIRED_SHARE ? "" : "disabledDiv"
        }
      >
        <button onClick={() => getDeviceFactor()} class="card">
          Get Device Factor
        </button>
        <label>Recover Using Mnemonic Factor Key:</label>
        <input
          value={mnemonicFactor()}
          onChange={(e) => setMnemonicFactor(e.target.value)}
        ></input>
        <button
          onClick={() => MnemonicToFactorKeyHex(mnemonicFactor())}
          class="card"
        >
          Get Recovery Factor Key using Mnemonic
        </button>
        <label>Backup/ Device Factor: {backupFactorKey()}</label>
        <button onClick={() => inputBackupFactorKey()} class="card">
          Input Backup Factor Key
        </button>
        <button onClick={criticalResetAccount} class="card">
          [CRITICAL] Reset Account
        </button>
      </div>
    </>
  );

  return (
    <div class="container">
      <h1 class="title">
        <a
          target="_blank"
          href="https://web3auth.io/docs/sdk/core-kit/mpc-core-kit/"
          rel="noreferrer"
        >
          Web3Auth MPC Core Kit
        </a>{" "}
        Solana Example
      </h1>

      <div class="grid">
        {coreKitStatus() === COREKIT_STATUS.LOGGED_IN
          ? loggedInView
          : unloggedInView}
      </div>
      <div id="console" style={{ "white-space": "pre-line" }}>
        <p style={{ "white-space": "pre-line" }}></p>
      </div>

      <footer class="footer">
        <a
          href="https://github.com/Web3Auth/web3auth-core-kit-examples/tree/main/mpc-core-kit-web/mpc-core-kit-solana"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code
        </a>
      </footer>
    </div>
  );
};

export default Home;
