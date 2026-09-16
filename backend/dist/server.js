"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const customer_routes_1 = __importDefault(require("./routes/customer.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const enquiry_routes_1 = __importDefault(require("./routes/enquiry.routes"));
const quotation_routes_1 = __importDefault(require("./routes/quotation.routes"));
const salesOrder_routes_1 = __importDefault(require("./routes/salesOrder.routes"));
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({
    origin: '*',
    credentials: true,
}));
exports.app.use(express_1.default.json());
// Health Check
exports.app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'PERN Mini ERP & Manufacturing Supply Operations API',
    });
});
// API Routes
exports.app.use('/api/auth', auth_routes_1.default);
exports.app.use('/api/customers', customer_routes_1.default);
exports.app.use('/api/products', product_routes_1.default);
exports.app.use('/api/enquiries', enquiry_routes_1.default);
exports.app.use('/api/quotations', quotation_routes_1.default);
exports.app.use('/api/sales-orders', salesOrder_routes_1.default);
// 404 Handler
exports.app.use((req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});
// Global Error Handler
exports.app.use((err, req, res, next) => {
    console.error('Unhandled API Error:', err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: err.message || 'Internal Server Error',
        code: err.code,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
});
const PORT = process.env.PORT || 5001;
if (process.env.NODE_ENV !== 'test') {
    exports.app.listen(PORT, () => {
        console.log(`🚀 PERN Mini ERP API Server running on port ${PORT}`);
        console.log(`📡 Health check: http://localhost:${PORT}/health`);
    });
}
