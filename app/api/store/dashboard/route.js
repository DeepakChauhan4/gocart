import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";



// get dashboard data for seller
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);
        //get all orders
        const orders = prisma.order.findMany({
            where: {
                storeId: storeId
            }
        });
        // get all product with the ratings for seller
        const products = prisma.product.findMany({
            where: {
                storeId: storeId
            },
        });
        const ratings = await prisma.rating.findMany({
            where: {
                productId: {
                    in: product.map((product) => product.id)
                }
            },
            include: {
                user: true,
                product: true
            }
        });
        const dashboardData = {
            ratings,
            totalOrders: orders.length,
            totalearnings: Math.round(orders.reduce((acc, order) => acc + order.total, 0)),
            totalProducts: products.length
        }
        return NextResponse.json({ dashboardData });


    } catch (error) {
        console.log("dashboard data fetch error", error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}


