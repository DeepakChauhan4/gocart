import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";



export async function POST(request) {
    try {
        const { userId, has } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { addressId, items, couponCode, paymentMethod } = await request.json()
        // check if all required fields are present
        if (!addressId || !items || items.length === 0 || !paymentMethod) {
            return NextResponse.json({ error: "Missing order details" }, { status: 400 })
        }
        let coupon = null;
        if (couponCode) {
            coupon = await prisma.coupon.findUnique({
                where: {
                    code: couponCode
                }
            })
            if (!coupon) {
                return NextResponse.json({ error: "Invalid or expired coupon code" }, { status: 404 })
            }


        }

        //check if coupon is applicable for new users
        if (couponCode && coupon.forNewUser) {
            const userorders = await prisma.order.findMany({
                where: { userId }
            })
            if (userorders.length > 0) {
                return NextResponse.json({ error: "Coupon valid for new users" }, { status: 403 })
            }
        }
        const isPlusMember = has({ plan: 'plus' })
        //check if coupon is applicable for members

        if (couponCode && coupon.forMember) {

            if (!isPlusMember) {
                return NextResponse.json({ error: "Coupon valid only for member only" }, { status: 403 })
            }
        }
        // group orders by storeId using a Map
        const ordersByStore = new Map();


        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: item.id }
            })
            const storeId = product.storeId;
            if (!ordersByStore.has(storeId)) {
                ordersByStore.set(storeId, [])
            }
            ordersByStore.get(storeId).push({ ...item, price: product.price })
        }

        let orderIds = [];
        let fullAmount = 0;
        let isShippingFeeAdded = false;

        //create order for each seller
        for (const [storeId, sellerItems] of ordersByStore.entries()) {
            let total = sellerItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

            if (couponCode) {
                total -= (total * coupon.discount) / 100;
            }
            if (!isPlusMember && !isShippingFeeAdded) {
                total += 50; // flat shipping fee
                isShippingFeeAdded = true;
            }
            fullAmount += parseFloat(total.toFixed(2))

            console.log("Creating order for store:", storeId, "with total:", total.toFixed(2))

            const order = await prisma.order.create({
                data: {
                    userId,
                    storeId,
                    addressId,
                    total: parseFloat(total.toFixed(2)),
                    paymentMethod,
                    isCouponUsed: coupon ? true : false,
                    coupon: coupon ? { code: coupon.code, discount: coupon.discount } : {},
                    orderItems: {
                        create: sellerItems.map(item => ({
                            productId: item.id,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                }
            })
            console.log("Order created:", order.id)
            orderIds.push(order.id)
        }
        if (paymentMethod === 'STRIPE') {
            const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
            const origin = await request.headers.get('origin')
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Order'
                        },
                        unit_amount: Math.round(fullAmount * 100)
                    },
                    quantity: 1
                }],
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60,//current time + 30 minutes
                mode: 'payment',
                success_url: `${origin}/loading?nextUrl=orders`,
                cancel_url: `${origin}/cart`,
                metadata: {
                    orderIds: orderIds.join(','),
                    appId: 'gocart'
                }
            })
            return NextResponse.json({ session })


        }
        //clear the cart
        await prisma.user.update({
            where: { id: userId },
            data: { cart: {} }

        })

        return NextResponse.json({ message: "Order placed successfully", orderIds, fullAmount }, { status: 200 })

    } catch (error) {
        console.error("=== ORDER ERROR ===");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Full error:", error);
        return NextResponse.json({ error: error.code || error.message || "Unknown error occurred" }, { status: 500 })

    }
}
// get all orders for user
export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        const orders = await prisma.order.findMany({
            where: {
                userId, OR: [{
                    paymentMethod: PaymentMethod.COD
                },
                {
                    AND: [{
                        paymentMethod: PaymentMethod.STRIPE
                    }, { isPaid: true }]
                }

                ]

            }, include: {
                orderItems: {
                    include: {
                        product: true
                    }
                },
                address: true,

            },
            orderBy: {
                createdAt: 'desc'
            }
        })
        return NextResponse.json({ orders }, { status: 200 })
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })

    }

}