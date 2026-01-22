import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";


export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        //check if the user have already registered a store
        const store = await prisma.store.findFirst({
            where: {
                userId: userId
            }
        })
        // if store is already registered then send status of store
        if (store) {
            return NextResponse.json({ status: store.status })
        } else {
            return NextResponse.json({ status: "no-store" })
        }
    } catch (error) {
        console.log("store creation error", error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}