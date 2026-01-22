import prisma from '@/lib/prisma';
import authAdmin from '@/middlewares/authAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Get dashboard data for admin (total orders, total stores,total products , total revenue)   

export async function GET(request) {

    try {

        const { userId } = getAuth(request);
        console.log('Dashboard API: userId =', userId);

        const isAdmin = await authAdmin(userId);
        console.log('Dashboard API: isAdmin =', isAdmin);

        if (!isAdmin) {
            console.log('Dashboard API: Not authorized');
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        console.log('Dashboard API: Fetching data from database...');

        //Get total orders
        const orders = await prisma.order.count();
        console.log('Dashboard API: orders =', orders);

        //Get total stores on app
        const stores = await prisma.store.count();
        console.log('Dashboard API: stores =', stores);

        //Get all orders include only createdAt and total & calculate total revenue
        const allOrders = await prisma.order.findMany({
            select: {
                createdAt: true,
                total: true,
            },
        });
        let totalRevenue = 0;
        allOrders.forEach((order) => {
            totalRevenue += order.total;
        });
        const revenue = totalRevenue.toFixed(2);
        console.log('Dashboard API: revenue =', revenue);

        //Get total products on App
        const products = await prisma.product.count();
        console.log('Dashboard API: products =', products);

        const dashboardData = {
            orders,
            stores,
            products,
            revenue,
            allOrders,
        };

        console.log('Dashboard API: Returning data =', dashboardData);
        return NextResponse.json(dashboardData, { status: 200 });




    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message });
    }


}