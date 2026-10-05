let carts: Cart[] = [];

function newCart(): Cart {
	const cart = new Cart();
	carts.push(cart);
	return cart;
}
