import * as web3nomodal from "@web3auth/no-modal";
const { Web3AuthNoModal } = web3nomodal;
import * as web3base from "@web3auth/base";
const { CHAIN_NAMESPACES, WEB3AUTH_NETWORK, UX_MODE, WALLET_ADAPTERS } =
  web3base;
import * as web3openlogin from "@web3auth/openlogin-adapter";
import * as solanaprovider from "@web3auth/solana-provider";
import {
  Show,
  VoidComponent,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";

import RPC from "../lib/solana-rpc";

export const W3Auth: VoidComponent = () => {
  const clientId =
    "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io
  const [web3auth, setWeb3auth] = createSignal<
    web3base.IWeb3Auth | undefined
  >();
  const [provider, setProvider] = createSignal<
    web3base.IProvider | undefined
  >();
  const [loggedIn, setLoggedIn] = createSignal<boolean>(false);

  const rpc = createMemo(() => {
    const prov = provider();
    if (!prov) {
      return;
    }
    return new RPC(prov);
  });
  createEffect(() => {
    console.log({ rpc: rpc(), provider: provider() });
  });

  onMount(async () => {
    console.log("on mount!");
    try {
      const chainConfig = {
        chainNamespace: CHAIN_NAMESPACES.SOLANA,
        chainId: "0x3", // Please use 0x1 for Mainnet, 0x2 for Testnet, 0x3 for Devnet
        rpcTarget: "https://api.devnet.solana.com",
        displayName: "Solana Devnet",
        blockExplorerUrl: "https://explorer.solana.com",
        ticker: "SOL",
        tickerName: "Solana Token",
        logo: "",
      };
      console.log({ chainConfig });

      const privateKeyProvider = new solanaprovider.SolanaPrivateKeyProvider({
        config: { chainConfig },
      });

      console.log({ privateKeyProvider });

      const web3auth = new Web3AuthNoModal({
        clientId,
        privateKeyProvider,
        web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
      });

      setWeb3auth(web3auth);

      const openloginAdapter = new web3openlogin.OpenloginAdapter({
        privateKeyProvider,
        adapterSettings: {
          uxMode: UX_MODE.REDIRECT,
        },
      });
      web3auth.configureAdapter(openloginAdapter);

      await web3auth.init();
      // setProvider(web3auth.provider ?? undefined);
      if (web3auth.connected) {
        setLoggedIn(true);
      }
    } catch (error) {
      console.error(error);
    }
  });

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }

  const login = async () => {
    console.log("login!");
    const auth = web3auth();
    if (!auth) {
      console.log("missing web3 auth: ", { auth });
      uiConsole("web3auth not initialized yet");
      return;
    }
    const web3authProvider = await auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, {
      loginProvider: "google",
    });
    console.log({ web3authProvider });
    setProvider(web3authProvider ?? undefined);
  };
  //
  // const authenticateUser = async () => {
  //   const auth = web3auth();
  //   if (!auth) {
  //     uiConsole("web3auth not initialized yet");
  //     return;
  //   }
  //   const idToken = await auth.authenticateUser();
  //   uiConsole(idToken);
  // };
  //
  // const getUserInfo = async () => {
  //   const auth = web3auth();
  //   if (!auth) {
  //     uiConsole("web3auth not initialized yet");
  //     return;
  //   }
  //   const user = await auth.getUserInfo();
  //   uiConsole(user);
  // };
  //
  // const logout = async () => {
  //   const auth = web3auth();
  //   if (!auth) {
  //     uiConsole("web3auth not initialized yet");
  //     return;
  //   }
  //   await auth.logout();
  //   setProvider();
  //   setLoggedIn(false);
  // };
  //
  // const getAccounts = async () => {
  //   const prov = provider();
  //   if (!prov) {
  //     uiConsole("provider not initialized yet");
  //     return;
  //   }
  //   const rpc = new RPC(prov);
  //   const address = await rpc.getAccounts();
  //   uiConsole(address);
  // };
  //
  // const getBalance = async () => {
  //   const _rpc = rpc();
  //   if (!_rpc) {
  //     uiConsole("provider not initialized yet");
  //     return;
  //   }
  //   const balance = await _rpc.getBalance();
  //   uiConsole(balance);
  // };
  //
  // const sendTransaction = async () => {
  //   const _rpc = rpc();
  //   if (!_rpc) {
  //     uiConsole("provider not initialized yet");
  //     return;
  //   }
  //   const receipt = await _rpc.sendTransaction();
  //   uiConsole(receipt);
  // };
  //
  // const sendVersionTransaction = async () => {
  //   const _rpc = rpc();
  //   if (!_rpc) {
  //     uiConsole("provider not initialized yet");
  //     return;
  //   }
  //   const receipt = await _rpc.sendVersionTransaction();
  //   uiConsole(receipt);
  // };
  //
  // const signVersionedTransaction = async () => {
  //   const _rpc = rpc();
  //   if (!_rpc) {
  //     uiConsole("provider not initialized yet");
  //     return;
  //   }
  //   const receipt = await _rpc.signVersionedTransaction();
  //   uiConsole(receipt);
  // };
  //
  // const signAllVersionedTransaction = async () => {
  //   const _rpc = rpc();
  //   if (!_rpc) {
  //     uiConsole("provider not initialized yet");
  //     return;
  //   }
  //   const receipt = await _rpc.signAllVersionedTransaction();
  //   uiConsole(receipt);
  // };
  //
  // const signAllTransaction = async () => {
  //   const _rpc = rpc();
  //   if (!_rpc) {
  //     uiConsole("provider not initialized yet");
  //     return;
  //   }
  //   const receipt = await _rpc.signAllTransaction();
  //   uiConsole(receipt);
  // };
  //
  // // const mintNFT = async () => {
  // //   if (!provider) {
  // //     uiConsole("provider not initialized yet");
  // //     return;
  // //   }
  // //   const rpc = new RPC(provider);
  // //   const NFT = await rpc.mintNFT();
  // //   uiConsole(NFT);
  // // };
  //
  // const signMessage = async () => {
  //   const _rpc = rpc();
  //   if (!_rpc) {
  //     uiConsole("provider not initialized yet");
  //     return;
  //   }
  //   const signedMessage = await _rpc.signMessage();
  //   uiConsole(signedMessage);
  // };
  //
  // const getPrivateKey = async () => {
  //   const _rpc = rpc();
  //   if (!_rpc) {
  //     uiConsole("provider not initialized yet");
  //     return;
  //   }
  //   const privateKey = await _rpc.getPrivateKey();
  //   uiConsole(privateKey);
  // };
  //
  return (
    <main class="m-auto px-8 w-3/5">
      <h1 class="text-3xl text-center m-12">
        <a
          class="text-[#0070f3] decoration-transparent"
          target="_blank"
          href="https://web3auth.io/docs/sdk/pnp/web/no-modal"
          rel="noreferrer"
        >
          Web3Auth{" "}
        </a>
        & Solidjs Example
      </h1>

      <button
        onClick={async () => {
          console.log("login pressed!");
          await login();
        }}
      >
        Login
      </button>

      <div class="flex items-center flex-col">
        <Show
          when={loggedIn()}
          fallback={
            <button
              onClick={async () => {
                console.log("login pressed!");
                // await login();
              }}
              class="card"
            >
              Login
            </button>
          }
        >
          <>
            {/*


            <div class="flex-container">
              <div>
                <button onClick={getUserInfo} class="card">
                  Get User Info
                </button>
              </div>
              <div>
                <button onClick={authenticateUser} class="card">
                  Get ID Token
                </button>
              </div>
              <div>
                <button onClick={getAccounts} class="card">
                  Get Accounts
                </button>
              </div>
              <div>
                <button onClick={getBalance} class="card">
                  Get Balance
                </button>
              </div>
              <div>
                <button onClick={signMessage} class="card">
                  Sign Message
                </button>
              </div>
              <div>
                <button onClick={sendTransaction} class="card">
                  Send Transaction
                </button>
              </div>
              <div>
                <button onClick={sendVersionTransaction} class="card">
                  Send Version Transaction
                </button>
              </div>
              <div>
                <button onClick={signVersionedTransaction} class="card">
                  Sign Versioned Transaction
                </button>
              </div>
              <div>
                <button onClick={signAllVersionedTransaction} class="card">
                  Sign All Versioned Transaction
                </button>
              </div>
              <div>
                <button onClick={signAllTransaction} class="card">
                  Sign All Transaction
                </button>
              </div>

<div>
          <button onClick={mintNFT} class="card">
            Mint NFT
          </button>
        </div>
        *
              <div>
                <button onClick={getPrivateKey} class="card">
                  Get Private Key
                </button>
              </div>
              <div>
                <button onClick={logout} class="card">
                  Log Out
                </button>
              </div>
            </div>
            <div id="console" style={{ "white-space": "pre-line" }}>
              <p style={{ "white-space": "pre-line" }}>
                Logged in Successfully!
              </p>
            </div>
            */}
          </>
        </Show>
      </div>

      <footer class="flex flex-auto py-8 border border-[#eaeaea] justify-center items-center mt-40">
        <a
          class="flex justify-center items-center flex-grow"
          href="https://github.com/Web3Auth/web3auth-pnp-examples/tree/main/web-no-modal-sdk/blockchain-connection-examples/solana-no-modal-example"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code
        </a>
        <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FWeb3Auth%2Fweb3auth-pnp-examples%2Ftree%2Fmain%2Fweb-no-modal-sdk%2Fblockchain-connection-examples%2Fsolana-no-modal-example&project-name=w3a-solana-no-modal&repository-name=w3a-solana-no-modal">
          <img src="https://vercel.com/button" alt="Deploy with Vercel" />
        </a>
      </footer>
    </main>
  );
};
