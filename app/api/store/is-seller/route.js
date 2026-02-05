import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";


export async function GET(request) {
    try {
        const { userId } = getAuth(request);

        console.log("is-seller API - userId:", userId);

        // If no user is logged in
        if (!userId) {
            console.log("is-seller API - No user logged in");
            return NextResponse.json({ isSeller: false, storeInfo: null, status: "no-store" })
        }

        //check if the user have already registered a store
        const store = await prisma.store.findFirst({
            where: {
                userId: userId
            }
        })

        console.log("is-seller API - Store found:", store ? {
            id: store.id,
            name: store.name,
            status: store.status,
            isActive: store.isActive,
            userId: store.userId
        } : "null");

        // if store is already registered then send status
        if (store) {
            const isApproved = store.status === 'approved' && store.isActive === true;
            console.log("is-seller API - isApproved:", isApproved);
            return NextResponse.json({
                isSeller: isApproved,
                storeInfo: store,
                status: store.status
            })
        } else {
            return NextResponse.json({
                isSeller: false,
                storeInfo: null,
                status: "no-store"
            })
        }
    } catch (error) {
        console.log("is-seller check error", error);
        console.log("is-seller error stack:", error.stack);

        // Check if it's a database connection error
        if (error.message?.includes('Can\'t reach database server') ||
            error.message?.includes('ECONNREFUSED') ||
            error.message?.includes('database')) {
            return NextResponse.json({
                isSeller: false,
                storeInfo: null,
                status: "error",
                error: "Database connection error - please wake up your Neon database at console.neon.tech"
            }, { status: 503 })
        }

        return NextResponse.json({
            isSeller: false,
            storeInfo: null,
            status: "error",
            error: error.message
        }, { status: 400 })
    }
}

