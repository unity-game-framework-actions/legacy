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
            const commitContent = core.getInput('commit-content');
            const commitMessage = core.getInput('commit-message');
            const commitUserName = core.getInput('commit-user-name');
            const commitUserEmail = core.getInput('commit-user-email');
            const contentName = core.getInput('content-name');
            const contentHeader = core.getInput('content-header');
            const github = new github_1.GitHub(token);
            const content = yield createChangelogContent(github, contentHeader);
            if (commitContent) {
                yield updateChangelogContent(github, content, contentName, commitMessage, commitUserName, commitUserEmail);
            }
            core.setOutput('content', content);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function createChangelogContent(github, header) {
    return __awaiter(this, void 0, void 0, function* () {
        const releases = yield github.paginate(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/releases`);
        releases.sort((a, b) => a.name.localeCompare(b.name));
        const content = formatReleaseAll(releases, header);
        return content;
    });
}
function updateChangelogContent(github, content, contentName, message, userName, userEmail) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield github.request(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/contents/${contentName}`);
        const base64 = new Buffer(content).toString('base64');
        const sha = response.data.sha;
        yield github.repos.createOrUpdateFile({
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            path: contentName,
            message: message,
            content: base64,
            sha: sha,
            committer: {
                name: userName,
                email: userEmail
            },
            author: {
                name: userName,
                email: userEmail
            }
        });
    });
}
function formatReleaseAll(releases, header) {
    let format = `${header}\n\n`;
    for (const release of releases) {
        format += formatRelease(release);
    }
    return format;
}
function formatRelease(release) {
    const name = release.name;
    const date = formatDate(release.published_at);
    const body = release.body;
    return `## ${name} - ${date}\n${body}\n\n`;
}
function formatDate(date) {
    const index = date.indexOf('T');
    return date.substr(0, index);
}
