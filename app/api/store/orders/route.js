


//update seller order status

import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";



export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)
        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { orderId, status } = await request.json()
        await prisma.order.update({
            where: {
                id: orderId,
                storeId: storeId
            },
            data: {
                status: status
            }
        })
        return NextResponse.json({ message: "Order status updated successfully" }, { status: 200 })
    } catch (error) {
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
    }
}

// Get all orders for seller 

export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)
        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const orders = await prisma.order.findMany({
            where: {
                storeId: storeId
            },
            include: {
                user: true,
                address: true,
                orderItems: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ orders })
    } catch (error) {
        console.error("Error fetching orders:", error)
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
    }
}
