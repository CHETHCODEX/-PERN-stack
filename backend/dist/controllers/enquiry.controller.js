"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnquiries = getEnquiries;
exports.createEnquiry = createEnquiry;
exports.getEnquiryById = getEnquiryById;
exports.updateEnquiryStatus = updateEnquiryStatus;
const numberGenerator_1 = require("../utils/numberGenerator");
const db_1 = require("../config/db");
async function getEnquiries(req, res, next) {
    try {
        const enquiries = await db_1.prisma.enquiry.findMany({
            orderBy: { id: 'desc' },
            include: {
                customer: true,
                createdBy: {
                    select: { id: true, name: true, email: true, role: true },
                },
                items: {
                    include: {
                        product: true,
                    },
                },
                quotation: {
                    select: { id: true, quotationNumber: true, status: true, grandTotal: true },
                },
            },
        });
        res.json({ enquiries });
    }
    catch (error) {
        next(error);
    }
}
async function createEnquiry(req, res, next) {
    try {
        const { customerId, requiredDate, notes, items } = req.body;
        const userId = req.user.id;
        // Generate enquiry number e.g. ENQ-2026-0001
        const enquiryNumber = (0, numberGenerator_1.generateSequenceNumber)('ENQ');
        const enquiry = await db_1.prisma.enquiry.create({
            data: {
                enquiryNumber,
                customerId,
                createdById: userId,
                requiredDate: new Date(requiredDate),
                notes,
                status: 'NEW',
                items: {
                    create: items.map((i) => ({
                        productId: i.productId,
                        quantity: i.quantity,
                    })),
                },
            },
            include: {
                customer: true,
                createdBy: {
                    select: { id: true, name: true, email: true, role: true },
                },
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });
        res.status(201).json({ enquiry });
    }
    catch (error) {
        next(error);
    }
}
async function getEnquiryById(req, res, next) {
    try {
        const id = parseInt(String(req.params.id), 10);
        const enquiry = await db_1.prisma.enquiry.findUnique({
            where: { id },
            include: {
                customer: true,
                createdBy: {
                    select: { id: true, name: true, email: true, role: true },
                },
                items: {
                    include: {
                        product: {
                            include: { inventory: true },
                        },
                    },
                },
                quotation: true,
            },
        });
        if (!enquiry) {
            res.status(404).json({ error: 'Enquiry not found' });
            return;
        }
        res.json({ enquiry });
    }
    catch (error) {
        next(error);
    }
}
async function updateEnquiryStatus(req, res, next) {
    try {
        const id = parseInt(String(req.params.id), 10);
        const { status } = req.body;
        const updated = await db_1.prisma.enquiry.update({
            where: { id },
            data: { status },
            include: { customer: true },
        });
        res.json({ enquiry: updated });
    }
    catch (error) {
        next(error);
    }
}
