import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


//verify coupon 
export async function POST(request) {
    try {
        const { userId, has } = getAuth(request)
        const { code } = await request.json()
        const coupon = await prisma.coupon.findUnique({
            where: {
                code: code.toUpperCase(),
                expiresAt: { gt: new Date() }
            }
        })
        if (!coupon) {
            return NextResponse.json({ error: "Invalid or expired coupon code" }, { status: 404 })
        }
        if (coupon.forNewUser) {
            const userorders = await prisma.order.findMany({
                where: { userId }
            })
            if (userorders.length > 0) {
                return NextResponse.json({ error: "Coupon valid only for new users" }, { status: 403 })
            }
        }
        if (coupon.forMember) {
            const hasPlusPlan = has({ plan: 'plus' })
            if (!hasPlusPlan) {
                return NextResponse.json({ error: "Coupon valid only for member only" }, { status: 403 })
            }
        }
        return NextResponse.json({ coupon })
    } catch (error) {
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })

    }
}