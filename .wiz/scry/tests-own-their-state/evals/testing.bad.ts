import { OrderBook, type Order } from "./order-book";

export const sampleOrders: Order[] = [
	{ id: "o1", side: "buy", price: 101, quantity: 5 },
	{ id: "o2", side: "buy", price: 100, quantity: 10 },
	{ id: "o3", side: "sell", price: 103, quantity: 4 },
	{ id: "o4", side: "sell", price: 105, quantity: 8 },
];

export function orderBook(): OrderBook {
	const book = new OrderBook("ACME");
	for (const order of sampleOrders) book.place(order);
	book.match();
	return book;
}
