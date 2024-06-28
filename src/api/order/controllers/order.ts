"use strict";
import Stripe from 'stripe';
import { Strapi, factories } from '@strapi/strapi';
import { MainDatum, SizeEnum } from './Type';

interface Product {
    data: MainDatum;
    quantity: number;
    selectedSize: string;
    singlePrice: number;
  }
  
  // Define the structure for the overall products array
  interface productsType {
    products: Product[];
  }


const stripe = new Stripe(process.env.STRIPE_KEY);
export default factories.createCoreController("api::order.order", ({ strapi }) => ({
    async create(ctx) {
        const products: productsType = ctx.request.body;
        // console.log(typeof products.products);
        // console.log(products);
    
        try {
            const lineItems = await Promise.all(
                products.products.map(async (product) => {
                    const item = await strapi
                        .service('api::product.product')
                        .findOne(product.data.id);
    
                    // console.log(product);
                    // console.log('this is item------->', item);
                    // console.log('this is product------->', product);
    
                    return {
                        price_data: {
                            currency: 'PKR',
                            product_data: {
                                name: item.name,
                            },
                            unit_amount: Math.round(item.price * 100),
                        },
                        quantity: product.quantity,
                    };
                })
            );
    
            const session = await stripe.checkout.sessions.create({
                shipping_address_collection: { allowed_countries: ['PK'] },
                payment_method_types: ['card'],
                mode: 'payment',
                success_url: process.env.CLIENT_URL + `/success`,
                cancel_url: process.env.CLIENT_URL + '/failed',
                line_items: lineItems,
            });
            // console.log(session);
            const createdOrder = await strapi
                .service('api::order.order')
                .create({ data: { products, stripeId: session.id } });
    
            // console.log(createdOrder);
            return { stripeSession: session.id };
        } catch (error) {
            console.error("Error in create order:", error);
            ctx.response.status = 500;
            return { error: error.message || "An error occurred" };
        }
    }
    }));
