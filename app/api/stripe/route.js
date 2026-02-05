import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma"
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export async function POST(request) {
    try {
        const body = await request.text()
        const sig = request.headers.get('stripe-signature')

        // Check if API key exists before initializing Stripe
        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json(
                { error: "Stripe secret key not configured" },
                { status: 500 }
            )
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

        // Check if webhook secret exists
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            return NextResponse.json(
                { error: "Stripe webhook secret not configured" },
                { status: 500 }
            )
        }

        const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)

        const handlePaymentIntent = async (paymentIntentId, isPaid) => {
            const session = await stripe.checkout.sessions.list({
                payment_intent: paymentIntentId
            })
            const { orderIds, userId, appId } = session.data[0].metadata

            if (appId !== 'gocart')
                return NextResponse.json({ recieved: true, message: 'Invalid app id' })

            const orderIdsArray = orderIds.split(',')

            if (isPaid) {
                //mark order as paid 
                await Promise.all(orderIdsArray.map(async (orderId) => {
                    await prisma.order.update({
                        where: { id: orderId },
                        data: { isPaid: true }
                    })
                }))
                //delete cart from user
                await prisma.user.update({
                    where: { id: userId },
                    data: { cart: {} }
                })
            } else {
                // delete order from db
                await Promise.all(orderIdsArray.map(async (orderId) => {
                    await prisma.order.delete({
                        where: { id: orderId }
                    })
                }))
            }
        }

        switch (event.type) {
            case 'payment_intent.succeeded': {
                await handlePaymentIntent(event.data.object.id, true)
                break;
            }
            case 'payment_intent.cancelled': {
                await handlePaymentIntent(event.data.object.id, false)
                break;
            }
            default:
                console.log("unhandled event type", event.type)
                break;
        }
        return NextResponse.json({ recieved: true })
    } catch (error) {
        console.error("Stripe webhook error:", error)
        return NextResponse.json(
            { error: error.message || "Webhook error" },
            { status: 400 }
        )
    }
}

export const config = {
    api: { bodyparser: false }
}

