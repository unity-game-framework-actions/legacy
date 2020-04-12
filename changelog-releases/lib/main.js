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
            const commit = core.getInput('commit') === 'true';
            const message = core.getInput('message');
            const user = core.getInput('user');
            const email = core.getInput('email');
            const file = core.getInput('file');
            const header = core.getInput('header');
            const noChangelog = core.getInput('no-changelog');
            const github = new github_1.GitHub(token);
            const content = yield createChangelogContent(github, header, noChangelog);
            if (commit) {
                yield updateChangelogContent(github, content, file, message, user, email);
            }
            core.setOutput('content', content);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function createChangelogContent(github, header, noChangelog) {
    return __awaiter(this, void 0, void 0, function* () {
        const releases = yield github.paginate(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/releases`);
        releases.sort((a, b) => b.name.localeCompare(a.name));
        const content = formatReleaseAll(releases, header, noChangelog);
        return content;
    });
}
function updateChangelogContent(github, content, file, message, user, email) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield github.request(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/contents/${file}`);
        const base64 = Buffer.from(content).toString('base64');
        const sha = response.data.sha;
        yield github.repos.createOrUpdateFile({
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            path: file,
            message: message,
            content: base64,
            sha: sha,
            committer: {
                name: user,
                email: email
            },
            author: {
                name: user,
                email: email
            }
        });
    });
}
function formatReleaseAll(releases, header, noChangelog) {
    let format = `${header}\r\n\r\n`;
    for (const release of releases) {
        format += formatRelease(release, noChangelog);
    }
    return format;
}
function formatRelease(release, noChangelog) {
    const name = release.name !== '' ? release.name : release.tag_name;
    const date = formatDate(release.published_at);
    const body = release.body !== '' ? release.body : noChangelog;
    return `## ${name} - ${date}\r\n${body}\r\n\r\n`;
}
function formatDate(date) {
    const index = date.indexOf('T');
    return date.substr(0, index);
}
