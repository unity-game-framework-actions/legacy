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
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const start = core.getInput('start');
            const end = core.getInput('end', { required: true });
            const endType = core.getInput('endType', { required: true });
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function getName(start, end, endType) {
    switch (endType) {
        case 'Date':
            return getNameByDate(start, end);
        case 'Length':
            return getNameByLength(start, Number.parseInt(end));
        default:
            throw `Invalid end type specified: '${endType}'.`;
    }
}
function getNameByDate(start, end) {
    const startDate = start === '' ? new Date() : new Date(start);
    const endDate = new Date(end);
    return formatDate(startDate, endDate);
}
function getNameByLength(start, end) {
    const startDate = start === '' ? new Date() : new Date(start);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + end);
    return formatDate(startDate, endDate);
}
function formatDate(start, end) {
    const dayFormat = new Intl.DateTimeFormat('en', { day: '2-digit' });
    const monthFormat = new Intl.DateTimeFormat('en', { month: 'short' });
    const yearFormat = new Intl.DateTimeFormat('en', { year: 'numeric' });
    const startDay = dayFormat.format(start);
    const startMonth = monthFormat.format(start);
    const startYear = yearFormat.format(start);
    const endDay = dayFormat.format(end);
    const endMonth = monthFormat.format(end);
    const endYear = yearFormat.format(end);
    let result = '';
    result += `${startDay} ${startMonth} `;
    if (startYear !== endYear) {
        result += `${startYear} `;
    }
    result += `- ${endDay} ${endMonth} ${endYear}`;
    return '';
}
