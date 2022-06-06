import React from "react";

const walletProvider = React.createContext({
    wallet: {
        accounts: []
    },
    setWallet: () => {}
});
export default walletProvider;
