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
const fs_1 = require("fs");
const yaml = __importStar(require("js-yaml"));
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const configPath = core.getInput('config');
            const paramsInput = core.getInput('params');
            const extract = core.getInput('extract') === 'true';
            const extractRegex = core.getInput('extractRegex');
            const type = core.getInput('type');
            const configFile = yield fs_1.promises.readFile(configPath);
            const config = yaml.load(configFile.toString());
            const paramsText = getParams(paramsInput, extract, extractRegex);
            const params = parse(paramsText, type);
            const merge = Object.assign(config, params);
            const content = format(merge, type);
            core.setOutput('content', content);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function format(params, type) {
    switch (type) {
        case 'json':
            return JSON.stringify(params);
        case 'yaml':
            return yaml.dump(params);
        default:
            return JSON.stringify(params);
    }
}
function parse(params, type) {
    switch (type) {
        case 'json':
            return JSON.parse(params);
        case 'yaml':
            return yaml.load(params);
        default:
            return JSON.stringify(params);
    }
}
function getParams(params, extract, regex) {
    const text = extract ? extractFromInput(params, regex) : params;
    if (text === '') {
        return {};
    }
    return text;
}
function extractFromInput(input, regex) {
    const matches = input.match(new RegExp(regex, 'g'));
    if (matches != null && matches.length > 0) {
        for (const match of matches) {
            if (match !== '') {
                return match;
            }
        }
    }
    return '';
}
