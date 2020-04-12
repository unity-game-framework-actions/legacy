"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput('token');
            const id = core.getInput('id');
            const tag = core.getInput('tag');
            const commitish = core.getInput('commitish');
            const name = core.getInput('name');
            const body = core.getInput('body');
            const draft = core.getInput('draft');
            const prerelease = core.getInput('prerelease');
            const github = new github_1.GitHub(token);
            const release = yield getRelease(github, id);
            if (release != null) {
                const change = {
                    tag: tag,
                    commitish: commitish,
                    name: name,
                    body: body,
                    draft: draft,
                    prerelease: prerelease
                };
                const changed = changeRelease(release, change);
                yield updateRelease(github, changed);
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function getRelease(github, idOrTag) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const releases = yield github.paginate(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/releases/${idOrTag}`);
            return releases[0];
        }
        catch (error) {
            const releases = yield github.paginate(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/releases`);
            for (const release of releases) {
                if (release.tag_name === idOrTag) {
                    return release;
                }
            }
            core.warning(`Release by the specified id or tag name not found: '${idOrTag}'.`);
            return null;
        }
    });
}
function updateRelease(github, release) {
    return __awaiter(this, void 0, void 0, function* () {
        yield github.repos.updateRelease({
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            release_id: release.id,
            tag_name: release.tag_name,
            target_commitish: release.target_commitish,
            name: release.name,
            body: release.body,
            draft: release.draft,
            prerelease: release.prerelease
        });
    });
}
function changeRelease(release, change) {
    if (change.tag !== '') {
        release.tag_name = change.tag;
    }
    if (change.commitish !== '') {
        release.target_commitish = change.commitish;
    }
    if (change.name !== '') {
        release.name = change.name;
    }
    if (change.body !== '') {
        release.body = change.body;
    }
    if (change.draft !== '') {
        release.draft = change.draft === 'true';
    }
    if (change.prerelease !== '') {
        release.prerelease = change.prerelease === 'true';
    }
    return release;
}
