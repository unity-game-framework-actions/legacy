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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
const fs_1 = require("fs");
const yaml = __importStar(require("js-yaml"));
const indent_string_1 = __importDefault(require("indent-string"));
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput('token');
            const milestone = core.getInput('milestone');
            const configPath = core.getInput('config');
            const github = new github_1.GitHub(token);
            const file = yield fs_1.promises.readFile(configPath);
            const config = yaml.load(file.toString());
            const content = yield createChangelogContent(github, milestone, config);
            core.setOutput('content', content);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function createChangelogContent(github, milestoneNumberOrTitle, config) {
    return __awaiter(this, void 0, void 0, function* () {
        let content = '';
        const milestone = yield getMilestone(github, milestoneNumberOrTitle);
        const groups = [];
        for (const group of config) {
            const issues = yield github.paginate(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/issues?milestone=${milestone.number}&state=all&labels=${group.labels}`);
            if (issues.length > 0) {
                groups.push({
                    name: group.name,
                    issues: issues
                });
            }
        }
        content += formatMilestone(milestone);
        content += formatIssues(groups);
        return content;
    });
}
function getMilestone(github, milestoneNumberOrTitle) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const milestones = yield github.paginate(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/milestones/${milestoneNumberOrTitle}`);
            return milestones[0];
        }
        catch (error) {
            const milestones = yield github.paginate(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/milestones?state=all`);
            for (const milestone of milestones) {
                if (milestone.title === milestoneNumberOrTitle) {
                    return milestone;
                }
            }
            throw `Milestone not found by the specified number or title: '${milestoneNumberOrTitle}'.`;
        }
    });
}
function formatMilestone(milestone) {
    let format = '';
    format += ` - [Milestone](${milestone.html_url}?closed=1)\r\n\r\n`;
    if (milestone.description !== '') {
        format += `${milestone.description}\r\n\r\n`;
    }
    return format;
}
function formatIssues(groups) {
    let format = '';
    for (const group of groups) {
        format += `### ${group.name}\r\n`;
        for (const issue of group.issues) {
            format += ` - ${formatIssue(issue)}\r\n`;
        }
        format += '\r\n';
    }
    return format;
}
function formatIssue(issue) {
    let format = `${issue.title} ([#${issue.number}](${issue.html_url}))`;
    if (issue.body !== '') {
        const body = indent_string_1.default(issue.body, 4);
        format += `\r\n${body}`;
    }
    return format;
}
