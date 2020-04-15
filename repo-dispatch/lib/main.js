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
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput('token');
            const repository = core.getInput('repository');
            const eventType = core.getInput('eventType', { required: true });
            const type = core.getInput('type');
            const payloadText = core.getInput('payload');
            const github = new github_1.GitHub(token);
            const repo = getOwnerAndRepo(repository);
            const payload = parse(payloadText, type);
            yield dispatch(github, repo.owner, repo.repo, eventType, payload);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function dispatch(github, owner, repo, eventType, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield github.repos.createDispatchEvent({
            owner: owner,
            repo: repo,
            event_type: eventType,
            client_payload: JSON.stringify(payload)
        });
        core.info('Create Dispatch Event Response');
        core.info(JSON.stringify(response, null, 2));
    });
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
