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
const fs_1 = require("fs");
const yaml = __importStar(require("js-yaml"));
const object_path_1 = __importDefault(require("object-path"));
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const fileInput = core.getInput('file', { required: true });
            const isPath = core.getInput('isPath', { required: true }) === 'true';
            const write = core.getInput('write') === 'true';
            const getInput = core.getInput('get');
            const setInput = core.getInput('set');
            const type = core.getInput('type');
            const content = yield getContent(fileInput, isPath, type);
            const get = yield getContent(getInput, false, type);
            const set = yield getContent(setInput, false, type);
            getProps(content, get);
            setProps(content, set);
            const output = format(content, type);
            if (isPath && write) {
                setContent(output, fileInput);
            }
            core.setOutput('content', output);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function getProps(content, get) {
    const keys = Object.keys(get);
    for (const key of keys) {
        const prop = get[key];
        const value = object_path_1.default.get(content, prop.path);
        if (prop.step) {
            core.setOutput(key, value);
        }
        if (prop.env) {
            core.exportVariable(key, value);
        }
    }
}
function setProps(content, set) {
    const keys = Object.keys(set);
    for (const key of keys) {
        const prop = set[key];
        object_path_1.default.set(content, prop.path, prop.value);
    }
}
function setContent(input, path) {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs_1.promises.writeFile(path, input);
    });
}
function getContent(input, isPath, type) {
    return __awaiter(this, void 0, void 0, function* () {
        if (isPath) {
            const file = yield fs_1.promises.readFile(input);
            return parse(file.toString(), type);
        }
        return parse(input, type);
    });
}
function format(input, type) {
    switch (type) {
        case 'json':
            return JSON.stringify(input);
        case 'yaml':
            return yaml.dump(input);
        default:
            throw `Invalid parse type: '${type}'.`;
    }
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
