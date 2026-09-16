"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomers = getCustomers;
exports.createCustomer = createCustomer;
exports.getCustomerById = getCustomerById;
const db_1 = require("../config/db");
async function getCustomers(req, res, next) {
    try {
        const customers = await db_1.prisma.customer.findMany({
            orderBy: { id: 'desc' },
            include: {
                _count: {
                    select: {
                        enquiries: true,
                        quotations: true,
                        salesOrders: true,
                    },
                },
            },
        });
        res.json({ customers });
    }
    catch (error) {
        next(error);
    }
}
async function createCustomer(req, res, next) {
    try {
        const { companyName, contactPerson, mobile, email, city } = req.body;
        const customer = await db_1.prisma.customer.create({
            data: {
                companyName,
                contactPerson,
                mobile,
                email,
                city,
            },
        });
        res.status(201).json({ customer });
    }
    catch (error) {
        next(error);
    }
}
async function getCustomerById(req, res, next) {
    try {
        const id = parseInt(String(req.params.id), 10);
        const customer = await db_1.prisma.customer.findUnique({
            where: { id },
            include: {
                enquiries: {
                    orderBy: { id: 'desc' },
                },
                quotations: {
                    orderBy: { id: 'desc' },
                },
                salesOrders: {
                    orderBy: { id: 'desc' },
                },
            },
        });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        res.json({ customer });
    }
    catch (error) {
        next(error);
    }
}
