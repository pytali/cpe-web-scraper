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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var node_util_1 = require("node:util");
var writeFile = (0, node_util_1.promisify)(node_fs_1.default.writeFile);
var access = (0, node_util_1.promisify)(node_fs_1.default.access);
function setup() {
    return __awaiter(this, void 0, void 0, function () {
        var rootDir, envPath, _a, envContent, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    rootDir = node_path_1.default.resolve(__dirname, '..');
                    envPath = node_path_1.default.join(rootDir, '.env');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 7, , 8]);
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, access(envPath)];
                case 3:
                    _b.sent();
                    console.log('⚠️  Arquivo .env já existe. Pulando...');
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    envContent = "# Configura\u00E7\u00E3o IXC\nIXC_CDY_TOKEN=\"XX:hash\"\nIXC_CDY_URL=\"https://ixc.example.com/webservice/v1\"\n\nIXC_BD_TOKEN=\"XX:hash\"\nIXC_BD_URL=\"https://ixc.example.com/webservice/v1\"\n\nIXC_BR364_TOKEN=\"XX:hash\"\nIXC_BR364_URL=\"https://ixc.example.com/webservice/v1\"\n\n# Configura\u00E7\u00E3o TR-069\nTR069_URL=\"http://acs.example.com\"\nTR069_USERNAME=\"admin\"\nTR069_PASSWORD=\"password\"\nTR069_CONN_USERNAME=\"connection\"\nTR069_CONN_PASSWORD=\"password\"\nTR069_INFORM_INTERVAL=\"1200\"\n\n# Configura\u00E7\u00E3o de Dispositivos\nDEVICE_PORT=\"80\"\nDEVICE_USERS=\"user1,user2\"\nDEVICE_PASSWORDS=\"pass1,pass2,pass3\"\n\n# Configura\u00E7\u00E3o de Workers\nWORKER_BATCH_SIZE=\"2\"\nWORKER_POOL_SIZE=\"1\"";
                    return [4 /*yield*/, writeFile(envPath, envContent)];
                case 5:
                    _b.sent();
                    console.log('✅ Arquivo .env criado com sucesso!');
                    return [3 /*break*/, 6];
                case 6:
                    console.log('\n🎉 Setup concluído! Por favor, atualize as configurações no arquivo:');
                    console.log("- ".concat(envPath));
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _b.sent();
                    console.error('❌ Erro durante o setup:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
setup();
