"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSequenceNumber = generateSequenceNumber;
const crypto_1 = __importDefault(require("crypto"));
function generateSequenceNumber(prefix) {
    const randomSuffix = crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${new Date().getFullYear()}-${timestamp}-${randomSuffix}`;
}
