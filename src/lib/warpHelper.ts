import { WarpFactory, defaultCacheOptions } from 'warp-contracts';
import { v4 as uuidv4 } from 'uuid';
import {
    getDescription,
    getTitle,
    getWallet,
    getWarpContractTxId,
    waitFor,
} from './common';
import { getAddress } from './arweaveHelper';
import { trackAmplitudeAnalyticsEvent } from './analytics';

const jwk = getWallet();
const contractTxId = getWarpContractTxId();
const title = getTitle();
const description = getDescription();

const getWarp = () =>
    WarpFactory.forMainnet({
        ...defaultCacheOptions,
        inMemory: true,
    });
const contract = getWarp().contract(contractTxId).connect(jwk);

export async function getRepos() {
    const address = await getAddress();

    // let warp throw error if it can't retrieve the repositories
    const response = await contract.viewState({
        function: 'getRepositoriesByOwner',
        payload: {
            owner: address,
        },
    });
    return response.result as { id: string; name: string }[];
}

export async function postRepoToWarp(
    dataTxId: string,
    repoInfo?: { id: string } | undefined
) {
    if (repoInfo) {
        try {
            const result = await updateRepo(repoInfo.id, dataTxId);
            await trackAmplitudeAnalyticsEvent(
                'Repository',
                'Add files to repo',
                'Add files',
                {
                    repo_name: title,
                    repo_id: result.id,
                    result: 'SUCCESS',
                }
            );
            return result;
        } catch (error) {
            await trackAmplitudeAnalyticsEvent(
                'Repository',
                'Add files to repo',
                'Add files',
                {
                    repo_name: title,
                    repo_id: repoInfo.id,
                    result: 'FAILED',
                    error: 'Failed to update repository',
                }
            );
            throw error;
        }
    } else {
        try {
            const result = await newRepo(dataTxId);
            await trackAmplitudeAnalyticsEvent(
                'Repository',
                'Successfully created a repo',
                'Create new repo',
                {
                    repo_id: result.id,
                    repo_name: title,
                }
            );
            return result;
        } catch (error) {
            await trackAmplitudeAnalyticsEvent(
                'Repository',
                'Failed to create a new repo',
                'Create new repo'
            );
            throw error;
        }
    }
}

async function newRepo(dataTxId: string) {
    if (!title || !dataTxId) throw '[ warp ] No title or dataTx for new repo';

    // const contract = getWarp().contract(contractTxId).connect(jwk);

    const uuid = uuidv4();

    const payload = { id: uuid, name: title, description, dataTxId };

    await waitFor(500);

    // let warp throw error if it can't perform the writeInteraction
    await contract.writeInteraction({
        function: 'initialize',
        payload,
    });

    console.log(`[ warp ] Repo '${title}' initialized with id '${uuid}'`);

    return { id: uuid };
}

async function updateRepo(id: string, dataTxId: string) {
    if (!id || !title || !dataTxId)
        throw '[ warp ] No id, title or dataTxId to update repo ';

    // const contract = getWarp().contract(contractTxId).connect(jwk);

    const payload = { id, name: title, description, dataTxId };

    await waitFor(500);

    // let warp throw error if it can't perform the writeInteraction
    await contract.writeInteraction({
        function: 'updateRepositoryTxId',
        payload,
    });

    console.log(`[ warp ] Repo '${title}' with id '${payload.id}' updated`);

    return { id: payload.id };
}
