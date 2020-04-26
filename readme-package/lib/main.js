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
const fs_1 = require("fs");
const yaml = __importStar(require("js-yaml"));
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput('token');
            const packagePath = core.getInput('package', { required: true });
            const commit = core.getInput('commit') === 'true';
            const message = core.getInput('message');
            const user = core.getInput('user');
            const email = core.getInput('email');
            const file = core.getInput('file');
            const configPath = core.getInput('config');
            const github = new github_1.GitHub(token);
            const packageFile = yield fs_1.promises.readFile(packagePath);
            const packageInfo = JSON.parse(packageFile.toString());
            const configFile = yield fs_1.promises.readFile(configPath);
            const config = yaml.load(configFile.toString());
            const content = createReadme(packageInfo, config);
            core.info('Config');
            core.info(JSON.stringify(config, null, 2));
            if (commit) {
                yield updateContent(github, content, file, message, user, email);
            }
            core.info('Content Output');
            core.info(content);
            core.setOutput('content', content);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function createReadme(info, config) {
    let format = '';
    format += `# ${info.name}\r\n`;
    format += `${info.displayName}\r\n`;
    format += '\r\n';
    format += '## Info\r\n';
    format += ` - **Version**: \`${info.version}\`\r\n`;
    format += ` - **Unity**: \`${info.unity}\`\r\n`;
    if (info.api !== '') {
        format += ` - **API Compatibility Level**: \`${info.api}\`\r\n`;
    }
    format += '\r\n';
    if (info.dependencies != null) {
        format += '### Dependencies';
        const keys = Object.keys(info.dependencies);
        if (keys.length > 0) {
            for (const key of keys) {
                const value = info.dependencies[key];
                format += ` - ${key}: \'${value}\'`;
            }
        }
        else {
            format += ' - N/A\r\n';
        }
        format += '\r\n';
    }
    format += '### Description\r\n';
    if (info.description !== '') {
        format += `${info.description}\r\n`;
    }
    else {
        format += 'No description.\r\n';
    }
    if (config.fullDescription !== '') {
        format += `\r\n${config.fullDescription}\r\n`;
    }
    format += '\r\n';
    if (config.closing !== '') {
        format += `${config.closing}\r\n`;
    }
    if (config.footer !== '') {
        format += `\r\n${config.footer}`;
        format += '\r\n';
    }
    return format;
}
function updateContent(github, content, file, message, user, email) {
    return __awaiter(this, void 0, void 0, function* () {
        const info = yield github.request(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/contents/${file}`);
        const base64 = Buffer.from(content).toString('base64');
        const sha = info.data.sha;
        core.info('Content Info');
        core.info(JSON.stringify(info, null, 2));
        const response = yield github.repos.createOrUpdateFile({
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
        core.info('Create or Update File Response');
        core.info(JSON.stringify(response, null, 2));
    });
}
