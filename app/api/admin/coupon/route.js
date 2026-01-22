import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


//Add New coupon
export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const isAdmin = await authAdmin(userId)
        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 })
        }
        const { coupon } = await request.json()
        console.log('Creating coupon with data:', JSON.stringify(coupon, null, 2))
        coupon.code = coupon.code.toUpperCase()

        // Ensure all required fields have values
        const couponData = {
            code: coupon.code,
            description: coupon.description,
            discount: coupon.discount,
            forNewUser: coupon.forNewUser ?? false,
            forMember: coupon.forMember ?? false,
            isPublic: coupon.isPublic ?? false,
            expiresAt: coupon.expiresAt
        }

        const createdCoupon = await prisma.coupon.create({ data: couponData })

        //Run Inngest sheduler Function to delete coupon on expiry
        await inngest.send({
            name: 'app/coupon.expired',
            data: {
                code: createdCoupon.code,
                expiresAt: createdCoupon.expiresAt
            }
        })
        return NextResponse.json({ message: "Coupon created successfully" }, { status: 201 })
    } catch (error) {
        console.error('Error creating coupon:', error.message)
        console.error('Error details:', error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 400 })

    }
}

//Delete coupon 

export async function DELETE(request) {
    try {
        const { userId } = getAuth()
        const isAdmin = await authAdmin(userId)
        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 })
        }
        const { searchParams } = request.nextUrl;
        const code = searchParams.get('code')
        await prisma.coupon.delete({ where: { code: code } })
        return NextResponse.json({ message: "Coupon deleted successfully" }, { status: 200 })
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 400 })
    }
}

// Get All Coupons
export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        const isAdmin = await authAdmin(userId)
        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 })
        }
        const coupons = await prisma.coupon.findMany({})
        return NextResponse.json({ coupons })
    }
    catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 400 })
    }
}