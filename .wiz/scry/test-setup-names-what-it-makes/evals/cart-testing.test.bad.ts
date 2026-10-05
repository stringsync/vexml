export class Testing {
	readonly cart = new Cart();
}

it("is empty when new", () => {
	expect(new Testing().cart.total()).toBe(0);
});
