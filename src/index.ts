import { zipRepoJsZip } from './lib/zipHelper';
import { uploadRepo } from './lib/arweaveHelper';
import { getRepos, postRepoToWarp } from './lib/warpHelper';
import { getTags, getTitle, removeCacheFolder } from './lib/common';

// Set up constants
const PATH = '.';
// const FOLDER_TO_ZIP = '.git'; // Only compress `.git` folder
const FOLDER_TO_ZIP = '.'; // Compress the full repo
const USE_GITIGNORE = true; // Use `.gitignore` to avoid compressing secrets

// Set up a regex for repo names compliance
const NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const title = getTitle();

async function main() {
    // check name complies with name rules
    if (!NAME_REGEX.test(title)) {
        console.error(
            `[ PL Sync ] Repo name can ONLY contain ASCII letters, digits and the characters '.', '-', and '_'`
        );
        process.exit(1);
    }

    console.log(`[ PL Sync ] Starting sync for repo '${title}'`);

    // delete warp cache folder
    await removeCacheFolder();

    // get existing repos for this wallet
    const repos = await getRepos();

    // check if repo already exists
    let repoInfo = repos.find(
        (r) => r.name.toLowerCase() === title.toLowerCase()
    );

    // compress the repo
    let zipBuffer;
    try {
        zipBuffer = await zipRepoJsZip(
            title,
            PATH,
            FOLDER_TO_ZIP,
            USE_GITIGNORE
        );
    } catch (error) {
        console.error('Error zipping repository:', error);
        process.exit(1);
    }

    const tags = getTags(!repoInfo ? true : false);

    const dataTxId = await uploadRepo(zipBuffer, tags);

    if (dataTxId) postRepoToWarp(dataTxId, repoInfo);
}

// Run the main function
(async () => {
    await main();
})();