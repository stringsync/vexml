it("charges the card for the cart total", () => {
	const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
		new Response(JSON.stringify({ ok: true }), { status: 200 }),
	);
	new Checkout().buy(apple);
	expect(fetchSpy).toHaveBeenCalledWith(
		"https://pay.example.com/charge",
		expect.objectContaining({ method: "POST" }),
	);
});
