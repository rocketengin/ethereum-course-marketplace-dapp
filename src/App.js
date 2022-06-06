import { React } from "react";
import { Switch, Route } from "react-router-dom";
import "./App.scss";
import DashboardPage from "./features/dashboard/components/DashboardPage";
import BecomeAProPage from "./features/pro/components/BecomeAProPage";
import ProServicesPage from "./features/services/components/ProServicesPage";
import ServiceProvidersPage from "./features/serviceProviders/components/ServiceProvidersPage";
import ServiceContractsPage from "./features/serviceContracts/components/ServiceContractsPage";
import ServiceAgreementsPage from "./features/serviceAgreements/components/ServiceAgreementsPage";
import Header from "./features/header/components/Header";
import Footer from "./features/footer/components/Footer";
import PageNotFound from "./features/PageNotFound";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faSearch, faUserCircle } from "@fortawesome/free-solid-svg-icons";

library.add(faSearch, faUserCircle);

const App = () => (
    <div className="layout">
        <Header />
        <main>
            <Switch>
                <Route exact path="/" component={DashboardPage} />
                <Route path="/pro" component={BecomeAProPage} />
                <Route path="/my-services" component={ProServicesPage} />
                <Route
                    path="/service-providers"
                    component={ServiceProvidersPage}
                />
                <Route
                    path="/service-contracts"
                    component={ServiceContractsPage}
                />
                <Route
                    path="/service-agreements"
                    component={ServiceAgreementsPage}
                />
                <Route component={PageNotFound} />
            </Switch>
        </main>
        <Footer />
    </div>
);

export default App;
