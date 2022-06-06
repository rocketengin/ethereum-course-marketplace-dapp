"use strict";

const { ethers } = require("hardhat");
const { expect } = require("chai");
const { BigNumber } = require("ethers");

describe("ServiceAgreement", async () => {
    let ServiceAgreement, instance, tx, owner, provider, client;
    const cost = BigNumber.from(10);

    //Workstatus
    const NOTSTARTED = BigNumber.from(0);
    const STARTED = BigNumber.from(1);
    const COMPLETED = BigNumber.from(2);
    const WILLNOTCOMPLETE = BigNumber.from(3);

    //Rating
    const UNRATED = BigNumber.from(0);
    const ONESTAR = BigNumber.from(1);
    const TWOSTAR = BigNumber.from(2);
    const THREESTAR = BigNumber.from(3);
    const FOURSTAR = BigNumber.from(4);
    const FIVESTAR = BigNumber.from(5);

    //ClientApprovalStatus
    const WAITINGFORAPPROVAL = BigNumber.from(0);
    const APPROVED = BigNumber.from(1);
    const UNAPPROVED = BigNumber.from(2);

    const SHOULDNOTREACH = "If we've got here, we're in trouble";
    const DEFAULT_BALANCE = BigNumber.from(0);

    before(async () => {
        ServiceAgreement = await ethers.getContractFactory("ServiceAgreement");
    });

    beforeEach(async () => {
        [owner, provider, client] = await ethers.getSigners();

        instance = await ServiceAgreement.deploy(
            client.address,
            provider.address,
            cost
        );
        tx = await instance.deployed();
    });

    it("is initialized with a correct default values and can provide the service agreement details", async () => {
        const details = await instance.getAgreementDetails();
        expect(await details[0]).to.be.equal(client.address);
        expect(await details[1]).to.be.equal(provider.address);
        expect(await details[2]).to.equal(DEFAULT_BALANCE);
        expect(await details[3]).to.equal(NOTSTARTED);
        expect(await details[4]).to.equal(WAITINGFORAPPROVAL);
        expect(await details[5]).to.equal(BigNumber.from(0));
        expect(await details[6]).to.be.false;
        expect(await details[7]).to.equal(cost);
    });

    it("agreement status can only be updated by provider", async () => {
        try {
            await instance.connect(client).updateServiceStatus(STARTED);
            throw SHOULDNOTREACH;
        } catch (err) {
            expect(err.message.match(/Only the service provider can call this/))
                .to.be.ok;
        }
    });

    it("agreement status can be updated to all 3 other phases", async () => {
        await instance.connect(provider).updateServiceStatus(STARTED);
        expect(await instance.agreementStatus()).to.equal(STARTED);

        await instance.connect(provider).updateServiceStatus(COMPLETED);
        expect(await instance.agreementStatus()).to.equal(COMPLETED);

        await instance.connect(provider).updateServiceStatus(WILLNOTCOMPLETE);
        expect(await instance.agreementStatus()).to.equal(WILLNOTCOMPLETE);
    });

    it("will only let the client update the approval status of a service", async () => {
        try {
            await instance
                .connect(provider)
                .updateClientApprovalStatus(APPROVED);
            throw SHOULDNOTREACH;
        } catch (err) {
            expect(err.message.match(/Only the client can call this/)).to.be.ok;
        }
    });

    it("will allow client to approve or disapprove a service", async () => {
        await instance.connect(provider).updateServiceStatus(COMPLETED);
        expect(await instance.clientApprovalStatus()).to.equal(
            WAITINGFORAPPROVAL
        );

        await instance.connect(client).updateClientApprovalStatus(APPROVED);
        expect(await instance.clientApprovalStatus()).to.equal(APPROVED);

        await instance.connect(client).updateClientApprovalStatus(UNAPPROVED);
        expect(await instance.clientApprovalStatus()).to.equal(UNAPPROVED);
    });

    it("won't allow a client to approve or disapprove a service until it is completed", async () => {
        try {
            await instance.connect(client).updateClientApprovalStatus(APPROVED);
        } catch (err) {
            expect(
                err.message.match(
                    /The contract has not been marked as completed by the service provider/
                )
            ).to.be.ok;
        }
    });

    it("can get agreement balance", async () => {
        expect(await instance.getAgreementBalance()).to.equal(
            BigNumber.from(0)
        );

        await instance.connect(client).deposit({ value: cost });
        expect(await instance.getAgreementBalance()).to.equal(
            BigNumber.from(cost)
        );
    });

    it("will allow a client to provide a provider rating of all 5 values", async () => {
        expect(await instance.clientRating()).to.equal(UNRATED);

        await instance.connect(client).rateServiceProvider(ONESTAR);
        expect(await instance.clientRating()).to.equal(ONESTAR);

        await instance.connect(client).rateServiceProvider(TWOSTAR);
        expect(await instance.clientRating()).to.equal(TWOSTAR);

        await instance.connect(client).rateServiceProvider(THREESTAR);
        expect(await instance.clientRating()).to.equal(THREESTAR);

        await instance.connect(client).rateServiceProvider(FOURSTAR);
        expect(await instance.clientRating()).to.equal(FOURSTAR);

        await instance.connect(client).rateServiceProvider(FIVESTAR);
        expect(await instance.clientRating()).to.equal(FIVESTAR);
    });

    it("can transfer funds to provider provided the agreement is completed and approved", async () => {
        const details = await instance.getAgreementDetails();
        const amount = details[7];
        await instance.connect(provider).updateServiceStatus(COMPLETED);
        await instance.connect(client).updateClientApprovalStatus(APPROVED);

        expect(await instance.getAgreementBalance()).to.equal(
            BigNumber.from(0)
        );
        await instance.connect(client).deposit({ value: amount });
        expect(await instance.getAgreementBalance()).to.equal(cost);

        await instance.connect(provider).transferFundsToProvider();
        expect(await instance.getAgreementBalance()).to.equal(
            BigNumber.from(0)
        );
    });

    it("will raise a funds transferred event", async () => {
        await instance.connect(provider).updateServiceStatus(COMPLETED);
        await instance.connect(client).updateClientApprovalStatus(APPROVED);
        await instance.connect(client).deposit({ value: cost });

        const clientRating = await instance.clientRating();
        const clientApprovalStatus = await instance.clientApprovalStatus();
        const agreementStatus = await instance.agreementStatus();

        expect(await instance.connect(provider).transferFundsToProvider())
            .to.emit(instance, "AgreementFulfilled")
            .withArgs(
                instance.address,
                clientRating,
                clientApprovalStatus,
                agreementStatus
            );
    });

    it("won't allow a transfer of funds to the provider unless issued by provider", async () => {
        try {
            await instance.connect(client).transferFundsToProvider();
            throw SHOULDNOTREACH;
        } catch (err) {
            expect(err.message.match(/Only the service provider can call this/))
                .to.be.ok;
        }
    });

    it("won't allow a transfer of funds to the provider without the correct smart contract balance", async () => {
        try {
            await instance.connect(provider).transferFundsToProvider();
            throw SHOULDNOTREACH;
        } catch (err) {
            expect(err.message.match(/Contract balance requirement not met/)).to
                .be.ok;
        }
    });

    it("won't allow a transfer of funds to the provider without service completed", async () => {
        await instance.connect(client).deposit({ value: cost });
        try {
            await instance.connect(provider).transferFundsToProvider();
            throw SHOULDNOTREACH;
        } catch (err) {
            expect(err.message.match(/Service was not completed or approved/))
                .to.be.ok;
        }
    });

    it("won't allow a transfer of funds to the provider without service approved", async () => {
        await instance.connect(client).deposit({ value: cost });
        await instance.connect(provider).updateServiceStatus(COMPLETED);

        try {
            await instance.connect(provider).transferFundsToProvider();
            throw SHOULDNOTREACH;
        } catch (err) {
            expect(err.message.match(/Service was not completed or approved/))
                .to.be.ok;
        }
    });

    it("won't allow a transfer of funds to the provider if the agreement has already been fulfilled", async () => {
        await instance.connect(provider).updateServiceStatus(COMPLETED);
        await instance.connect(client).updateClientApprovalStatus(APPROVED);
        await instance.connect(client).deposit({ value: cost });
        await instance.connect(provider).transferFundsToProvider();

        try {
            await instance.connect(provider).transferFundsToProvider();
            throw SHOULDNOTREACH;
        } catch (err) {
            expect(
                err.message.match(
                    /this agreement has already been fulfilled and nullified/
                )
            ).to.be.ok;
        }
    });

    it("refund can only be requested by client", async () => {
        await instance.connect(provider).updateServiceStatus(WILLNOTCOMPLETE);
        await instance.connect(client).deposit({ value: cost });

        try {
            await instance.connect(provider).refund();
            throw SHOULDNOTREACH;
        } catch (err) {
            expect(err.message.match(/Only the client can call this/)).to.be.ok;
        }
    });

    it("will issue a refund if work will not be completed", async () => {
        await instance.connect(provider).updateServiceStatus(WILLNOTCOMPLETE);
        await instance.connect(client).deposit({ value: cost });

        expect(await instance.connect(client).refund()).to.emit(
            instance,
            "AgreementFulfilled"
        );
    });

    it("won't allow a refund to the client if the agreement has already been fulfilled", async () => {
        await instance.connect(provider).updateServiceStatus(WILLNOTCOMPLETE);
        await instance.connect(client).deposit({ value: cost });
        await instance.connect(client).refund();

        try {
            await instance.connect(client).refund();
            throw SHOULDNOTREACH;
        } catch (err) {
            expect(
                err.message.match(
                    /this agreement has already been fulfilled and nullified/
                )
            ).to.be.ok;
        }
    });

    it("won't allow a refund to the client if agreement status is not set to Will Not Complete", async () => {
        await instance.connect(provider).updateServiceStatus(STARTED);
        await instance.connect(client).deposit({ value: cost });

        try {
            await instance.connect(client).refund();
            throw SHOULDNOTREACH;
        } catch (err) {
            expect(
                err.message.match(
                    /The Agreement has not been marked as Will Not Be Completed/
                )
            ).to.be.ok;
        }
    });

    it("won't allow a refund to the client if contract balance is wrong", async () => {
        await instance.connect(provider).updateServiceStatus(WILLNOTCOMPLETE);

        try {
            await instance.connect(client).refund();
            throw SHOULDNOTREACH;
        } catch (err) {
            expect(err.message.match(/There is no funds to refund/)).to.be.ok;
        }
    });
});
