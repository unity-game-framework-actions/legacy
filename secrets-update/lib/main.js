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
const yaml = __importStar(require("js-yaml"));
const sodium = __importStar(require("tweetsodium"));
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput('token');
            const repository = core.getInput('repo', { required: true });
            const secrets = core.getInput('secrets');
            const type = core.getInput('type');
            const github = new github_1.GitHub(token);
            const repoInfo = getOwnerAndRepo(repository);
            const secretsData = parse(secrets, type);
            yield updateSecrets(github, repoInfo.owner, repoInfo.repo, secretsData);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function updateSecrets(github, owner, repo, secrets) {
    return __awaiter(this, void 0, void 0, function* () {
        const keyInfo = yield github.actions.getPublicKey({
            owner: owner,
            repo: repo
        });
        const keys = Object.keys(secrets);
        for (const key of keys) {
            const value = secrets[key];
            const encrypted = encrypt(keyInfo.data.key, value);
            yield github.actions.createOrUpdateSecretForRepo({
                owner: owner,
                repo: repo,
                name: key,
                encrypted_value: encrypted,
                key_id: keyInfo.data.key_id
            });
        }
    });
}
function encrypt(key, value) {
    const messageBytes = Buffer.from(value);
    const keyBytes = Buffer.from(key, 'base64');
    const encryptedBytes = sodium.seal(messageBytes, keyBytes);
    const encrypted = Buffer.from(encryptedBytes).toString('base64');
    core.setSecret(encrypted);
    return encrypted;
}
function parse(input, type) {
    if (input === '') {
        return {};
    }
    switch (type) {
        case 'json':
            return JSON.parse(input);
        case 'yaml':
            return yaml.load(input);
        default:
            throw `Invalid parse type: '${type}'.`;
    }
}
function getOwnerAndRepo(repo) {
    const split = repo.split('/');
    if (split.length < 2) {
        throw `Invalid repository name: '${repo}'.`;
    }
    return {
        owner: split[0],
        repo: split[1]
    };
}
