import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";



// get store info and store products
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const username = searchParams.get("username");
        if (!username) {
            return NextResponse.json({ error: "Username is required" }, { status: 400 });
        }
        // get store info
        const store = await prisma.store.findFirst({
            where: {
                username: username.toLowerCase()
            },
            select: {
                id: true,
                name: true,
                username: true,
                description: true,
                email: true,
                contact: true,
                address: true,
                image: true,
                createdAt: true,
            }
        });
        if (!store) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }
        // get store products
        const products = await prisma.product.findMany({
            where: {
                storeId: store.id
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        return NextResponse.json({ store, products });
    } catch (error) {
        console.log("store data fetch error", error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}