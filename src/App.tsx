import {
  AssetTransferApi,
  constructApiPromise,
} from "@substrate/asset-transfer-api";

import { Keyring, WsProvider } from "@polkadot/api";
import {
  web3Accounts,
  web3Enable,
  web3FromSource,
} from "@polkadot/extension-dapp";
import { useEffect, useState } from "react";

const extensions = await web3Enable("Transact USDC");
const POLKADOT_ASSET_HUB = 0;
const PARACHAIN_ID = "1000";
const WESTMINT_RPC = "wss://westmint-rpc.polkadot.io";
const STATEMINT_RPC = "wss://polkadot-asset-hub-rpc.polkadot.io";
const allAccounts = formatAddress(
  await web3Accounts({ extensions: extensions[0].name }),
  POLKADOT_ASSET_HUB
  // 2
);

const { api, specName, safeXcmVersion } = await constructApiPromise(
  STATEMINT_RPC
  // WESTMINT_RPC
);
const assetsApi = new AssetTransferApi(api, specName, safeXcmVersion);
// const ASSET_ID = 8; //JOE TEST TOKEN
const ASSET_ID = 1337; //USDC
const asset = {
  parents: 0,
  interior: {
    X2: [{ PalletInstance: 50 }, { GeneralIndex: ASSET_ID }],
  },
};
const { name, symbol, decimals } = await assetsApi.api.query.assets.metadata(
  ASSET_ID
);

function formatAddress(array, encode) {
  const keyring = new Keyring();

  if (encode === POLKADOT_ASSET_HUB)
    return array.map((obj) => ({
      ...obj,
      address: keyring.encodeAddress(obj.address, encode),
    }));

  return array;
}

function App() {
  const [account, setAccount] = useState(allAccounts[0]);
  const [balance, setBalance] = useState("null");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");

  const handleAccountChange = (event) => {
    const selectedAccount = allAccounts.find(
      (elm) => elm.address === event.target.value
    );
    setAccount(selectedAccount);
  };

  const handleRecipientChange = (event) => {
    setRecipientAddress(event.target.value);
  };

  const handleAmountChange = (event) => {
    setAmount(event.target.value);
  };

  const handleTransact = async () => {
    const transferExtrinsic = assetsApi.api.tx.assets.transferKeepAlive(
      ASSET_ID,
      recipientAddress,
      BigInt(amount)
    );

    const injector = await web3FromSource(account.meta.source);
    transferExtrinsic
      .signAndSend(
        account.address,
        {
          signer: injector.signer,
          assetId: asset,
        },
        ({ status }) => {
          if (status.isInBlock) {
            console.log(
              `Completed at block hash #${status.asInBlock.toString()}`
            );
          } else {
            console.log(`Current status: ${status.type}`);
          }
        }
      )
      .catch((error) => {
        console.log(":( transaction failed", error);
      });
  };

  // const handleTransactionNew = async () => {
  //   const txInfo = await assetsApi.createTransferTransaction(
  //     PARACHAIN_ID,
  //     recipientAddress,
  //     [ASSET_ID],
  //     [amount.toString()],
  //     {
  //       format: "payload",
  //       keepAlive: true,
  //       paysWithFeeDest: asset,
  //       sendersAddr: account.address,
  //     }
  //   );
  //   const injector = await web3FromSource(account.meta.source);

  //   const payload = assetsApi.api.createType("ExtrinsicPayload", txInfo.tx, {
  //     version: 4,
  //   });

  //   const extrinsic = assetsApi.api.registry.createType(
  //     "Extrinsic",
  //     { method: payload.method },
  //     { version: 4 }
  //   );

  //   assetsApi.api
  //     .tx(extrinsic)
  //     .signAndSend(
  //       account.address,
  //       {
  //         signer: injector.signer,
  //         assetId: asset,
  //       },
  //       ({ status }) => {
  //         if (status.isInBlock) {
  //           console.log(
  //             `Completed at block hash #${status.asInBlock.toString()}`
  //           );
  //         } else {
  //           console.log(`Current status: ${status.type}`);
  //         }
  //       }
  //     )
  //     .catch((error: any) => {
  //       console.log(":( transaction failed", error);
  //     });
  // };

  useEffect(() => {
    assetsApi.api.query.assets
      .account(ASSET_ID, account.address)
      .then(({ value }) =>
        !value.balance ? setBalance(0) : setBalance(value.balance.words[0])
      );
  }, [account]);

  return (
    <div>
      <div>Transact {String.fromCharCode.apply(null, symbol)}</div>
      <div>
        <label>From: </label>
        {allAccounts && (
          <select value={account.address} onChange={handleAccountChange}>
            {allAccounts.map((elm, index) => (
              <option key={index} value={elm.address}>
                {elm.address}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label>Balance: {balance}</label>
      </div>

      <div>
        <label>To: </label>
        <input
          type="text"
          value={recipientAddress}
          onChange={handleRecipientChange}
          placeholder="To address"
        />
      </div>

      <div>
        <label>Amount: </label>
        <input
          type="number"
          value={amount}
          onChange={handleAmountChange}
          placeholder="Enter amount to send"
        />
      </div>

      <button onClick={handleTransact}>Transact</button>
    </div>
  );
}

export default App;
