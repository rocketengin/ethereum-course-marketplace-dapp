"use strict";

const { serviceProvider1, serviceProvider2 } = require("./testAccounts");
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("ServiceManager", async () => {
    let ServiceManager,
        instance,
        owner,
        provider,
        client,
        nonServiceAgreementAccount,
        tx;

    before(async () => {
        ServiceManager = await ethers.getContractFactory("ServiceManager");
    });

    beforeEach(async () => {
        [owner, provider, client] = await ethers.getSigners();

        instance = await ServiceManager.deploy();
        tx = await instance.deployed();
    });

    describe("Service Providers", async () => {
        it("should allow for storing and retrieving a new service provider", async () => {
            await instance
                .connect(provider)
                .createNewServiceProvider(
                    serviceProvider1.companyName,
                    serviceProvider1.email,
                    serviceProvider1.phone,
                    serviceProvider1.serviceAmount,
                    serviceProvider1.serviceCategory
                );
            const value = await instance.getServiceProvider(provider.address);

            const [
                retrieved,
                companyName,
                email,
                serviceCategory,
                phone,
                serviceAmount,
                index,
            ] = value;

            expect(retrieved).to.equal(provider.address);
            expect(companyName).to.be.equal(serviceProvider1.companyName);
            expect(email).to.be.equal(serviceProvider1.email);
            expect(phone).to.be.equal(serviceProvider1.phone);
            expect(serviceCategory).to.be.equal(
                serviceProvider1.serviceCategory
            );
            expect(serviceAmount).to.equal(serviceProvider1.serviceAmount);
            expect(index).to.equal(0);
        });

        it("should allow for retrieving multiple service providers", async () => {
            await instance
                .connect(provider)
                .createNewServiceProvider(
                    serviceProvider1.companyName,
                    serviceProvider1.email,
                    serviceProvider1.phone,
                    serviceProvider1.serviceAmount,
                    serviceProvider1.serviceCategory
                );
            await instance
                .connect(provider)
                .createNewServiceProvider(
                    serviceProvider2.companyName,
                    serviceProvider2.email,
                    serviceProvider2.phone,
                    serviceProvider2.serviceAmount,
                    serviceProvider2.serviceCategory
                );

            const value = await instance.getServiceProviders();

            expect(value.length).to.equal(2);
        });

        it("Get Service Providers will return empty array if there are no service providers", async () => {
            const value = await instance.getServiceProviders();

            expect(value.length).to.equal(0);
        });

        it("should keep integrity of the providers index", async () => {
            await instance
                .connect(provider)
                .createNewServiceProvider(
                    serviceProvider1.companyName,
                    serviceProvider1.email,
                    serviceProvider1.phone,
                    serviceProvider1.serviceAmount,
                    serviceProvider1.serviceCategory
                );
            await instance
                .connect(client)
                .createNewServiceProvider(
                    serviceProvider2.companyName,
                    serviceProvider2.email,
                    serviceProvider2.phone,
                    serviceProvider2.serviceAmount,
                    serviceProvider2.serviceCategory
                );

            const [, , , , , , index2] = await instance.getServiceProvider(
                provider.address
            );
            expect(index2).to.be.equal(0);

            const [, , , , , , index3] = await instance.getServiceProvider(
                client.address
            );
            expect(index3).to.be.equal(1);
        });

        it("emits an event including provider address on creation of a new service provider", async () => {
            expect(
                await instance
                    .connect(provider)
                    .createNewServiceProvider(
                        serviceProvider1.companyName,
                        serviceProvider1.email,
                        serviceProvider1.phone,
                        serviceProvider1.serviceAmount,
                        serviceProvider1.serviceCategory
                    )
            )
                .to.emit(instance, "RegisteredServiceProvider")
                .withArgs(provider.address);
        });
    });

    describe("Service Provider Errors", async () => {
        it("should return error when there is no service providers", async () => {
            try {
                await instance
                    .connect(provider)
                    .getServiceProvider(client.address);
            } catch (err) {
                expect(err.message.includes(`No Service Providers`)).to.equal(
                    true
                );
            }
        });

        it("should return error when a service provider address doesn't exist", async () => {
            try {
                await instance
                    .connect(provider)
                    .createNewServiceProvider(
                        serviceProvider1.companyName,
                        serviceProvider1.email,
                        serviceProvider1.phone,
                        serviceProvider1.serviceAmount,
                        serviceProvider1.serviceCategory
                    );
                await instance.getServiceProvider(client.address);
            } catch (err) {
                expect(
                    err.message.includes("Service Provider does not exist")
                ).to.equal(true);
            }
        });
    });

    describe("Service Agreements", async () => {
        let retrieved;

        beforeEach(async () => {
            await instance
                .connect(provider)
                .createNewServiceProvider(
                    serviceProvider1.companyName,
                    serviceProvider1.email,
                    serviceProvider1.phone,
                    serviceProvider1.serviceAmount,
                    serviceProvider1.serviceCategory
                );

            [retrieved] = await instance
                .connect(client)
                .getServiceProvider(provider.address);
        });

        it("should create a new ServiceAgreement between Provider and client", async () => {
            await instance.connect(client).createServiceAgreement(retrieved);

            const clientAgreements = await instance.getClientServiceAgreements(
                client.address
            );
            const providerAgreements =
                await instance.getProviderServiceAgreements(provider.address);

            expect(clientAgreements.length).to.be.equal(1);
            expect(providerAgreements.length).to.be.equal(1);
        });

        it("should allow for the retrieval of all client and provider service agreements", async () => {
            await instance.connect(client).createServiceAgreement(retrieved);

            const clientAgreements = await instance.getClientServiceAgreements(
                client.address
            );
            const providerAgreements =
                await instance.getProviderServiceAgreements(provider.address);

            expect(clientAgreements.length).to.be.equal(1);
            expect(providerAgreements.length).to.be.equal(1);
        });

        it("create new service agreement emits NewAgreement event", async () => {
            const tx = await instance
                .connect(client)
                .createServiceAgreement(retrieved);

            const agreementAddresses = await instance
                .connect(provider)
                .getProviderServiceAgreements(provider.address);

            expect(tx)
                .to.emit(instance, "NewAgreement")
                .withArgs(
                    client.address,
                    provider.address,
                    agreementAddresses[0]
                );
        });
    });

    describe("ServiceManager Service Agreement Errors", async () => {
        let retrieved, amount, tx;

        beforeEach(async () => {
            await instance
                .connect(provider)
                .createNewServiceProvider(
                    serviceProvider1.companyName,
                    serviceProvider1.email,
                    serviceProvider1.phone,
                    ethers.utils.parseUnits("20000", "ether"),
                    serviceProvider1.serviceCategory
                );

            [retrieved, , , , , amount] = await instance
                .connect(client)
                .getServiceProvider(provider.address);
        });

        it("should not allow providers to create agreements with themselves", async () => {
            try {
                await instance
                    .connect(provider)
                    .createServiceAgreement(retrieved);
            } catch (err) {
                expect(
                    err.message.match(
                        /Provider cannot create service agreement with themselves/
                    )
                ).to.be.ok;
            }
        });
        it("should not allow agreement for less than the specified service amount", async () => {
            try {
                await instance
                    .connect(client)
                    .createServiceAgreement(retrieved);
            } catch (err) {
                expect(err.message.match(/Insufficient funds/)).to.be.ok;
            }
        });
    });
});
