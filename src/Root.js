import { BrowserRouter as Router } from "react-router-dom";
import App from "./App";
import WalletProvider from "./common/context/walletProvider";
import { React, useState } from "react";

const Root = () => {
    const [wallet, setWallet] = useState({
        accounts: []
    });

    return (
        <Router>
            <WalletProvider.Provider value={{ wallet, setWallet }}>
                <App />
            </WalletProvider.Provider>
        </Router>
    );
};

export default Root;
