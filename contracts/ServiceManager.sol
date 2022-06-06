// SPDX-License-Identifier: PRIVATE

pragma solidity ^0.8.4;

contract ServiceManager {
    string[] serviceProviders;

    function createNewServiceProvider(string memory _companyName) external {
        serviceProviders.push(_companyName);
    }

    function getServiceProviders() external view returns (string[] memory) {
        return serviceProviders;
    }
}
