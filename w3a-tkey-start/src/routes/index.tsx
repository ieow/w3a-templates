import {
  Component,
  Show,
  batch,
  createEffect,
  createSignal,
  onMount,
} from "solid-js";
import { TKey } from "@tkey/core";
import { WebStorageModule } from "@tkey/web-storage";
import { KEY_TYPE, TORUS_SAPPHIRE_NETWORK } from "@toruslabs/constants";
import { TorusServiceProvider } from "@tkey/service-provider-torus";
import {
  TorusAggregateLoginResponse,
  TorusVerifierResponse,
} from "@toruslabs/customauth";
import { getKeyCurve, getPostboxKeyFrom1OutOf1 } from "@toruslabs/torus.js";
import { BN } from "bn.js";
import { TorusStorageLayer } from "@tkey/storage-layer-torus";
// import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider/dist/solanaProvider.esm";
import { SessionManager } from "@toruslabs/session-manager";
import { getED25519Key } from "@toruslabs/openlogin-ed25519";
import { AggregateLoginParams } from "@toruslabs/customauth";

// import SolanaRpc from "./rpc";

const web3AuthClientId =
  "BNBNpzCHEqOG-LIYygpzo7wsN8PDLjPjoh6GnuAwJth_prYW-pdy2O7kqE0C5lrGCnlJfCZx4_OEItGTcti6q1A"; // get from https://dashboard.web3auth.io
// Configuration of Modules
const webStorageModule = new WebStorageModule();
const storageLayer = new TorusStorageLayer({
  hostUrl: "https://metadata.tor.us",
});

const auth0domainUrl = "https://dev-n82s5hbtzoxieejz.us.auth0.com";
const auth0ClientId = "Di3KAujLiJzPM3a4rVOOdiLLMxA5qanl";
const aggregateVerifierIdentifier = "w3a-universal-verifier";
const redirect_uri = "https://w3a-tkey-start.pages.dev";
const serviceProvider = new TorusServiceProvider({
  enableLogging: true,
  customAuthArgs: {
    web3AuthClientId,
    baseUrl: window.location.origin,
    redirectPathName: "",
    enableLogging: true,
    uxMode: "redirect",
    network: TORUS_SAPPHIRE_NETWORK.SAPPHIRE_DEVNET,
    keyType: KEY_TYPE.ED25519,
  },
});

// Instantiation of tKey
let tKey = new TKey({
  modules: {
    webStorage: webStorageModule,
  },
  manualSync: true,
  serviceProvider,
  storageLayer,
});

const Home: Component = () => {
  // const [coreKitStatus, setCoreKitStatus] = createSignal<COREKIT_STATUS>(
  //   COREKIT_STATUS.NOT_INITIALIZED,
  // );
  //
  const [tkeyInitialised, setTKeyInitialised] = createSignal(false);
  const [loginRes, setLoginRes] = createSignal<TorusAggregateLoginResponse>();
  // const [provider, setProvider] = createSignal<SolanaPrivateKeyProvider>();
  const [userInfo, setUserInfo] = createSignal<TorusVerifierResponse>();

  createEffect(() => {
    console.log({ initialised: tkeyInitialised(), loginRes: loginRes() });
  });

  onMount(async () => {
    try {
      const sessionId = localStorage.getItem("session_id");

      if (sessionId) {
        const sessionManagerInstance = new SessionManager({ sessionId });
        const raw = (await sessionManagerInstance.authorizeSession()) as any;
        const { userInfo, ...data } = raw;
        console.log({ data, userInfo });
        tKey = await TKey.fromJSON(data, {
          enableLogging: true,
          modules: {
            webStorage: webStorageModule,
          },
          manualSync: true,
          serviceProvider,
          storageLayer,
        });

        await (tKey.serviceProvider as TorusServiceProvider).init({
          skipSw: true,
          skipPrefetch: true,
        });

        const loginDetails = await (
          tKey.serviceProvider as TorusServiceProvider
        ).customAuthInstance.storageHelper.retrieveLoginDetails(sessionId);
        console.log({ loginDetails });

        const loginArgs = loginDetails.args as AggregateLoginParams;
        const subInfos = loginArgs.subVerifierDetailsArray.map((s) => ({
          idToken: s.clientId,
          verifier: s.verifier,
        }));

        console.log({ aggregateVerifierIdentifier, subInfos });

        // await (
        //   tKey.modules.webStorage as WebStorageModule
        // ).inputShareFromWebStorage();

        const res = await (
          tKey.serviceProvider as TorusServiceProvider
        ).customAuthInstance
          .getAggregateTorusKey(
            aggregateVerifierIdentifier,
            userInfo.email,
            subInfos,
          )
          .catch((e) => {
            console.error("getAggregateTorusKey error: ", { e });
          });

        console.log("torus key: ", { res });
        await reconstructKey();

        // console.log("existing session user info: ", { res });
      }

      await (tKey.serviceProvider as TorusServiceProvider).init({
        skipSw: true,
        skipPrefetch: true,
      });

      // Init is required for Redirect Flow but skip fetching sw.js and redirect.html )
      if (
        window.location.hash.includes("#state") ||
        window.location.hash.includes("#access_token") ||
        window.location.hash.includes("#token_type")
      ) {
        let result = await (
          tKey.serviceProvider as TorusServiceProvider
        ).customAuthInstance.getRedirectResult({
          clearLoginDetails: true,
          replaceUrl: true,
        });

        const res = result.result as TorusAggregateLoginResponse;
        const sessionId = SessionManager.generateRandomSessionKey();
        localStorage.setItem("session_id", sessionId);

        tKey.serviceProvider.postboxKey = new BN(
          getPostboxKeyFrom1OutOf1(
            getKeyCurve(KEY_TYPE.ED25519),
            res.postboxKeyData.privKey,
            res.metadata.nonce.toString("hex"),
          ),
          "hex",
        );

        (
          tKey.serviceProvider as TorusServiceProvider
        ).customAuthInstance.storageHelper.storeLoginDetails(
          { args: result.args, method: "triggerAggregateLogin" },
          sessionId,
        );

        // Initialization of tKey
        const result = await tKey.initialize(); // 1/2 flow

        if (result.requiredShares > 0) {
          await tKey.modules.webStorage.inputShareFromWebStorage();
        } 
        await tKey.reconstructKey();

        await tKey.syncLocalMetadataTransitions();
        
        const sessionManagerInstance = new SessionManager({ sessionId });
        const data = tKey.toJSON();
        const sessionData = { ...data, userInfo: res.userInfo[0] };
        console.log({ session_data: sessionData });
        await sessionManagerInstance.createSession(sessionData);

        const { requiredShares } = tKey.getKeyDetails();
        console.log({ requiredShares });

        if (requiredShares > 0) {
          uiConsole(
            "Please enter your backup shares, requiredShares:",
            requiredShares,
          );
        } else {
          await reconstructKey();
        }

        batch(() => {
          setTKeyInitialised(true);
          setLoginRes(res);
          setUserInfo(res.userInfo[0]);
        });
      }
    } catch (error) {
      console.error(error);
    }
    // // try {
    // //   let result = securityQuestion.getQuestion(coreKitInstance!);
    // //   setQuestion(result);
    // //   uiConsole("security question set");
    // // } catch (e) {
    // //   uiConsole("security question not set");
    // // }
  });

  const reconstructKey = async () => {
    try {
      const reconstructedKey = await tKey.reconstructKey();
      console.log({ reconstructedKey });
      const seed = reconstructedKey.ed25519Seed;
      if (!seed) {
        console.error("failed to reconstruct ed25519 seed!");
        return;
      }

      const ed25519key = getED25519Key(
        reconstructedKey.secp256k1Key.toString("hex"),
      ).sk.toString("hex");

      console.log({ ed25519key });

      // const privateKeyProvider = new SolanaPrivateKeyProvider({
      //   config: {
      //     chainConfig: {
      //       chainNamespace: "solana",
      //       chainId: "0x3", // Please use 0x1 for Mainnet, 0x2 for Testnet, 0x3 for Devnet
      //       rpcTarget: "https://api.devnet.solana.com",
      //       displayName: "Solana Devnet",
      //       blockExplorerUrl: "https://explorer.solana.com",
      //       ticker: "SOL",
      //       tickerName: "Solana Token",
      //       logo: "",
      //     },
      //   },
      // });
      //
      // await privateKeyProvider.setupProvider(ed25519key);
      // console.log({ privateKeyProvider });
      // setProvider(privateKeyProvider);
      // setLoggedIn(true);
      // setDeviceShare();
    } catch (e) {
      uiConsole(e);
    }
  };
  // onMount(async () => {
  //   console.log("initialigin core kit instance!!");
  //   await coreKitInstance.init();
  //   setCoreKitStatus(coreKitInstance.status);
  // });
  //
  // const loginWithAuth0Google = async () => {
  //   try {
  //     if (!coreKitInstance) {
  //       throw new Error("initiated to login");
  //     }
  //
  //     // IMP START - Login
  //     const verifierConfig = {
  //       aggregateVerifierIdentifier,
  //       subVerifierDetailsArray: [
  //         {
  //           typeOfLogin: "jwt", // auth0 uses jwt logins
  //           verifier: "w3a-a0-google",
  //           clientId: auth0ClientId,
  //           jwtParams: {
  //             connection: "google-oauth2",
  //             domain: auth0domainUrl,
  //             verifierIdField: "email",
  //           },
  //         },
  //       ],
  //     } as AggregateVerifierLoginParams;
  //
  //     await coreKitInstance.loginWithOAuth(verifierConfig);
  //     if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
  //       await coreKitInstance.commitChanges(); // Needed for new accounts
  //     }
  //     // IMP END - Login
  //
  //     // IMP START - Recover MFA Enabled Account
  //     if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
  //       uiConsole(
  //         "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]",
  //       );
  //     }
  //     // IMP END - Recover MFA Enabled Account
  //
  //     setCoreKitStatus(coreKitInstance.status);
  //   } catch (error: unknown) {
  //     uiConsole(error);
  //   }
  // };
  //
  // const loginWithAuth0Twitter = async () => {
  //   try {
  //     if (!coreKitInstance) {
  //       throw new Error("initiated to login");
  //     }
  //
  //     // IMP START - Login
  //     const verifierConfig = {
  //       aggregateVerifierIdentifier,
  //       subVerifierDetailsArray: [
  //         {
  //           typeOfLogin: "jwt",
  //           verifier: "w3a-a0-twitter",
  //           clientId: auth0ClientId,
  //           jwtParams: {
  //             connection: "twitter",
  //             domain: auth0domainUrl,
  //             verifierIdField: "email",
  //           },
  //         },
  //       ],
  //     } as AggregateVerifierLoginParams;
  //
  //     await coreKitInstance.loginWithOAuth(verifierConfig);
  //     if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
  //       await coreKitInstance.commitChanges(); // Needed for new accounts
  //     }
  //     // IMP END - Login
  //
  //     // IMP START - Recover MFA Enabled Account
  //     if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
  //       uiConsole(
  //         "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]",
  //       );
  //     }
  //     // IMP END - Recover MFA Enabled Account
  //
  //     setCoreKitStatus(coreKitInstance.status);
  //   } catch (error: unknown) {
  //     uiConsole(error);
  //   }
  // };
  //
  // const loginWithAuth0EmailPasswordless = async () => {
  //   try {
  //     if (!coreKitInstance) {
  //       throw new Error("initiated to login");
  //     }
  //
  //     // IMP START - Login
  //     const verifierConfig = {
  //       aggregateVerifierIdentifier,
  //       subVerifierDetailsArray: [
  //         {
  //           typeOfLogin: "jwt",
  //           verifier: "w3a-a0-email-passwordless",
  //           clientId: auth0ClientId,
  //           jwtParams: {
  //             connection: "email",
  //             domain: auth0domainUrl,
  //             verifierIdField: "email",
  //           },
  //         },
  //       ],
  //     } as AggregateVerifierLoginParams;
  //
  //     await coreKitInstance.loginWithOAuth(verifierConfig);
  //     if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
  //       await coreKitInstance.commitChanges(); // Needed for new accounts
  //     }
  //     // IMP END - Login
  //
  //     // IMP START - Recover MFA Enabled Account
  //     if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
  //       uiConsole(
  //         "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]",
  //       );
  //     }
  //     // IMP END - Recover MFA Enabled Account
  //
  //     setCoreKitStatus(coreKitInstance.status);
  //   } catch (error: unknown) {
  //     uiConsole(error);
  //   }
  // };
  //
  // const loginWithDiscord = async () => {
  //   try {
  //     if (!coreKitInstance) {
  //       throw new Error("initiated to login");
  //     }
  //
  //     const verifierConfig = {
  //       aggregateVerifierIdentifier,
  //       subVerifierDetailsArray: [
  //         {
  //           typeOfLogin: "discord",
  //           verifier: "w3a-discord",
  //           clientId: "1275709031138463754",
  //         },
  //       ],
  //     } satisfies AggregateVerifierLoginParams;
  //
  //     await coreKitInstance.loginWithOAuth(verifierConfig);
  //
  //     if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
  //       // Needed for new accounts
  //       await coreKitInstance.commitChanges();
  //     }
  //
  //     if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
  //       uiConsole(
  //         "Required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]",
  //       );
  //     }
  //
  //     setCoreKitStatus(coreKitInstance.status);
  //   } catch (err) {
  //     uiConsole(err);
  //   }
  // };

  const loginWithDiscord = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      console.log("logging in with google!");
      // Triggering Login using Service Provider ==> opens the popup
      await (
        tKey.serviceProvider as TorusServiceProvider
      ).triggerAggregateLogin({
        aggregateVerifierType: "single_id_verifier",
        verifierIdentifier: aggregateVerifierIdentifier,
        subVerifierDetailsArray: [
          {
            typeOfLogin: "discord",
            verifier: "w3a-discord",
            clientId: "1275709031138463754",
          },
        ],
      });
    } catch (error) {
      uiConsole(error, "caught");
    }
  };

  const loginWithAuth0Google = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    try {
      console.log("logging in with google!");
      // Triggering Login using Service Provider ==> opens the popup
      await (
        tKey.serviceProvider as TorusServiceProvider
      ).triggerAggregateLogin({
        aggregateVerifierType: "single_id_verifier",
        verifierIdentifier: aggregateVerifierIdentifier,
        subVerifierDetailsArray: [
          {
            typeOfLogin: "jwt", // auth0 uses jwt logins
            verifier: "w3a-a0-google",
            clientId: auth0ClientId,
            jwtParams: {
              connection: "google-oauth2",
              domain: auth0domainUrl,
              verifierIdField: "email",
              redirect_uri,
            },
          },
        ],
      });
    } catch (error) {
      uiConsole(error, "caught");
    }
  };

  // const loginWithAuth0Google = async () => {
  //   try {
  //     if (!coreKitInstance) {
  //       throw new Error("initiated to login");
  //     }
  //
  //     // IMP START - Login
  //     const verifierConfig = {
  //       aggregateVerifierIdentifier,
  //       subVerifierDetailsArray: [
  //         {
  //           typeOfLogin: "jwt", // auth0 uses jwt logins
  //           verifier: "w3a-a0-google",
  //           clientId: auth0ClientId,
  //           jwtParams: {
  //             connection: "google-oauth2",
  //             domain: auth0domainUrl,
  //             verifierIdField: "email",
  //           },
  //         },
  //       ],
  //     } as AggregateVerifierLoginParams;
  //
  //     await coreKitInstance.loginWithOAuth(verifierConfig);
  //     if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
  //       await coreKitInstance.commitChanges(); // Needed for new accounts
  //     }
  //     // IMP END - Login
  //
  //     // IMP START - Recover MFA Enabled Account
  //     if (coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE) {
  //       uiConsole(
  //         "required more shares, please enter your backup/ device factor key, or reset account [unrecoverable once reset, please use it with caution]",
  //       );
  //     }
  //     // IMP END - Recover MFA Enabled Account
  //
  //     setCoreKitStatus(coreKitInstance.status);
  //   } catch (error: unknown) {
  //     uiConsole(error);
  //   }
  // };

  // const reconstructKey = async () => {
  // 	try {
  // 		const reconstructedKey = await tKey.reconstructKey();
  // 		const privateKey = reconstructedKey?.privKey.toString('hex');
  //
  // 		await ethereumPrivateKeyProvider.setupProvider(privateKey);
  // 		setProvider(ethereumPrivateKeyProvider);
  // 		setLoggedIn(true);
  // 		setDeviceShare();
  // 	} catch (e) {
  // 		uiConsole(e);
  // 	}
  // };
  //
  // const inputRecoveryShare = async (share: string) => {
  // 	try {
  // 		await tKey.inputShare(share);
  // 		await reconstructKey();
  // 		uiConsole('Recovery Share Input Successfully');
  // 		return;
  // 	} catch (error) {
  // 		uiConsole('Input Recovery Share Error:', error);
  // 	}
  // };

  // const setDeviceShare = async () => {
  //   try {
  //     const generateShareResult = await tKey.generateNewShare();
  //     const share = tKey.outputShareStore(generateShareResult.newShareIndex);
  //     await (tKey.modules.webStorage as WebStorageModule).storeDeviceShare(
  //       share,
  //     );
  //     uiConsole("Device Share Set", JSON.stringify(share));
  //   } catch (error) {
  //     uiConsole("Error", (error as any)?.message.toString(), "error");
  //   }
  // };

  const getAccounts = async () => {
    //   const prov = provider();
    //   if (!prov) {
    //     uiConsole("provider not initialized yet");
    //     return;
    //   }
    //   const rpc = new SolanaRpc(prov);
    //   const address = await rpc.getAccounts();
    //   uiConsole(address);
  };
  //
  const getBalance = async () => {
    //   const _rpc = rpc();
    //   if (!_rpc) {
    //     uiConsole("provider not initialized yet");
    //     return;
    //   }
    //   const balance = await _rpc.getBalance();
    //   uiConsole(balance);
  };

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
  const getPrivateKey = async () => {
    //   const _rpc = rpc();
    //   if (!_rpc) {
    //     uiConsole("provider not initialized yet");
    //     return;
    //   }
    //   const privateKey = await _rpc.getPrivateKey();
    //   console.log({ privateKey });
    //   uiConsole(privateKey);
  };

  // const getDeviceShare = async () => {
  // 	try {
  // 		const share = await (
  // 			tKey.modules.webStorage as WebStorageModule
  // 		).getDeviceShare();
  //
  // 		if (share) {
  // 			uiConsole(
  // 				'Device Share Captured Successfully across',
  // 				JSON.stringify(share),
  // 			);
  // 			setRecoveryShare(share.share.share.toString('hex'));
  // 			return share;
  // 		}
  // 		uiConsole('Device Share Not found');
  // 		return null;
  // 	} catch (error) {
  // 		uiConsole('Error', (error as any)?.message.toString(), 'error');
  // 	}
  // };
  //
  //
  // const changeSecurityQuestionAndAnswer = async () => {
  // 	if (!tKey) {
  // 		uiConsole("tKey not initialized yet");
  // 		return;
  // 	}
  // 	// swal is just a pretty dialog box
  // 	swal('Enter password (>10 characters)', {
  // 		content: 'input' as any,
  // 	}).then(async value => {
  // 		if (value.length > 10) {
  // 			await (tKey.modules.securityQuestions as SecurityQuestionsModule).changeSecurityQuestionAndAnswer(value, 'whats your password?');
  // 			swal('Success', 'Successfully changed new share with password.', 'success');
  // 			uiConsole('Successfully changed new share with password.');
  // 		} else {
  // 			swal('Error', 'Password must be >= 11 characters', 'error');
  // 		}
  // 	});
  // 	const keyDetails = await tKey.getKeyDetails();
  // 	uiConsole(keyDetails);
  // };
  //
  // const generateNewShareWithPassword = async () => {
  // 	if (!tKey) {
  // 		uiConsole("tKey not initialized yet");
  // 		return;
  // 	}
  // 	// swal is just a pretty dialog box
  // 	swal('Enter password (>10 characters)', {
  // 		content: 'input' as any,
  // 	}).then(async value => {
  // 		if (value.length > 10) {
  // 			try {
  // 				await (tKey.modules.securityQuestions as SecurityQuestionsModule).generateNewShareWithSecurityQuestions(
  // 					value,
  // 					'whats your password?',
  // 				);
  // 				swal('Success', 'Successfully generated new share with password.', 'success');
  // 				uiConsole('Successfully generated new share with password.');
  // 			} catch (error) {
  // 				swal('Error', (error as any)?.message.toString(), 'error');
  // 			}
  // 		} else {
  // 			swal('Error', 'Password must be >= 11 characters', 'error');
  // 		}
  // 	});
  // }
  //
  // const RecoverPasswordShare = async (password: string) => {
  // 	if (!tKey) {
  // 		uiConsole("tKey not initialized yet");
  // 		return;
  // 	}
  //
  // 	try {
  // 		if (password.length > 10) {
  // 			await (tKey.modules.securityQuestions as SecurityQuestionsModule).inputShareFromSecurityQuestions(password);
  // 			await reconstructKey();
  // 			uiConsole('Successfully recovered new share with password.');
  //
  // 		} else {
  // 			throw new Error('Password must be >= 11 characters');
  // 		}
  // 	} catch (error) {
  // 		uiConsole(error);
  // 	}
  // }
  //
  // const exportMnemonicShare = async () => {
  // 	try {
  // 		const generateShareResult = await tKey.generateNewShare();
  // 		const share = await tKey.outputShareStore(
  // 			generateShareResult.newShareIndex,
  // 		).share.share;
  // 		const mnemonic = await (
  // 			tKey.modules.shareSerialization as ShareSerializationModule
  // 		).serialize(share, 'mnemonic');
  // 		uiConsole(mnemonic);
  // 		return mnemonic;
  // 	} catch (error) {
  // 		uiConsole(error);
  // 	}
  // };
  //
  // const MnemonicToShareHex = async (mnemonic: string) => {
  // 	if (!tKey) {
  // 		uiConsole('tKey not initialized yet');
  // 		return;
  // 	}
  // 	try {
  // 		const share = await (
  // 			tKey.modules.shareSerialization as ShareSerializationModule
  // 		).deserialize(mnemonic, 'mnemonic');
  // 		setRecoveryShare(share.toString("hex"));
  // 		return share;
  // 	} catch (error) {
  // 		uiConsole(error);
  // 	}
  // };

  const keyDetails = async () => {
    if (!tKey) {
      uiConsole("tKey not initialized yet");
      return;
    }
    const keyDetails = tKey.getKeyDetails();
    uiConsole(keyDetails);
  };

  // const criticalResetAccount = async (): Promise<void> => {
  // 	// This is a critical function that should only be used for testing purposes
  // 	// Resetting your account means clearing all the metadata associated with it from the metadata server
  // 	// The key details will be deleted from our server and you will not be able to recover your account
  // 	if (!tKeyInitialised) {
  // 		throw new Error("tKeyInitialised is initialised yet");
  // 	}
  // 	await tKey.storageLayer.setMetadata({
  // 		privKey: tKey.serviceProvider.postboxKey,
  // 		input: { message: "KEY_NOT_FOUND" },
  // 	});
  // 	uiConsole('reset');
  // 	logout();
  // }
  //
  // const logout = async () => {
  // 	setProvider(null);
  // 	setLoggedIn(false);
  // 	setUserInfo({});
  // 	uiConsole("logged out");
  // };
  const getUserInfo = async () => {
    uiConsole(userInfo());
  };
  //
  // const getChainID = async () => {
  // 	if (!provider) {
  // 		console.log("provider not initialized yet");
  // 		return;
  // 	}
  // 	const web3 = new Web3(provider as any);
  //
  // 	// Get the connected Chain's ID
  // 	const chainId = (await web3.eth.getChainId()).toString(16);
  // 	uiConsole(chainId)
  // }
  //
  // const getAccounts = async () => {
  // 	if (!provider) {
  // 		console.log("provider not initialized yet");
  // 		return;
  // 	}
  // 	const web3 = new Web3(provider as any);
  //
  // 	// Get user's Ethereum public address
  // 	const address = await web3.eth.getAccounts();
  // 	uiConsole(address)
  // }
  //
  // const getBalance = async () => {
  // 	if (!provider) {
  // 		console.log("provider not initialized yet");
  // 		return;
  // 	}
  // 	const web3 = new Web3(provider as any);
  //
  // 	// Get user's Ethereum public address
  // 	const address = (await web3.eth.getAccounts())[0];
  //
  // 	// Get user's balance in ether
  // 	const balance = web3.utils.fromWei(
  // 		await web3.eth.getBalance(address), // Balance is in wei
  // 		"ether"
  // 	);
  // 	uiConsole(balance)
  // }
  //
  // const signMessage = async (): Promise<any> => {
  // 	if (!provider) {
  // 		console.log("provider not initialized yet");
  // 		return;
  // 	}
  // 	const web3 = new Web3(provider as any);
  //
  // 	// Get user's Ethereum public address
  // 	const fromAddress = (await web3.eth.getAccounts())[0];
  //
  // 	const originalMessage = "YOUR_MESSAGE";
  //
  // 	// Sign the message
  // 	const signedMessage = await web3.eth.personal.sign(
  // 		originalMessage,
  // 		fromAddress,
  // 		"test password!" // configure your own password here.
  // 	);
  //
  // 	uiConsole(signedMessage)
  // }
  //
  // const sendTransaction = async () => {
  // 	if (!provider) {
  // 		console.log("provider not initialized yet");
  // 		return;
  // 	}
  // 	const web3 = new Web3(provider as any);
  //
  // 	// Get user's Ethereum public address
  // 	const fromAddress = (await web3.eth.getAccounts())[0];
  //
  // 	const destination = "0x4041FF26b6713FCd5659471521BA2e514E23750d";
  //
  // 	// Convert amount to wei
  // 	const amount = web3.utils.toWei("0.04", "ether");
  //
  // 	// Submit transaction to the blockchain and wait for it to be mined
  // 	const receipt = await web3.eth.sendTransaction({
  // 		from: fromAddress,
  // 		to: destination,
  // 		gasLimit: "21000",
  // 		maxFeePerGas: "300",
  // 		maxPriorityFeePerGas: "10",
  // 		value: amount,
  // 	});
  // 	uiConsole(receipt)
  //  }
  //
  // const enableMFA = async () => {
  //   if (!coreKitInstance) {
  //     throw new Error("CoreKitInstance is not set");
  //   }
  //   try {
  //     const factorKey = await coreKitInstance.enableMFA({});
  //     const factorKeyMnemonic = keyToMnemonic(factorKey);
  //
  //     if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
  //       await coreKitInstance.commitChanges();
  //     }
  //
  //     uiConsole(
  //       "MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key:",
  //       factorKeyMnemonic,
  //     );
  //   } catch (e) {
  //     uiConsole(e);
  //   }
  // };
  //
  // const keyDetails = async () => {
  //   if (!coreKitInstance) {
  //     throw new Error("coreKitInstance not found");
  //   }
  //   uiConsole(coreKitInstance.getKeyDetails());
  // };
  //
  // const exportMnemonicFactor = async (): Promise<void> => {
  //   if (!coreKitInstance) {
  //     throw new Error("coreKitInstance is not set");
  //   }
  //   uiConsole("export share type: ", TssShareType.RECOVERY);
  //   const factorKey = generateFactorKey();
  //   await coreKitInstance.createFactor({
  //     shareType: TssShareType.RECOVERY,
  //     factorKey: factorKey.private,
  //   });
  //   const factorKeyMnemonic = keyToMnemonic(factorKey.private.toString("hex"));
  //   if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
  //     await coreKitInstance.commitChanges();
  //   }
  //   uiConsole("Export factor key mnemonic: ", factorKeyMnemonic);
  // };
  //
  // const getUserInfo = async () => {
  //   const user = coreKitInstance.getUserInfo();
  //   uiConsole(user);
  // };
  //
  // const logout = async () => {
  //   await coreKitInstance.logout();
  //   setCoreKitStatus(coreKitInstance.status);
  //   uiConsole("Logged out");
  // };
  //
  // const getAccounts = async () => {
  //   if (!coreKitInstance) {
  //     uiConsole("Provider not initialized yet");
  //     return;
  //   }
  //   const solanaRPC = new SolanaRPC(coreKitInstance);
  //   const address = solanaRPC.getAccount();
  //   uiConsole(address);
  // };
  //
  // const exportSeed = async () => {
  //   if (!coreKitInstance) {
  //     uiConsole("Provider not initialized yet");
  //     return;
  //   }
  //   try {
  //     const key = await coreKitInstance._UNSAFE_exportTssEd25519Seed();
  //     uiConsole(key);
  //   } catch (e) {
  //     uiConsole(e);
  //   }
  // };
  //
  // const getBalance = async () => {
  //   if (!coreKitInstance) {
  //     uiConsole("Provider not initialized yet");
  //     return;
  //   }
  //
  //   const solanaRPC = new SolanaRPC(coreKitInstance);
  //   const balance = await solanaRPC.getBalance();
  //   uiConsole(balance);
  // };
  //
  // const requestFaucet = async () => {
  //   if (!coreKitInstance) {
  //     uiConsole("Provider not initialized yet");
  //     return;
  //   }
  //
  //   const solanaRPC = new SolanaRPC(coreKitInstance);
  //   const hash = await solanaRPC.requestFaucet();
  //   uiConsole(`Hash: https://explorer.solana.com/tx/${hash}?cluster=devnet`);
  // };
  //
  const processRequest = (method: () => void) => {
    try {
      method();
    } catch (error) {
      uiConsole(error);
    }
  };
  //
  // const signMessage = async () => {
  //   if (!coreKitInstance) {
  //     uiConsole("Provider not initialized yet");
  //     return;
  //   }
  //
  //   uiConsole("Signing Message...");
  //
  //   const solanaRPC = new SolanaRPC(coreKitInstance);
  //   const signedMessage = await solanaRPC.signMessage();
  //   uiConsole(signedMessage);
  // };
  //
  // const sendTransaction = async () => {
  //   if (!coreKitInstance) {
  //     uiConsole("Provider not initialized yet");
  //     return;
  //   }
  //
  //   uiConsole("Sending Transaction...");
  //
  //   const solanaRPC = new SolanaRPC(coreKitInstance);
  //   const hash = await solanaRPC.sendTransaction();
  //   uiConsole(`Hash: https://explorer.solana.com/tx/${hash}?cluster=devnet`);
  // };
  //
  // const criticalResetAccount = async (): Promise<void> => {
  //   // This is a critical function that should only be used for testing purposes
  //   // Resetting your account means clearing all the metadata associated with it from the metadata server
  //   // The key details will be deleted from our server and you will not be able to recover your account
  //   if (!coreKitInstance) {
  //     throw new Error("coreKitInstance is not set");
  //   }
  //
  //   await coreKitInstance.tKey.storageLayer.setMetadata({
  //     privKey: new BN(coreKitInstance.state.postBoxKey!, "hex"),
  //     input: { message: "KEY_NOT_FOUND" },
  //   });
  //
  //   if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
  //     await coreKitInstance.commitChanges();
  //   }
  //   uiConsole("Reset successful");
  //   await logout();
  // };

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
    console.log(...args);
  }

  // const unloggedInView = (
  //   <>
  //     <button onClick={loginWithDiscord} class="card">
  //       Login with discord
  //     </button>
  //     <button onClick={loginWithAuth0Google} class="card">
  //       Login with google
  //     </button>
  //     <button onClick={loginWithAuth0Twitter} class="card">
  //       Login with twitter
  //     </button>
  //     <button onClick={loginWithAuth0EmailPasswordless} class="card">
  //       Login with Passwordless
  //     </button>
  //   </>
  // );

  return (
    <div class="container">
      <h1 class="title">
        <a
          target="_blank"
          href="https://web3auth.io/docs/sdk/core-kit/mpc-core-kit/"
          rel="noreferrer"
        >
          Web3Auth Tkey Core Kit
        </a>{" "}
        Solana Example
      </h1>

      <div class="grid">
        <Show when={loginRes()}>
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
                <button onClick={getAccounts} class="card">
                  Get Accounts
                </button>
              </div>
              <div>
                <button onClick={() => processRequest(getBalance)} class="card">
                  Get Balance
                </button>
              </div>

              <div>
                <button
                  onClick={() => processRequest(getPrivateKey)}
                  class="card"
                >
                  Get Private key
                </button>
              </div>
              {/*

        <div>
          <button onClick={() => processRequest(enableMFA)} class="card">
            Enabla MFA
          </button>
        </div>
        <div>
          <button onClick={() => processRequest(requestFaucet)} class="card">
            Request Faucet
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

        */}
            </div>
          </>
        </Show>
        <button onClick={loginWithAuth0Google}>login with google</button>
        <button onClick={loginWithDiscord}>login with discord</button>
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
