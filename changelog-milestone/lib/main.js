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
            const milestone = core.getInput('milestone');
            const groupsConfig = core.getInput('groups-config');
            const github = new github_1.GitHub(token);
            const groupLabels = JSON.parse(groupsConfig);
            const content = yield createChangelogContent(github, milestone, groupLabels);
            core.setOutput('content', content);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function createChangelogContent(github, milestoneNumber, groupLabels) {
    return __awaiter(this, void 0, void 0, function* () {
        const milestone = yield github.paginate(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/milestones/${milestoneNumber}`);
        const issues = yield github.paginate(`GET /repos/${github_1.context.repo.owner}/${github_1.context.repo.repo}/issues?milestone=${milestoneNumber}&state=closed`);
        const map = getIssueGroupsMap(issues, groupLabels);
        const groups = getIssueGroups(map);
        let content = '';
        content += ` - [Milestone](${milestone.html_url})\r\n`;
        if (milestone.description !== '') {
            content += `<br/>${milestone.description}\r\n`;
        }
        content += formatIssues(groups);
        if (core.isDebug()) {
            core.debug(`Milestone: ${JSON.stringify(milestone)}`);
            core.debug(`Issues: ${JSON.stringify(issues)}`);
        }
        return content;
    });
}
function formatIssues(groups) {
    let format = '';
    for (const group of groups) {
        format += `### ${group.name}\r\n`;
        for (const issue of group.issues) {
            format += ` - ${formatIssue(issue)}\r\n`;
        }
    }
    return format;
}
function formatIssue(issue) {
    let format = `${issue.title} ([#${issue.number}](${issue.html_url}))`;
    if (issue.body !== '') {
        format += `<br/>${issue.body}`;
    }
    return format;
}
function getIssueGroups(issues) {
    const groups = [];
    issues.forEach((value, key) => {
        const group = {
            name: key,
            issues: value
        };
        group.issues.sort((a, b) => b.title.localeCompare(a.title));
        groups.push(group);
    });
    groups.sort((a, b) => b.name.localeCompare(a.name));
    return groups;
}
function getIssueGroupsMap(issues, groupLabels) {
    const map = new Map();
    for (const issue of issues) {
        const groupName = getIssueGroupName(issue, groupLabels);
        if (groupName != null) {
            let collection = map.get(groupName);
            if (collection == undefined) {
                collection = [];
                map.set(groupName, collection);
            }
            collection.push(issue);
        }
    }
    return map;
}
function getIssueGroupName(issue, groupLabels) {
    const labels = issue.labels;
    for (const label of labels) {
        const name = label.name;
        const groupName = getGroupNameByLabel(groupLabels, name);
        if (groupName != null) {
            return groupName;
        }
    }
    return null;
}
function getGroupNameByLabel(groupLabels, label) {
    for (const group of groupLabels) {
        if (group.labels.includes(label)) {
            return group.name;
        }
    }
    return null;
}
