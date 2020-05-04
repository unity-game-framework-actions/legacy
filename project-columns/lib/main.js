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
            const projectName = core.getInput('project', { required: true });
            const columnName = core.getInput('column', { required: true });
            const action = core.getInput('action');
            const name = core.getInput('name');
            const position = core.getInput('position');
            const github = new github_1.GitHub(token);
            yield doAction(github, projectName, columnName, action, name, position);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function doAction(github, projectName, columnName, action, name, position) {
    return __awaiter(this, void 0, void 0, function* () {
        const project = yield getProject(github, projectName);
        switch (action) {
            case 'create':
                yield createColumn(github, project, columnName, position);
                break;
            case 'update':
                yield updateColumn(github, project, columnName, name, position);
                break;
            default:
                throw `Invalid action specified: '${action}'. (Must be: create or update)`;
        }
    });
}
function createColumn(github, project, name, position) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield github.projects.createColumn({
            project_id: project.id,
            name: name
        });
        core.info('Create Column');
        core.info(JSON.stringify(response));
        if (position !== '') {
            yield updateColumn(github, project, name, '', position);
        }
    });
}
function updateColumn(github, project, name, updateName, position) {
    return __awaiter(this, void 0, void 0, function* () {
        const column = yield getColumn(github, project, name);
        if (updateName !== '') {
            const response = yield github.projects.updateColumn({
                column_id: column.id,
                name: updateName
            });
            core.info('Update Column');
            core.info(JSON.stringify(response));
        }
        if (position !== '') {
            const pos = yield getPosition(github, position);
            const response = yield github.projects.moveColumn({
                column_id: column.id,
                position: pos
            });
            core.info('Move Column');
            core.info(JSON.stringify(response));
        }
    });
}
function getProject(github, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const projects = yield github.projects.listForRepo({
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo
        });
        for (const project of projects.data) {
            if (project.name === name) {
                return project;
            }
        }
        throw `Project not found by the specified name: '${name}'.`;
    });
}
function getColumn(github, project, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const columns = yield github.projects.listColumns({
            project_id: project.id
        });
        for (const column of columns.data) {
            if (column.name === name) {
                return column;
            }
        }
        throw `Column not found by the specified name: '${name}' (project: '${project.name}').`;
    });
}
function getPosition(github, position) {
    return __awaiter(this, void 0, void 0, function* () {
        if (position.includes(':')) {
            const split = position.split(':');
            if (split.length != 2) {
                throw `Invalid position specified: '${position}'.`;
            }
            const pos = split[0];
            const name = split[1];
            const project = yield getProject(github, name);
            return `${pos}:${project.id}`;
        }
        return position;
    });
}
